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
};

export type LookupUsernameResult = { id: string; name: string; username: string } | null;

export async function lookupUsername(username: string): Promise<LookupUsernameResult> {
  return api.get<LookupUsernameResult>(`/me/lookup-username/${encodeURIComponent(username)}`);
}

export type SizePref = 'BOTH' | 'small' | 'medium' | 'large' | 'xlarge';

export type PreferencesResponse = {
  species: 'DOG' | 'CAT' | 'BOTH';
  radiusKm: number;
  sizePref?: SizePref | null;
  latitude?: number | null;
  longitude?: number | null;
  notifyNewPets: boolean;
  notifyMessages: boolean;
  notifyReminders: boolean;
};

export type UpdatePreferencesBody = {
  species?: 'DOG' | 'CAT' | 'BOTH';
  radiusKm?: number;
  sizePref?: SizePref | null;
  latitude?: number | null;
  longitude?: number | null;
  notifyNewPets?: boolean;
  notifyMessages?: boolean;
  notifyReminders?: boolean;
};

export async function getMe(): Promise<MeResponse> {
  return api.get<MeResponse>('/me');
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
  confirmedByAdopet: boolean;
  adoptionRejectedAt?: string;
};

export type MyAdoptionsResponse = { items: MyAdoptionItem[] };

export type MyAdoptionsFilters = { species?: 'BOTH' | 'DOG' | 'CAT' };

export async function getMyAdoptions(filters?: MyAdoptionsFilters): Promise<MyAdoptionsResponse> {
  const params: Record<string, string> = {};
  if (filters?.species && filters.species !== 'BOTH') params.species = filters.species;
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
