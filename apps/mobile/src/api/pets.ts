import { api } from './client';
import type { Pet } from '@adopet/shared';

export type CreatePetBody = {
  name: string;
  species: string;
  breed?: string;
  age: number;
  sex: string;
  size: string;
  vaccinated: boolean;
  neutered: boolean;
  description: string;
  adoptionReason?: string;
  feedingType?: string;
  feedingNotes?: string;
  partnerId?: string;
  latitude?: number;
  longitude?: number;
  /** Para testes: URL de imagem placeholder quando cadastro sem fotos. */
  initialPhotoUrl?: string;
};

export type UpdatePetBody = Partial<CreatePetBody> & { partnerId?: string | null };

export type PetStatus = 'AVAILABLE' | 'IN_PROCESS' | 'ADOPTED';

export type PetResponse = Pet & { status?: string };

export type MinePetsPage = { items: PetResponse[]; nextCursor: string | null };

export type MinePetsFilters = {
  cursor?: string;
  species?: 'DOG' | 'CAT' | 'BOTH';
  status?: PetStatus;
};

export async function getMinePets(filters?: MinePetsFilters): Promise<MinePetsPage> {
  const params: Record<string, string> = {};
  if (filters?.cursor) params.cursor = filters.cursor;
  if (filters?.species) params.species = filters.species;
  if (filters?.status) params.status = filters.status;
  return api.get<MinePetsPage>('/pets/mine', params);
}

export async function getPet(id: string): Promise<PetResponse> {
  return api.get<PetResponse>(`/pets/${id}`);
}

export async function createPet(body: CreatePetBody): Promise<PetResponse> {
  return api.post<PetResponse>('/pets', body);
}

export async function updatePet(id: string, body: UpdatePetBody): Promise<PetResponse> {
  return api.put<PetResponse>(`/pets/${id}`, body);
}

export type PatchStatusBody = {
  status: PetStatus;
  pendingAdopterId?: string;
  pendingAdopterUsername?: string;
};

export async function patchPetStatus(
  id: string,
  status: PetStatus,
  options?: { pendingAdopterId?: string; pendingAdopterUsername?: string },
): Promise<PetResponse> {
  const body: PatchStatusBody = { status };
  if (options?.pendingAdopterId) body.pendingAdopterId = options.pendingAdopterId;
  if (options?.pendingAdopterUsername) body.pendingAdopterUsername = options.pendingAdopterUsername;
  return api.patch<PetResponse>(`/pets/${id}/status`, body);
}

export type ConversationPartner = { id: string; name: string; username?: string };

export async function getConversationPartners(petId: string): Promise<ConversationPartner[]> {
  return api.get<ConversationPartner[]>(`/pets/${petId}/conversation-partners`);
}

export async function deletePet(petId: string): Promise<{ message: string }> {
  return api.delete<{ message: string }>(`/pets/${petId}`);
}

export async function deletePetMedia(petId: string, mediaId: string): Promise<{ message: string }> {
  return api.delete<{ message: string }>(`/pets/${petId}/media/${mediaId}`);
}

export async function reorderPetMedia(petId: string, mediaIds: string[]): Promise<PetResponse> {
  return api.patch<PetResponse>(`/pets/${petId}/media/reorder`, { mediaIds });
}
