const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/v1').replace(/\/?$/, '');

let tokenGetter: (() => string | null) | null = null;

export function setTokenGetter(getter: () => string | null) {
  tokenGetter = getter;
}

export async function request<T>(
  endpoint: string,
  config: RequestInit & { params?: Record<string, string> } = {}
): Promise<T> {
  const { params, ...init } = config;
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = new URL(BASE_URL + path);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') url.searchParams.set(key, value);
    });
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  const token = tokenGetter?.();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url.toString(), { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const api = {
  get: <T>(path: string, params?: Record<string, string>) =>
    request<T>(path, { method: 'GET', params }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export { BASE_URL };
