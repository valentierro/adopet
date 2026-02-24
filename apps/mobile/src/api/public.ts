import { api } from './client';

export type PublicStats = {
  totalAdoptions: number;
  totalUsers: number;
  totalPets: number;
};

export async function fetchPublicStats(): Promise<PublicStats> {
  return api.get<PublicStats>('/public/stats', undefined, { skipAuth: true });
}

export type RecentAdoptionItem = {
  petId: string;
  petName: string;
  species: string;
  adoptedAt: string;
  city?: string;
  photoUrl?: string;
};

export type RecentAdoptionsResponse = {
  items: RecentAdoptionItem[];
};

export async function getRecentAdoptions(limit?: number): Promise<RecentAdoptionsResponse> {
  const params: Record<string, string> = {};
  if (limit != null && limit > 0) params.limit = String(Math.min(100, limit));
  return api.get<RecentAdoptionsResponse>('/public/recent-adoptions', params, { skipAuth: true });
}
