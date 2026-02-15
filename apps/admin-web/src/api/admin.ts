import { api } from './client';

export type AdminStats = {
  totalAdoptions: number;
  adoptionsThisMonth: number;
  pendingPetsCount: number;
  pendingReportsCount: number;
  pendingAdoptionsByTutorCount: number;
  pendingVerificationsCount: number;
};

export type Pet = {
  id: string;
  name: string;
  species: string;
  publicationStatus: string;
  status: string;
  ownerId: string;
  media?: { url: string }[];
  owner?: { name: string };
};

export type VerificationItem = {
  id: string;
  type: string;
  status: string;
  petId?: string;
  userName?: string;
  petName?: string;
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
  confirmedByAdopet: boolean;
};

export type PendingAdoptionByTutorItem = {
  petId: string;
  petName: string;
  tutorId: string;
  tutorName: string;
  markedAt: string;
  autoApproveAt?: string;
  pendingAdopterId?: string;
  pendingAdopterName?: string;
  pendingAdopterUsername?: string;
};

export type UserSearchItem = { id: string; name: string; email: string };
export type PetAvailableItem = { id: string; name: string; ownerId: string; ownerName: string };

export type PartnerItem = {
  id: string;
  type: string;
  name: string;
  slug: string;
  city?: string | null;
  active: boolean;
  approvedAt?: string | null;
  isPaidPartner?: boolean;
  logoUrl?: string | null;
  createdAt: string;
};

export type PartnerRecommendationItem = {
  id: string;
  indicadorName?: string | null;
  suggestedName: string;
  suggestedType: string;
  suggestedCity?: string | null;
  createdAt: string;
};

export type BugReportItem = {
  id: string;
  userName?: string | null;
  userEmail?: string | null;
  type?: string;
  message: string;
  createdAt: string;
};

export type FeatureFlagItem = {
  key: string;
  enabled: boolean;
  description: string | null;
};

export const adminApi = {
  getStats: () => api.get<AdminStats>('/admin/stats'),
  getPendingPets: () => api.get<Pet[]>('/pets/pending'),
  setPetPublication: (petId: string, status: 'APPROVED' | 'REJECTED') =>
    api.patch<Pet>(`/pets/${petId}/publication`, { status }),
  getPendingVerifications: () => api.get<VerificationItem[]>('/verification/admin/pending'),
  getApprovedVerifications: () => api.get<VerificationItem[]>('/verification/admin/approved'),
  resolveVerification: (id: string, status: 'APPROVED' | 'REJECTED') =>
    api.put<VerificationItem>(`/verification/admin/${id}`, { status }),
  revokeVerification: (id: string) =>
    api.put<VerificationItem>(`/verification/admin/${id}/revoke`, {}),
  getReports: () => api.get<ReportItem[]>('/reports'),
  resolveReport: (reportId: string, body?: { resolutionFeedback?: string }) =>
    api.put<ReportItem>(`/reports/${reportId}/resolve`, body ?? {}),
  getAdoptions: () => api.get<AdoptionItem[]>('/admin/adoptions'),
  createAdoption: (petId: string, adopterUserId?: string) =>
    api.post<AdoptionItem>('/admin/adoptions', adopterUserId ? { petId, adopterUserId } : { petId }),
  confirmAdoptionByAdopet: (petId: string) =>
    api.post(`/admin/adoptions/${petId}/confirm-by-adopet`, {}),
  rejectAdoptionByAdopet: (petId: string) =>
    api.post(`/admin/adoptions/${petId}/reject-by-adopet`, {}),
  getPetsAvailable: () => api.get<PetAvailableItem[]>('/admin/pets-available'),
  getPendingAdoptionsByTutor: () =>
    api.get<PendingAdoptionByTutorItem[]>('/admin/pending-adoptions-by-tutor'),
  rejectPendingAdoptionByTutor: (petId: string) =>
    api.post(`/admin/pending-adoptions-by-tutor/${petId}/reject`, {}),
  searchUsers: (search: string) =>
    api.get<UserSearchItem[]>('/admin/users', search ? { search: search.trim() } : undefined),
  getPartners: () => api.get<PartnerItem[]>('/admin/partners'),
  createPartner: (body: Record<string, unknown>) => api.post<PartnerItem>('/admin/partners', body),
  updatePartner: (id: string, body: Record<string, unknown>) =>
    api.patch<PartnerItem>(`/admin/partners/${id}`, body),
  getPartnerRecommendations: () =>
    api.get<PartnerRecommendationItem[]>('/admin/partner-recommendations'),
  getBugReports: () => api.get<BugReportItem[]>('/admin/bug-reports'),
  getFeatureFlags: () => api.get<FeatureFlagItem[]>('/admin/feature-flags'),
  setFeatureFlag: (key: string, enabled: boolean) =>
    api.patch<{ key: string; enabled: boolean }>(`/admin/feature-flags/${encodeURIComponent(key)}`, { enabled }),
};
