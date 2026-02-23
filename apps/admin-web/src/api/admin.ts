import { api } from './client';

export type AdminStats = {
  totalAdoptions: number;
  adoptionsThisMonth: number;
  pendingPetsCount: number;
  pendingReportsCount: number;
  pendingAdoptionsByTutorCount: number;
  pendingVerificationsCount: number;
  pendingKycCount?: number;
};

export type SatisfactionStats = {
  totalResponses: number;
  averageTrust: number;
  averageEaseOfUse: number;
  averageCommunication: number;
  averageOverall: number;
  byRole: { adopter: { count: number; avgOverall: number }; tutor: { count: number; avgOverall: number } };
};

export type SatisfactionResponseItem = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  adoptionId: string | null;
  role: string;
  trustScore: number;
  easeOfUseScore: number;
  communicationScore: number;
  overallScore: number;
  comment: string | null;
  createdAt: string;
};

export type PetsReportAggregates = {
  total: number;
  bySpecies: Record<string, number>;
  byBreed: Record<string, number>;
  bySex: Record<string, number>;
  byCity: Record<string, number>;
  byAgeRange: Record<string, number>;
  byPublicationStatus: Record<string, number>;
  byStatus: Record<string, number>;
  byVaccinated: Record<string, number>;
  byNeutered: Record<string, number>;
};

export type UsersReportAggregates = {
  total: number;
  byCity: Record<string, number>;
  byMonth: Record<string, number>;
  byKycStatus: Record<string, number>;
  withListings: number;
  withoutListings: number;
  deactivated: number;
};

export type AdoptionsReportAggregates = {
  total: number;
  byMonth: Record<string, number>;
  bySpecies: Record<string, number>;
  confirmedByAdopet: number;
  notConfirmedByAdopet: number;
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
  /** [Admin listPending] */
  userId?: string;
  userAvatarUrl?: string;
  userCity?: string;
  userUsername?: string;
  /** Perfil já aprovado (selo Verificado) */
  userVerified?: boolean;
  /** Nível do tutor (ex: BEGINNER, GOLD) */
  userTutorLevel?: string;
  /** Título do nível (ex: Tutor Ouro) */
  userTutorTitle?: string;
  /** Usuário é membro de alguma ONG */
  userOngMember?: boolean;
  petSpecies?: string;
  petAge?: number;
  petSex?: string;
  petVaccinated?: boolean;
  petNeutered?: boolean;
  petPhotoUrl?: string;
  petOwnerName?: string;
  evidenceUrls?: string[];
  skipEvidenceReason?: string;
  rejectionReason?: string;
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

export type FeatureFlagScope = 'GLOBAL' | 'CITY' | 'PARTNER';

export type FeatureFlagDto = {
  id: string;
  key: string;
  enabled: boolean;
  description: string | null;
  scope: string;
  cityId: string | null;
  partnerId: string | null;
  rolloutPercent: number | null;
  createdAt: string;
  updatedAt: string;
};

/** @deprecated Use FeatureFlagDto; list returns full records. */
export type FeatureFlagItem = FeatureFlagDto;

export const adminApi = {
  getStats: () => api.get<AdminStats>('/admin/stats'),
  getPendingPets: () => api.get<Pet[]>('/pets/pending'),
  setPetPublication: (petId: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) =>
    api.patch<Pet>(`/pets/${petId}/publication`, { status, rejectionReason }),
  getPendingVerifications: () => api.get<VerificationItem[]>('/verification/admin/pending'),
  getApprovedVerifications: () => api.get<VerificationItem[]>('/verification/admin/approved'),
  resolveVerification: (id: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) =>
    api.put<VerificationItem>(`/verification/admin/${id}`, { status, rejectionReason }),
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
  rejectAdoptionByAdopet: (petId: string, rejectionReason?: string) =>
    api.post(`/admin/adoptions/${petId}/reject-by-adopet`, rejectionReason ? { rejectionReason } : {}),
  getPetsAvailable: () => api.get<PetAvailableItem[]>('/admin/pets-available'),
  getPendingAdoptionsByTutor: () =>
    api.get<PendingAdoptionByTutorItem[]>('/admin/pending-adoptions-by-tutor'),
  rejectPendingAdoptionByTutor: (petId: string, rejectionReason?: string) =>
    api.post(`/admin/pending-adoptions-by-tutor/${petId}/reject`, rejectionReason ? { rejectionReason } : {}),
  searchUsers: (search: string) =>
    api.get<UserSearchItem[]>('/admin/users', search ? { search: search.trim() } : undefined),
  getPartners: () => api.get<PartnerItem[]>('/admin/partners'),
  getSatisfactionStats: () => api.get<SatisfactionStats>('/admin/satisfaction/stats'),
  getSatisfactionResponses: (page = 1, limit = 500) =>
    api.get<{ items: SatisfactionResponseItem[]; total: number }>('/admin/satisfaction/responses', {
      page: String(page),
      limit: String(limit),
    }),
  getPetsReportAggregates: () => api.get<PetsReportAggregates>('/admin/reports/pets-aggregates'),
  getUsersReportAggregates: () => api.get<UsersReportAggregates>('/admin/reports/users-aggregates'),
  getAdoptionsReportAggregates: () =>
    api.get<AdoptionsReportAggregates>('/admin/reports/adoptions-aggregates'),
  createPartner: (body: Record<string, unknown>) => api.post<PartnerItem>('/admin/partners', body),
  updatePartner: (id: string, body: Record<string, unknown>) =>
    api.patch<PartnerItem>(`/admin/partners/${id}`, body),
  getPartnerRecommendations: () =>
    api.get<PartnerRecommendationItem[]>('/admin/partner-recommendations'),
  getBugReports: () => api.get<BugReportItem[]>('/admin/bug-reports'),
  listFeatureFlags: () => api.get<FeatureFlagDto[]>('/admin/feature-flags'),
  createFeatureFlag: (dto: {
    key: string;
    enabled?: boolean;
    description?: string | null;
    scope?: string;
    cityId?: string | null;
    partnerId?: string | null;
    rolloutPercent?: number | null;
  }) => api.post<FeatureFlagDto>('/admin/feature-flags', dto),
  updateFeatureFlag: (
    id: string,
    dto: {
      enabled?: boolean;
      description?: string | null;
      scope?: string;
      cityId?: string | null;
      partnerId?: string | null;
      rolloutPercent?: number | null;
    }
  ) => api.patch<FeatureFlagDto>(`/admin/feature-flags/${id}`, dto),

  /** Importação em massa via CSV */
  bulkUploadPartners: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.postFile<BulkResult>('/admin/bulk/partners', form);
  },
  bulkUploadPartnerMembers: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.postFile<BulkResult>('/admin/bulk/partner-members', form);
  },
  bulkUploadPets: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.postFile<BulkResult>('/admin/bulk/pets', form);
  },
};

export type BulkResult = { created: number; errors: { row: number; message: string }[] };
