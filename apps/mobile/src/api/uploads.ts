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

export async function presign(
  filename: string,
  contentType?: string,
  token?: string | null,
): Promise<PresignResponse> {
  return api.post<PresignResponse>('/uploads/presign', { filename, contentType }, { token });
}

export async function confirmUpload(
  body: ConfirmUploadBody,
  token?: string | null,
): Promise<{ id: string; url: string }> {
  return api.post<{ id: string; url: string }>('/uploads/confirm', body, { token });
}

export async function confirmAvatarUpload(
  key: string,
  token?: string | null,
): Promise<{ avatarUrl: string }> {
  return api.post<{ avatarUrl: string }>('/uploads/confirm-avatar', { key }, { token });
}

export async function confirmPartnerLogoUpload(key: string): Promise<{ logoUrl: string }> {
  return api.post<{ logoUrl: string }>('/uploads/confirm-partner-logo', { key });
}
