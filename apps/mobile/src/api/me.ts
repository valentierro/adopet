import { api } from './client';
import type { User } from '../stores/authStore';

export type MeResponse = User;

export type UpdateMeBody = {
  name?: string;
  username?: string;
  avatarUrl?: string;
  phone?: string;
  city?: string;
  bio?: string;
  housingType?: string;
  hasYard?: boolean;
  hasOtherPets?: boolean;
  hasChildren?: boolean;
  timeAtHome?: string;
  petsAllowedAtHome?: string;
  dogExperience?: string;
  catExperience?: string;
  householdAgreesToAdoption?: string;
  whyAdopt?: string;
  activityLevel?: string;
  preferredPetAge?: string;
  commitsToVetCare?: string;
  walkFrequency?: string;
  monthlyBudgetForPet?: string;
};

export type LookupUsernameResult = { id: string; name: string; username: string } | null;

export async function lookupUsername(username: string): Promise<LookupUsernameResult> {
  return api.get<LookupUsernameResult>(`/me/lookup-username/${encodeURIComponent(username)}`);
}

export type SizePref = 'BOTH' | 'small' | 'medium' | 'large' | 'xlarge';

export type SexPref = 'BOTH' | 'male' | 'female';

export type PreferencesResponse = {
  species: 'DOG' | 'CAT' | 'BOTH';
  radiusKm: number;
  sizePref?: SizePref | null;
  sexPref?: SexPref | null;
  latitude?: number | null;
  longitude?: number | null;
  notifyNewPets: boolean;
  notifyMessages: boolean;
  notifyReminders: boolean;
  notifyListingReminders: boolean;
};

export type UpdatePreferencesBody = {
  species?: 'DOG' | 'CAT' | 'BOTH';
  radiusKm?: number;
  sizePref?: SizePref | null;
  sexPref?: SexPref | null;
  latitude?: number | null;
  longitude?: number | null;
  notifyNewPets?: boolean;
  notifyMessages?: boolean;
  notifyReminders?: boolean;
  notifyListingReminders?: boolean;
};

export async function getMe(): Promise<MeResponse> {
  return api.get<MeResponse>('/me');
}

export type KycStatusResponse = {
  kycStatus: string | null;
  kycSubmittedAt: string | null;
  kycVerifiedAt: string | null;
  kycRejectedAt: string | null;
  kycRejectionReason: string | null;
};

export async function getKycStatus(): Promise<KycStatusResponse> {
  return api.get<KycStatusResponse>('/me/kyc-status');
}

export async function submitKyc(
  selfieWithDocKey: string,
  consentGiven: boolean,
): Promise<{ kycStatus: string; kycSubmittedAt: string }> {
  return api.post<{ kycStatus: string; kycSubmittedAt: string }>('/me/kyc', {
    selfieWithDocKey,
    consentGiven,
  });
}

export type SubmitSatisfactionBody = {
  adoptionId?: string;
  role: 'ADOPTER' | 'TUTOR';
  trustScore: number;
  easeOfUseScore: number;
  communicationScore: number;
  overallScore: number;
  comment?: string;
};

export async function submitSatisfactionSurvey(body: SubmitSatisfactionBody): Promise<{ message: string }> {
  return api.post<{ message: string }>('/me/satisfaction-survey', body);
}

export type PendingAdoptionConfirmationItem = {
  petId: string;
  petName: string;
  tutorName: string;
  photos: string[];
  species: string;
  breed?: string;
  age: number;
  vaccinated?: boolean;
  neutered?: boolean;
  verified?: boolean;
  partner?: { isPaidPartner?: boolean };
};

export async function getPendingAdoptionConfirmations(): Promise<{ items: PendingAdoptionConfirmationItem[] }> {
  return api.get<{ items: PendingAdoptionConfirmationItem[] }>('/me/pending-adoption-confirmations');
}

export async function updateMe(body: UpdateMeBody): Promise<MeResponse> {
  return api.put<MeResponse>('/me', body);
}

export type TutorStatsResponse = {
  points: number;
  level: string;
  title: string;
  verifiedCount: number;
  adoptedCount: number;
  petsCount: number;
};

export async function getTutorStats(): Promise<TutorStatsResponse> {
  return api.get<TutorStatsResponse>('/me/tutor-stats');
}

export type MyAdoptionItem = {
  adoptionId: string;
  petId: string;
  petName: string;
  species: string;
  photos: string[];
  adoptedAt: string;
  tutorName: string;
  adopterName?: string;
  confirmedByAdopet: boolean;
  adoptionRejectedAt?: string;
  surveySubmitted?: boolean;
  surveyOverallScore?: number;
  vaccinated?: boolean;
  neutered?: boolean;
  verified?: boolean;
  partner?: { isPaidPartner?: boolean };
  matchScore?: number | null;
};

export type MyAdoptionsResponse = { items: MyAdoptionItem[] };

export type MyAdoptionsFilters = { species?: 'BOTH' | 'DOG' | 'CAT'; role?: 'ADOPTER' | 'TUTOR' };

export async function getMyAdoptions(filters?: MyAdoptionsFilters): Promise<MyAdoptionsResponse> {
  const params: Record<string, string> = {};
  if (filters?.species && filters.species !== 'BOTH') params.species = filters.species;
  if (filters?.role) params.role = filters.role;
  return api.get<MyAdoptionsResponse>('/me/adoptions', params);
}

export async function getPreferences(): Promise<PreferencesResponse> {
  return api.get<PreferencesResponse>('/me/preferences');
}

export async function updatePreferences(
  body: UpdatePreferencesBody,
): Promise<PreferencesResponse> {
  return api.put<PreferencesResponse>('/me/preferences', body);
}

export async function updatePushToken(pushToken: string | null): Promise<void> {
  await api.put<{ message: string }>('/me/push-token', { pushToken });
}

export async function deactivateAccount(): Promise<{ message: string }> {
  return api.put<{ message: string }>('/me/deactivate');
}

/** Exportação dos dados do titular (portabilidade – LGPD art. 18 V). */
export async function exportMyData(): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/me/export');
}

// --- Notificações in-app ---

export type InAppNotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  archivedAt?: string | null;
  createdAt: string;
};

export async function getMyNotifications(limit?: number, archived?: boolean): Promise<InAppNotificationItem[]> {
  const params: Record<string, string> = {};
  if (limit != null) params.limit = String(limit);
  if (archived === true) params.archived = 'true';
  return api.get<InAppNotificationItem[]>('/me/notifications', params);
}

export async function getMyNotificationsUnreadCount(): Promise<{ count: number }> {
  return api.get<{ count: number }>('/me/notifications/unread-count');
}

export async function markNotificationAsRead(id: string): Promise<{ ok: true }> {
  return api.patch<{ ok: true }>(`/me/notifications/${id}/read`);
}

export async function markAllNotificationsAsRead(): Promise<{ updated: number }> {
  return api.patch<{ updated: number }>('/me/notifications/read-all');
}

export async function archiveNotification(id: string): Promise<{ ok: true }> {
  return api.patch<{ ok: true }>(`/me/notifications/${id}/archive`, {});
}

export async function archiveNotifications(ids: string[]): Promise<{ archived: number }> {
  return api.patch<{ archived: number }>('/me/notifications/archive', { ids });
}

export async function deleteNotification(id: string): Promise<void> {
  return api.delete(`/me/notifications/${id}`);
}

export async function deleteNotifications(ids: string[]): Promise<{ deleted: number }> {
  return api.post<{ deleted: number }>('/me/notifications/delete-bulk', { ids });
}
