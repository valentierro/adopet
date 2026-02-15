import { api } from './client';

export type SavedSearchItem = {
  id: string;
  species?: string | null;
  size?: string | null;
  breed?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radiusKm: number;
  createdAt: string;
};

export type CreateSavedSearchBody = {
  species?: string;
  size?: string;
  breed?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
};

export type UpdateSavedSearchBody = {
  species?: string;
  size?: string;
  breed?: string;
  latitude?: number | null;
  longitude?: number | null;
  radiusKm?: number;
};

export async function getSavedSearches(): Promise<SavedSearchItem[]> {
  return api.get<SavedSearchItem[]>('/saved-search');
}

export async function createSavedSearch(body: CreateSavedSearchBody): Promise<SavedSearchItem> {
  return api.post<SavedSearchItem>('/saved-search', body);
}

export async function updateSavedSearch(id: string, body: UpdateSavedSearchBody): Promise<SavedSearchItem> {
  return api.patch<SavedSearchItem>(`/saved-search/${id}`, body);
}

export async function deleteSavedSearch(id: string): Promise<{ message: string }> {
  return api.delete<{ message: string }>(`/saved-search/${id}`);
}
