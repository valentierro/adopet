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
  /** CPF (11 dígitos) ou CNPJ (14 dígitos) */
  document: string;
  /** Número do RG (obrigatório). Usado na validação automática do KYC. */
  rg: string;
  /** Data de nascimento em ISO (AAAA-MM-DD) */
  birthDate: string;
  username: string;
  /** Chave do documento KYC (obtida via presignSignupKyc + upload). Enviar no cadastro para status "em avaliação" já ao logar. */
  selfieWithDocKey?: string;
  /** Chave do verso do documento (RG). Opcional; use para conferência automática da data de nascimento. */
  documentVersoKey?: string;
  /** Consentimento KYC (obrigatório se selfieWithDocKey for enviado). */
  consentKyc?: boolean;
};

/** Obter URL para upload de documento KYC antes do signup (sem login). Retorna uploadUrl e key; enviar key no signup como selfieWithDocKey. */
export async function presignSignupKyc(filename: string, contentType?: string): Promise<{ uploadUrl: string; key: string }> {
  return api.post<{ uploadUrl: string; key: string }>('/auth/presign-signup-kyc', { filename, contentType }, { skipAuth: true });
}

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

export type CheckAvailabilityResponse = { available: boolean };

const AUTH_TIMEOUT_MS = 30000; // login/signup podem demorar (ex.: envio de e-mail no signup)

/** Verifica se o e-mail está disponível para cadastro (não existe na base). Chamar antes do signup. */
export async function checkEmailAvailable(email: string): Promise<CheckAvailabilityResponse> {
  return api.get<CheckAvailabilityResponse>('/auth/check-email', { email: email.trim().toLowerCase() }, { skipAuth: true });
}

/** Verifica se o CPF/CNPJ está disponível para cadastro (não existe na base). Documento: só dígitos (11 ou 14). Chamar antes do signup. */
export async function checkDocumentAvailable(document: string): Promise<CheckAvailabilityResponse> {
  const digits = String(document).replace(/\D/g, '').slice(0, 14);
  return api.get<CheckAvailabilityResponse>('/auth/check-document', { document: digits }, { skipAuth: true });
}

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
