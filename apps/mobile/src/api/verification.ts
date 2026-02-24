import { api } from './client';

export type VerificationType = 'USER_VERIFIED' | 'PET_VERIFIED';
export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type VerificationItem = {
  id: string;
  type: VerificationType;
  status: VerificationStatus;
  petId?: string;
  /** Motivo da rejeição (quando status === REJECTED) */
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type VerificationStatusResponse = {
  requests: VerificationItem[];
  userVerified: boolean;
};

export type RequestVerificationBody = {
  type: VerificationType;
  petId?: string;
  /** URLs das fotos de evidência (rosto; para pet: + foto com o pet). Obrigatório exceto se skipEvidenceReason for informado. */
  evidenceUrls?: string[];
  /** Se o usuário não puder enviar fotos (ex.: acessibilidade); a análise será feita apenas com os dados. */
  skipEvidenceReason?: string;
};

export async function requestVerification(
  body: RequestVerificationBody,
): Promise<VerificationItem> {
  return api.post<VerificationItem>('/verification/request', body);
}

export async function getVerificationStatus(): Promise<VerificationStatusResponse> {
  return api.get<VerificationStatusResponse>('/verification/status');
}
