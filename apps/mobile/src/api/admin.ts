import { api } from './client';
import type { Pet } from '@adopet/shared';

export type VerificationPendingItem = {
  id: string;
  type: string;
  status: string;
  petId?: string;
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
