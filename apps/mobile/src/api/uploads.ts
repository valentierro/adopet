import { api } from './client';

export type PresignResponse = {
  uploadUrl: string;
  key: string;
  publicUrl: string;
};

export type ConfirmUploadBody = {
  petId: string;
  key: string;
  isPrimary?: boolean;
};

export async function presign(filename: string, contentType?: string): Promise<PresignResponse> {
  return api.post<PresignResponse>('/uploads/presign', { filename, contentType });
}

export async function confirmUpload(body: ConfirmUploadBody): Promise<{ id: string; url: string }> {
  return api.post<{ id: string; url: string }>('/uploads/confirm', body);
}

export async function confirmAvatarUpload(key: string): Promise<{ avatarUrl: string }> {
  return api.post<{ avatarUrl: string }>('/uploads/confirm-avatar', { key });
}

export async function confirmPartnerLogoUpload(key: string): Promise<{ logoUrl: string }> {
  return api.post<{ logoUrl: string }>('/uploads/confirm-partner-logo', { key });
}
