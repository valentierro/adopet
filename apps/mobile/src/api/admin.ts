import { api } from './client';
import type { Pet } from '@adopet/shared';

export type VerificationPendingItem = {
  id: string;
  type: string;
  status: string;
  petId?: string;
  userName?: string;
  petName?: string;
  /** [Admin listPending] */
  userId?: string;
  userAvatarUrl?: string;
  userCity?: string;
  userUsername?: string;
  petSpecies?: string;
  petAge?: number;
  petSex?: string;
  petVaccinated?: boolean;
  petNeutered?: boolean;
  petPhotoUrl?: string;
  petOwnerName?: string;
  evidenceUrls?: string[];
  skipEvidenceReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReportItem = {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  description?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedById?: string;
};

/** [Admin] Anúncios pendentes de aprovação para o feed */
export async function getPendingPets(): Promise<Pet[]> {
  return api.get<Pet[]>('/pets/pending');
}

/** [Admin] Aprovar ou rejeitar anúncio para o feed */
export async function setPetPublication(
  petId: string,
  status: 'APPROVED' | 'REJECTED',
): Promise<Pet> {
  return api.patch<Pet>(`/pets/${petId}/publication`, { status });
}

export async function getPendingVerifications(): Promise<VerificationPendingItem[]> {
  return api.get<VerificationPendingItem[]>('/verification/admin/pending');
}

/** [Admin] Verificações já aprovadas (para revogar) */
export async function getApprovedVerifications(): Promise<VerificationPendingItem[]> {
  return api.get<VerificationPendingItem[]>('/verification/admin/approved');
}

export async function resolveVerification(
  id: string,
  status: 'APPROVED' | 'REJECTED',
): Promise<VerificationPendingItem> {
  return api.put<VerificationPendingItem>(`/verification/admin/${id}`, { status });
}

/** [Admin] Revogar verificação aprovada */
export async function revokeVerification(id: string): Promise<VerificationPendingItem> {
  return api.put<VerificationPendingItem>(`/verification/admin/${id}/revoke`, {});
}

export async function getReports(): Promise<ReportItem[]> {
  return api.get<ReportItem[]>('/reports');
}

/** [Admin] Marcar denúncia como resolvida (feedback opcional para o denunciador) */
export async function resolveReport(reportId: string, body?: { resolutionFeedback?: string }): Promise<ReportItem> {
  return api.put<ReportItem>(`/reports/${reportId}/resolve`, body ?? {});
}

// --- Dashboard e adoções ---

export type AdminStats = {
  totalAdoptions: number;
  adoptionsThisMonth: number;
  pendingPetsCount: number;
  pendingReportsCount: number;
  pendingAdoptionsByTutorCount: number;
  pendingVerificationsCount: number;
};

export type PendingAdoptionByTutorItem = {
  petId: string;
  petName: string;
  tutorId: string;
  tutorName: string;
  markedAt: string;
  /** Se não houver validação manual, o sistema auto-valida nesta data (48h após markedAt) */
  autoApproveAt?: string;
  /** Adotante indicado pelo tutor ao marcar como adotado */
  pendingAdopterId?: string;
  pendingAdopterName?: string;
  pendingAdopterUsername?: string;
};

export type AdoptionItem = {
  id: string;
  petId: string;
  petName: string;
  tutorId: string;
  tutorName: string;
  adopterId: string;
  adopterName: string;
  adoptedAt: string;
  /** true quando a Adopet confirmou (admin ou 48h); false quando só o adotante confirmou */
  confirmedByAdopet: boolean;
};

export type UserSearchItem = { id: string; name: string; email: string };
export type PetAvailableItem = { id: string; name: string; ownerId: string; ownerName: string };

export async function getAdminStats(): Promise<AdminStats> {
  return api.get<AdminStats>('/admin/stats');
}

export async function getAdminAdoptions(): Promise<AdoptionItem[]> {
  return api.get<AdoptionItem[]>('/admin/adoptions');
}

export async function createAdoption(petId: string, adopterUserId?: string): Promise<AdoptionItem> {
  return api.post<AdoptionItem>('/admin/adoptions', adopterUserId != null ? { petId, adopterUserId } : { petId });
}

/** [Admin] Marcar adoção como confirmada pela Adopet (badge "Confirmado pelo Adopet"). */
export async function confirmAdoptionByAdopet(petId: string): Promise<void> {
  return api.post<void>(`/admin/adoptions/${petId}/confirm-by-adopet`, {});
}

/** [Admin] Rejeitar adoção pela Adopet (badge "Rejeitado pelo Adopet"). */
export async function rejectAdoptionByAdopet(petId: string): Promise<void> {
  return api.post<void>(`/admin/adoptions/${petId}/reject-by-adopet`, {});
}

export async function searchAdminUsers(search: string): Promise<UserSearchItem[]> {
  const params: Record<string, string> = {};
  if (search?.trim()) params.search = search.trim();
  return api.get<UserSearchItem[]>('/admin/users', params);
}

export async function getAdminPetsAvailable(): Promise<PetAvailableItem[]> {
  return api.get<PetAvailableItem[]>('/admin/pets-available');
}

export async function getAdminPendingAdoptionsByTutor(): Promise<PendingAdoptionByTutorItem[]> {
  return api.get<PendingAdoptionByTutorItem[]>('/admin/pending-adoptions-by-tutor');
}

/** [Admin] Rejeitar marcação de adoção pelo tutor; pet permanece como ADOPTED (não volta ao feed), não computa pontos/quantidade de adoção, tutor vê badge "Rejeitado pelo Adopet". */
export async function rejectPendingAdoptionByTutor(petId: string): Promise<void> {
  return api.post<void>(`/admin/pending-adoptions-by-tutor/${petId}/reject`, {});
}

export type BugReportItem = {
  id: string;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  type?: string;
  message: string;
  stack?: string | null;
  screen?: string | null;
  userComment?: string | null;
  createdAt: string;
};

/** [Admin] Listar reports de bugs enviados pelos usuários (beta) */
export async function getAdminBugReports(): Promise<BugReportItem[]> {
  return api.get<BugReportItem[]>('/admin/bug-reports');
}

// --- Parceiros (ONG, clínicas, lojas) ---

export type PartnerAdminItem = {
  id: string;
  type: string;
  name: string;
  slug: string;
  city?: string | null;
  description?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  active: boolean;
  approvedAt?: string | null;
  /** Data do primeiro login; parceria "ativa" só após isso */
  activatedAt?: string | null;
  /** true quando pode reenviar e-mail de definir senha (tem conta e ainda não acessou o app) */
  canResendConfirmation?: boolean;
  rejectionReason?: string | null;
  isPaidPartner?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreatePartnerBody = {
  type: 'ONG' | 'CLINIC' | 'STORE';
  name: string;
  slug?: string;
  city?: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  active?: boolean;
  approve?: boolean;
  isPaidPartner?: boolean;
};

export type UpdatePartnerBody = {
  name?: string;
  slug?: string;
  city?: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  active?: boolean;
  approve?: boolean;
  reject?: boolean;
  rejectionReason?: string;
  isPaidPartner?: boolean;
};

/** [Admin] Listar todos os parceiros */
export async function getAdminPartners(): Promise<PartnerAdminItem[]> {
  return api.get<PartnerAdminItem[]>('/admin/partners');
}

/** [Admin] Cadastrar parceiro */
export async function createAdminPartner(body: CreatePartnerBody): Promise<PartnerAdminItem> {
  return api.post<PartnerAdminItem>('/admin/partners', body);
}

/** [Admin] Atualizar ou aprovar parceiro */
export async function updateAdminPartner(id: string, body: UpdatePartnerBody): Promise<PartnerAdminItem> {
  return api.patch<PartnerAdminItem>(`/admin/partners/${id}`, body);
}

/** [Admin] Aprovar vários parceiros de uma vez */
export async function bulkApprovePartners(ids: string[]): Promise<{ updated: number }> {
  return api.post<{ updated: number }>('/admin/partners/bulk-approve', { ids });
}

/** [Admin] Rejeitar vários parceiros de uma vez (motivo opcional) */
export async function bulkRejectPartners(ids: string[], rejectionReason?: string): Promise<{ updated: number }> {
  return api.post<{ updated: number }>('/admin/partners/bulk-reject', { ids, rejectionReason });
}

/** [Admin] Reenviar e-mail de definir senha para parceiro que ainda não acessou o app */
export async function resendPartnerConfirmation(partnerId: string): Promise<{ message: string }> {
  return api.post<{ message: string }>(`/admin/partners/${partnerId}/resend-confirmation`, {});
}

// --- Indicações de parceiros (usuários indicam ONGs/clínicas/lojas) ---

export type PartnerRecommendationItem = {
  id: string;
  indicadorUserId: string;
  indicadorName?: string | null;
  indicadorEmail?: string | null;
  suggestedName: string;
  suggestedType: string;
  suggestedCity?: string | null;
  suggestedEmail?: string | null;
  suggestedPhone?: string | null;
  message?: string | null;
  createdAt: string;
};

/** [Admin] Listar indicações de parceiros */
export async function getAdminPartnerRecommendations(): Promise<PartnerRecommendationItem[]> {
  return api.get<PartnerRecommendationItem[]>('/admin/partner-recommendations');
}

// --- Solicitações de parceria (formulário do app) ---

export type PartnershipRequestItem = {
  id: string;
  tipo: string;
  nome: string;
  email: string;
  instituicao: string;
  telefone: string;
  mensagem?: string | null;
  cnpj?: string | null;
  anoFundacao?: string | null;
  cep?: string | null;
  endereco?: string | null;
  personType?: string | null;
  documentoComercial?: string | null;
  planoDesejado?: string | null;
  status: string;
  rejectionReason?: string | null;
  processedAt?: string | null;
  partnerId?: string | null;
  createdAt: string;
};

/** [Admin] Listar solicitações de parceria enviadas pelo formulário do app */
export async function getAdminPartnershipRequests(): Promise<PartnershipRequestItem[]> {
  return api.get<PartnershipRequestItem[]>('/admin/partnership-requests');
}

/** [Admin] Aprovar solicitação (cria parceiro e vincula) */
export async function approvePartnershipRequest(id: string): Promise<{ partnerId: string }> {
  return api.post<{ partnerId: string }>(`/admin/partnership-requests/${id}/approve`, {});
}

/** [Admin] Rejeitar solicitação (motivo opcional) */
export async function rejectPartnershipRequest(id: string, rejectionReason?: string): Promise<void> {
  return api.post<void>(`/admin/partnership-requests/${id}/reject`, { rejectionReason });
}

// --- Feature flags ---

export type FeatureFlagItem = {
  key: string;
  enabled: boolean;
  description: string | null;
};

/** [Admin] Listar feature flags (habilitar/desabilitar funcionalidades) */
export async function getFeatureFlags(): Promise<FeatureFlagItem[]> {
  return api.get<FeatureFlagItem[]>('/admin/feature-flags');
}

/** [Admin] Habilitar ou desabilitar uma feature flag */
export async function updateFeatureFlag(
  key: string,
  body: { enabled: boolean },
): Promise<{ key: string; enabled: boolean }> {
  return api.patch<{ key: string; enabled: boolean }>(`/admin/feature-flags/${encodeURIComponent(key)}`, body);
}
