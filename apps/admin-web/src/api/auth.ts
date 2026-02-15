import { api } from './client';

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export async function login(email: string, password: string): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/login', { email: email.trim().toLowerCase(), password });
}

export async function logout(refreshToken: string): Promise<void> {
  try {
    await api.post('/auth/logout', { refreshToken });
  } catch {
    // ignore
  }
}
