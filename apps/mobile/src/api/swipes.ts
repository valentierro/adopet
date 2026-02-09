import type { Pet } from '@adopet/shared';
import { api } from './client';

export type CreateSwipeBody = {
  petId: string;
  action: 'LIKE' | 'PASS';
};

export type CreateSwipeResponse = {
  id: string;
  action: string;
};

export async function createSwipe(body: CreateSwipeBody): Promise<CreateSwipeResponse> {
  return api.post<CreateSwipeResponse>('/swipes', body);
}

export type PassedPetsResponse = { items: Pet[] };

export async function getPassedPets(): Promise<PassedPetsResponse> {
  return api.get<PassedPetsResponse>('/swipes/passed');
}

export async function undoPass(petId: string): Promise<{ message: string }> {
  return api.delete<{ message: string }>(`/swipes/passed/${petId}`);
}
