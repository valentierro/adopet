import { api } from './client';
import type { User } from '../stores/authStore';

export type MeResponse = User;

export type UpdateMeBody = {
  name?: string;
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
