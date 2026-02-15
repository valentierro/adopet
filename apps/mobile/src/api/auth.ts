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
  username: string;
};

export type LoginBody = {
  email: string;
  password: string;
};

export type SignupResponse = {
  message: string;
  requiresEmailVerification: true;
};

/** Resposta do signup: tokens (quando verificação de e-mail está desativada) ou pedido de confirmação de e-mail. */
export type SignupResponseUnion = AuthResponse | SignupResponse;

const AUTH_TIMEOUT_MS = 30000; // login/signup podem demorar (ex.: envio de e-mail no signup)

export async function signup(body: SignupBody): Promise<SignupResponseUnion> {
  return api.post<SignupResponseUnion>('/auth/signup', body, { ...noAuth, timeoutMs: AUTH_TIMEOUT_MS });
}

export async function login(body: LoginBody): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/login', body, { ...noAuth, timeoutMs: AUTH_TIMEOUT_MS });
}

export async function refresh(refreshToken: string): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/refresh', { refreshToken }, noAuth);
}

export async function logout(refreshToken: string): Promise<void> {
  await api.post('/auth/logout', { refreshToken }, noAuth);
}

export type ForgotPasswordResponse = { message: string };

export async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  return api.post<ForgotPasswordResponse>('/auth/forgot-password', { email: email.trim().toLowerCase() }, noAuth);
}

export type ChangePasswordBody = {
  currentPassword: string;
  newPassword: string;
};

export async function changePassword(body: ChangePasswordBody): Promise<{ message: string }> {
  return api.post<{ message: string }>('/auth/change-password', body);
}
