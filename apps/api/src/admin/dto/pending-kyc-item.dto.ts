/** Item da lista de KYC pendentes (admin). */
export interface PendingKycItemDto {
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  document?: string | null;
  /** Número do RG no cadastro (opcional). Para conferência com documento. */
  rg?: string | null;
  kycSubmittedAt: string;
  documentUrl?: string | null;
  selfieUrl?: string | null;
  /** URL do verso do documento (RG), quando enviado. */
  documentVersoUrl?: string | null;
  /** Data de nascimento no cadastro (YYYY-MM-DD). Para conferência com documento. */
  birthDate?: string | null;
  /** Data extraída do documento pelo OCR (YYYY-MM-DD). null se não extraída. */
  kycExtractedBirthDate?: string | null;
  /** Nome extraído do documento pelo OCR. null se não extraído. */
  kycExtractedName?: string | null;
  /** CPF extraído do documento (11 dígitos). null se não extraído. */
  kycExtractedCpf?: string | null;
  /** Número do RG/CNH extraído do documento. null se não extraído. */
  kycExtractedDocNumber?: string | null;
  /** OK = confere com cadastro (nome, data, CPF/doc); DIVERGENT = não confere ou <18; NOT_EXTRACTED = OCR não achou data; PENDING = extração ainda não rodou. */
  kycExtractionStatus?: string | null;
  /** Sinal de possível fraude (ex.: CPF_DIVERGENT, RG_DIVERGENT). Preenchido quando status=DIVERGENT para alertar admin. */
  kycFraudSignal?: string | null;
}
