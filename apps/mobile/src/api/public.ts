import { api } from './client';

export type PublicStats = {
  totalAdoptions: number;
  totalUsers: number;
  totalPets: number;
};

export async function fetchPublicStats(): Promise<PublicStats> {
  return api.get<PublicStats>('/public/stats', undefined, { skipAuth: true });
}
