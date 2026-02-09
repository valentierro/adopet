const rawBase = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const BASE_URL = rawBase.endsWith('/v1') ? rawBase : rawBase.replace(/\/?$/, '') + '/v1';

type RequestConfig = RequestInit & {
  params?: Record<string, string | number | undefined>;
  skipAuth?: boolean;
};

let tokenGetter: (() => string | null) | null = null;
let refreshAndRetry: (() => Promise<boolean>) | null = null;

export function setAuthProvider(
  getToken: () => string | null,
  onRefresh: () => Promise<boolean>,
) {
  tokenGetter = getToken;
  refreshAndRetry = onRefresh;
}

async function request<T>(
  endpoint: string,
  config: RequestConfig = {},
  isRetry = false,
): Promise<T> {
  const { params, skipAuth, ...init } = config;
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
  if (!skipAuth && tokenGetter?.()) {
    headers['Authorization'] = `Bearer ${tokenGetter()}`;
  }
  const res = await fetch(url.toString(), { ...init, headers });

  if (res.status === 401 && !isRetry && refreshAndRetry) {
    const ok = await refreshAndRetry();
    if (ok) return request<T>(endpoint, config, true);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const api = {
  get: <T>(
    path: string,
    params?: Record<string, string | number | undefined>,
    options?: { skipAuth?: boolean },
  ) => request<T>(path, { method: 'GET', params, ...options }),

  post: <T>(
    path: string,
    body: unknown,
    options?: { skipAuth?: boolean },
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
