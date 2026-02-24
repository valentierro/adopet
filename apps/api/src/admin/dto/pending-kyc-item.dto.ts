/** Item da lista de KYC pendentes (admin). */
export interface PendingKycItemDto {
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  document?: string | null;
  kycSubmittedAt: string;
  documentUrl?: string | null;
  selfieUrl?: string | null;
}
