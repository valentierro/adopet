import { api } from './client';

export type VerificationType = 'USER_VERIFIED' | 'PET_VERIFIED';
export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type VerificationItem = {
  id: string;
  type: VerificationType;
  status: VerificationStatus;
  petId?: string;
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
};

export async function requestVerification(
  body: RequestVerificationBody,
): Promise<VerificationItem> {
  return api.post<VerificationItem>('/verification/request', body);
}

export async function getVerificationStatus(): Promise<VerificationStatusResponse> {
  return api.get<VerificationStatusResponse>('/verification/status');
}
