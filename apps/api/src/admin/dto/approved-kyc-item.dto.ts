/** Item da lista de KYC aprovados (admin). Inclui dados de validação para histórico (bullets, veredito). */
export interface ApprovedKycItemDto {
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  username?: string | null;
  document?: string | null;
  rg?: string | null;
  birthDate?: string | null;
  kycSubmittedAt: string;
  kycVerifiedAt: string;
  /** null = aprovado automaticamente; userId = admin que aprovou. */
  kycDecidedBy?: string | null;
  kycExtractedBirthDate?: string | null;
  kycExtractedName?: string | null;
  kycExtractedCpf?: string | null;
  kycExtractedDocNumber?: string | null;
  kycExtractionStatus?: string | null;
  kycFraudSignal?: string | null;
}
