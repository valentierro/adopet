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

export async function createAdoption(petId: string, adopterUserId: string): Promise<AdoptionItem> {
  return api.post<AdoptionItem>('/admin/adoptions', { petId, adopterUserId });
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
