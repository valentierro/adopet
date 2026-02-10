import { api } from './client';
import type { Pet } from '@adopet/shared';

export type FavoriteItem = {
  id: string;
  petId: string;
  createdAt: string;
  pet: {
    id: string;
    name: string;
    species: string;
    age: number;
    sex: string;
    size: string;
    vaccinated: boolean;
    neutered: boolean;
    photos: string[];
    status: string;
    verified?: boolean;
    /** Data do anúncio (quando o pet foi cadastrado) */
    createdAt: string;
    city?: string | null;
    partner?: { id: string; name: string; slug: string; logoUrl?: string | null };
  };
};

export type FavoritesPage = { items: FavoriteItem[]; nextCursor: string | null };

export async function getFavorites(cursor?: string): Promise<FavoritesPage> {
  const params: Record<string, string> = {};
  if (cursor) params.cursor = cursor;
  const res = await api.get<FavoritesPage | null | undefined>('/favorites', params);
  if (res != null && typeof res === 'object' && Array.isArray((res as FavoritesPage).items)) {
    return res as FavoritesPage;
  }
  return { items: [], nextCursor: null };
}

export async function addFavorite(petId: string): Promise<FavoriteItem> {
  return api.post<FavoriteItem>('/favorites', { petId });
}

export async function removeFavorite(petId: string): Promise<void> {
  await api.delete(`/favorites/${petId}`);
}

/** Converte FavoriteItem.pet para formato Pet (para PetCard). Garante photos sempre array. */
export function favoritePetToPet(item: FavoriteItem): Pet {
  const pet = item?.pet;
  const photos = pet && Array.isArray(pet.photos) ? pet.photos : [];
  return {
    id: pet?.id ?? '',
    name: pet?.name ?? '',
    species: (pet?.species as 'dog' | 'cat') ?? 'dog',
    age: typeof pet?.age === 'number' ? pet.age : 0,
    sex: (pet?.sex as 'male' | 'female') ?? 'male',
    size: (pet?.size as 'small' | 'medium' | 'large' | 'xlarge') ?? 'medium',
    vaccinated: pet?.vaccinated ?? false,
    neutered: pet?.neutered ?? false,
    description: '',
    photos,
    ownerId: '',
    createdAt: pet?.createdAt ?? item?.createdAt ?? '',
    updatedAt: pet?.createdAt ?? item?.createdAt ?? '',
    verified: (pet as { verified?: boolean })?.verified ?? false,
    city: pet?.city ?? undefined,
    partner: pet?.partner,
  };
}
