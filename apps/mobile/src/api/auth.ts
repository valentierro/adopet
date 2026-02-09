import { api } from './client';

const noAuth = { skipAuth: true as const };

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type SignupBody = {
  email: string;
  password: string;
  name: string;
  phone: string;
};

export type LoginBody = {
  email: string;
  password: string;
};

export async function signup(body: SignupBody): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/signup', body, noAuth);
}

export async function login(body: LoginBody): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/login', body, noAuth);
}

export async function refresh(refreshToken: string): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/refresh', { refreshToken }, noAuth);
}

export async function logout(refreshToken: string): Promise<void> {
  await api.post('/auth/logout', { refreshToken }, noAuth);
}
