import { Platform } from 'react-native';

const rawBaseFromEnv = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
/** No emulador Android, localhost é o próprio emulador; 10.0.2.2 é o localhost da máquina host. */
const rawBase =
  typeof __DEV__ !== 'undefined' && __DEV__ && Platform.OS === 'android' &&
  (rawBaseFromEnv.includes('localhost') || rawBaseFromEnv.includes('127.0.0.1'))
    ? rawBaseFromEnv.replace(/localhost/i, '10.0.2.2').replace(/127\.0\.0\.1/g, '10.0.2.2')
    : rawBaseFromEnv;
const BASE_URL = rawBase.endsWith('/v1') ? rawBase : rawBase.replace(/\/?$/, '') + '/v1';

/** Em build de produção, localhost não funciona no celular. */
export function getApiUrlConfigIssue(): string | null {
  if (typeof __DEV__ !== 'undefined' && __DEV__) return null;
  const u = rawBaseFromEnv.toLowerCase();
  if (u.includes('localhost') || u.includes('127.0.0.1')) {
    return 'A URL da API está como localhost. No app de produção defina EXPO_PUBLIC_API_URL no EAS (expo.dev) para a URL da sua API e gere um novo build.';
  }
  return null;
}

type RequestConfig = RequestInit & {
  params?: Record<string, string | number | undefined>;
  skipAuth?: boolean;
  /** Timeout em ms; padrão REQUEST_TIMEOUT_MS */
  timeoutMs?: number;
  /** Se true, fetch com cache: 'no-store' (evita resposta em cache, ex.: app-config) */
  noCache?: boolean;
};

let tokenGetter: (() => string | null) | null = null;
let refreshAndRetry: (() => Promise<boolean | 'network'>) | null = null;
let onSessionExpired: (() => void) | null = null;
/** Chamado quando a API retorna 403 com code FEATURE_DISABLED (recurso desabilitado por feature flag). */
let onFeatureDisabled: (() => void) | null = null;

/** Uma única tentativa de refresh em voo: várias requisições 401 aguardam o mesmo refresh. */
let refreshPromise: Promise<boolean | 'network'> | null = null;
/** Evita chamar onSessionExpired várias vezes quando múltiplas requisições falham. */
let sessionExpiredFired = false;

export type AuthProviderOptions = {
  /** Se true, não tenta refresh e trata como sessão expirada por inatividade (15 min) */
  shouldSkipRefreshForInactivity?: () => boolean;
  /** Chamado quando 401 por inatividade: fazer logout antes de mostrar modal */
  onInactivityExpire?: () => void | Promise<void>;
  /** Chamado a cada requisição bem-sucedida para atualizar última atividade */
  markActivity?: () => void;
};

export function setAuthProvider(
  getToken: () => string | null,
  onRefresh: () => Promise<boolean | 'network'>,
  onExpired?: () => void,
  options?: AuthProviderOptions,
) {
  tokenGetter = getToken;
  refreshAndRetry = onRefresh;
  onSessionExpired = onExpired ?? null;
  authOptions = options ?? null;
  refreshPromise = null;
  sessionExpiredFired = false;
}

let authOptions: AuthProviderOptions | null = null;

export function setOnFeatureDisabled(callback: (() => void) | null) {
  onFeatureDisabled = callback;
}

const REQUEST_TIMEOUT_MS = 20000;
const REQUEST_RETRY_MAX = 2; // 1 tentativa inicial + 1 retry só para erros de rede
const REQUEST_RETRY_DELAY_MS = 500;

function isNetworkError(e: unknown): boolean {
  if (e instanceof Error) {
    if (e.name === 'AbortError') return true;
    const msg = (e.message || '').toLowerCase();
    return /network|fetch|connection|timeout|econnrefused|enotfound|failed to fetch|could not connect/i.test(msg);
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(
  endpoint: string,
  config: RequestConfig = {},
  isRetry = false,
): Promise<T> {
  const { params, skipAuth, timeoutMs, noCache, ...init } = config;
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = new URL(BASE_URL.replace(/\/$/, '') + path);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  // Para rotas autenticadas: garante que o token esteja disponível (evita race pós-login)
  if (!skipAuth && tokenGetter) {
    let token = tokenGetter();
    if (!token) {
      await delay(50);
      token = tokenGetter();
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const timeout = timeoutMs ?? REQUEST_TIMEOUT_MS;
  let res!: Response;
  for (let attempt = 1; attempt <= REQUEST_RETRY_MAX; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      res = await fetch(url.toString(), {
        ...init,
        headers,
        signal: init.signal ?? controller.signal,
        ...(noCache && { cache: 'no-store' as RequestCache }),
      });
      clearTimeout(timeoutId);
      break;
    } catch (e) {
      clearTimeout(timeoutId);
      if (attempt < REQUEST_RETRY_MAX && isNetworkError(e)) {
        await delay(REQUEST_RETRY_DELAY_MS);
        continue;
      }
      const err = e instanceof Error ? e : new Error(String(e));
      if (err.name === 'AbortError') {
        throw new Error('request timeout');
      }
      throw err;
    }
  }

  // 401 em rota sem auth (login/signup) = credenciais erradas; não tratar como sessão expirada
  if (res.status === 401 && !isRetry && !skipAuth && refreshAndRetry) {
    const skipForInactivity = authOptions?.shouldSkipRefreshForInactivity?.();
    if (skipForInactivity) {
      await authOptions?.onInactivityExpire?.();
      if (!sessionExpiredFired) {
        sessionExpiredFired = true;
        onSessionExpired?.();
      }
    } else {
      if (!refreshPromise) {
        refreshPromise = refreshAndRetry().finally(() => {
          refreshPromise = null;
        });
      }
      const result = await refreshPromise;
      if (result === true) return request<T>(endpoint, config, true);
      if (result === 'network') {
        const body = await res.text();
        throw new Error(`API ${res.status}: ${body || res.statusText}`);
      }
      if (!sessionExpiredFired) {
        sessionExpiredFired = true;
        onSessionExpired?.();
      }
    }
  }

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 403 && text) {
      try {
        const body = JSON.parse(text) as { code?: string };
        if (body?.code === 'FEATURE_DISABLED') {
          onFeatureDisabled?.();
        }
      } catch {
        // ignore parse error
      }
    }
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  const text = await res.text();
  authOptions?.markActivity?.();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const api = {
  get: <T>(
    path: string,
    params?: Record<string, string | number | undefined>,
    options?: { skipAuth?: boolean; timeoutMs?: number; noCache?: boolean },
  ) => request<T>(path, { method: 'GET', params, ...options }),

  post: <T>(
    path: string,
    body: unknown,
    options?: { skipAuth?: boolean; timeoutMs?: number },
  ) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    }),

  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export { BASE_URL };
