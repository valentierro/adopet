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
  /** IDs dos parceiros (ONG) para parceria no anúncio; badge só após confirmação do parceiro. Preferir em relação a partnerId. */
  partnerIds?: string[];
  /** Cidade onde o pet está (para aparecer no mapa; coordenadas obtidas por geocoding na API). */
  city?: string;
  latitude?: number;
  longitude?: number;
  /** Para testes: URL de imagem placeholder quando cadastro sem fotos. */
  initialPhotoUrl?: string;
  /** Preferência de tutor (match com adotantes). SIM | NAO | INDIFERENTE; omitido = não informar */
  preferredTutorHousingType?: string;
  preferredTutorHasYard?: string | null;
  preferredTutorHasOtherPets?: string | null;
  preferredTutorHasChildren?: string | null;
  preferredTutorTimeAtHome?: string;
  preferredTutorPetsAllowedAtHome?: string;
  preferredTutorDogExperience?: string;
  preferredTutorCatExperience?: string;
  preferredTutorHouseholdAgrees?: string;
  preferredTutorWalkFrequency?: string;
  hasOngoingCosts?: boolean;
};

export type UpdatePetBody = Partial<CreatePetBody> & { partnerId?: string | null; partnerIds?: string[] };

export type PetStatus = 'AVAILABLE' | 'IN_PROCESS' | 'ADOPTED';

export type PetResponse = Pet & { status?: string };

export type MinePetsPage = { items: PetResponse[]; nextCursor: string | null; totalCount?: number };

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

export type MatchCriterion = {
  label: string;
  status: 'match' | 'mismatch' | 'neutral';
  message: string;
};

export type MatchScoreResponse = {
  score: number | null;
  highlights: string[];
  concerns: string[];
  criteriaCount: number;
  /** Todos os critérios avaliados (match, mismatch, neutral) para exibir no modal. */
  criteria?: MatchCriterion[];
};

export async function getMatchScore(petId: string, adopterId: string): Promise<MatchScoreResponse> {
  return api.get<MatchScoreResponse>(`/pets/${petId}/match-score`, { adopterId });
}
export async function getPet(id: string): Promise<PetResponse> {
  return api.get<PetResponse>(`/pets/${id}`);
}

/** Registra visualização do pet (ao abrir a página do pet). fromPassedScreen: true quando abre pela tela "Pets que passou" (conta +1 por usuário, uma vez). */
export async function recordPetView(petId: string, options?: { fromPassedScreen?: boolean }): Promise<{ ok: boolean }> {
  return api.post<{ ok: boolean }>(`/pets/${petId}/view`, options?.fromPassedScreen === true ? { fromPassedScreen: true } : {});
}

export type SimilarPetItem = {
  pet: PetResponse;
  similarityScore: number;
  /** Score de match com seu perfil (0–100); presente quando autenticado. Use este valor no card para bater com a tela de detalhe. */
  matchScore?: number | null;
};

export async function getSimilarPets(petId: string, limit = 12): Promise<SimilarPetItem[]> {
  return api.get<SimilarPetItem[]>(`/pets/${petId}/similar`, { limit: String(limit) });
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

/** Formato UUID v4 simples (8-4-4-4-12 hex). Exportado para validação na UI. */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test((value || '').trim());
}

export async function patchPetStatus(
  id: string,
  status: PetStatus,
  options?: { pendingAdopterId?: string; pendingAdopterUsername?: string },
): Promise<PetResponse> {
  const body: PatchStatusBody = { status };
  const adopterId = options?.pendingAdopterId?.trim();
  const username = options?.pendingAdopterUsername?.trim();
  if (adopterId && isUuid(adopterId)) body.pendingAdopterId = adopterId;
  if (username && username.length >= 2) body.pendingAdopterUsername = username;
  return api.patch<PetResponse>(`/pets/${id}/status`, body);
}

export async function confirmAdoption(
  petId: string,
  options?: { responsibilityTermAccepted?: boolean },
): Promise<{ confirmed: boolean }> {
  return api.post<{ confirmed: boolean }>(`/pets/${petId}/confirm-adoption`, {
    responsibilityTermAccepted: options?.responsibilityTermAccepted === true,
  });
}

/** Tutor cancela o processo de adoção; pet volta para disponível (cenário A ou B). */
export async function cancelAdoption(petId: string): Promise<PetResponse> {
  return api.post<PetResponse>(`/pets/${petId}/cancel-adoption`, {});
}

/** Adotante desiste da adoção (cenário A ou B); pet volta para disponível, tutor é notificado. */
export async function declineAdoption(petId: string): Promise<PetResponse> {
  return api.post<PetResponse>(`/pets/${petId}/decline-adoption`, {});
}

export type ConversationPartner = { id: string; name: string; username?: string; kycVerified?: boolean; isPartner?: boolean };

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

/** Reenviar anúncio rejeitado para análise (apenas dono). */
export async function resubmitPublication(petId: string): Promise<PetResponse> {
  return api.post<PetResponse>(`/pets/${petId}/resubmit-publication`, {});
}

/** Prorrogar vida útil do anúncio em 60 dias (apenas dono; pet disponível e não expirado). */
export async function extendListing(petId: string): Promise<PetResponse> {
  return api.post<PetResponse>(`/pets/${petId}/extend`, {});
}
