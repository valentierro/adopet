import type { Pet, TutorStats } from '@adopet/shared';
import { api } from './client';

export type OwnerProfilePublic = {
  id: string;
  name: string;
  avatarUrl?: string;
  petsCount: number;
  verified?: boolean;
  city?: string;
  bio?: string;
  housingType?: string;
  hasYard?: boolean;
  hasOtherPets?: boolean;
  hasChildren?: boolean;
  timeAtHome?: string;
  tutorStats?: TutorStats;
  /** Apenas quando acessado por admin (para confirmação de adoção) */
  phone?: string;
};

export async function getPetById(id: string): Promise<Pet> {
  const pet = await api.get<Pet>(`/pets/${id}`);
  if (!pet) throw new Error('Pet não encontrado');
  return pet;
}

export async function getOwnerProfileByPetId(petId: string): Promise<OwnerProfilePublic> {
  const profile = await api.get<OwnerProfilePublic>(`/pets/${petId}/owner-profile`);
  if (!profile) throw new Error('Perfil não encontrado');
  return profile;
}

/** [Admin] Perfil do tutor com telefone (para confirmação de adoção). */
export async function getOwnerProfileByPetIdForAdmin(petId: string): Promise<OwnerProfilePublic> {
  const profile = await api.get<OwnerProfilePublic>(`/pets/${petId}/owner-profile-admin`);
  if (!profile) throw new Error('Perfil não encontrado');
  return profile;
}
