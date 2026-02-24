import type { Pet } from '@adopet/shared';
import { api } from './client';

export type FeedResponse = {
  items: Pet[];
  nextCursor: string | null;
  totalCount: number;
};

const FEED_PAGE_SIZE = 20;

export type FeedSpeciesFilter = 'BOTH' | 'DOG' | 'CAT';

export type FeedTriageFilters = {
  sex?: string;
  size?: string;
  /** Múltiplas raças (labels); enviadas à API como string separada por vírgula */
  breed?: string[];
  energyLevel?: string;
  temperament?: string;
  goodWithChildren?: string;
  goodWithDogs?: string;
  goodWithCats?: string;
  hasSpecialNeeds?: boolean;
  isDocile?: boolean;
  isTrained?: boolean;
};

export type FeedPartnerFilter = 'all' | 'partners_only' | 'no_partners';

export type FeedParams = {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  cursor?: string;
  /** Quantidade máxima de itens (1–500). Ex.: carrossel da home usa limit alto. */
  limit?: number;
  species?: FeedSpeciesFilter;
  /** Porte: small, medium, large (API pode ignorar se não suportado) */
  size?: string;
  /** Filtrar por parceria: all = todos, partners_only = só parceiros, no_partners = só sem parceria */
  partnerFilter?: FeedPartnerFilter;
  /** Listar anúncios de um dono (ex.: perfil do tutor) */
  ownerId?: string;
  /** Ordenar por engajamento: trending = mais favoritados primeiro */
  sortBy?: 'trending';
} & FeedTriageFilters;

export async function fetchFeed(params: FeedParams = {}): Promise<FeedResponse> {
  const query: Record<string, string> = {};
  if (params.lat != null) query.lat = String(params.lat);
  if (params.lng != null) query.lng = String(params.lng);
  if (params.radiusKm != null) query.radiusKm = String(params.radiusKm);
  if (params.cursor) query.cursor = params.cursor;
  if (params.limit != null) query.limit = String(params.limit);
  if (params.species) query.species = params.species;
  if (params.size) query.size = params.size;
  if (params.sex) query.sex = params.sex;
  if (params.breed?.length) query.breed = params.breed.map((b) => b.trim()).filter(Boolean).join(',');
  if (params.partnerFilter && params.partnerFilter !== 'all') query.partnerFilter = params.partnerFilter;
  if (params.ownerId) query.ownerId = params.ownerId;
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.energyLevel) query.energyLevel = params.energyLevel;
  if (params.temperament) query.temperament = params.temperament;
  if (params.goodWithChildren) query.goodWithChildren = params.goodWithChildren;
  if (params.goodWithDogs) query.goodWithDogs = params.goodWithDogs;
  if (params.goodWithCats) query.goodWithCats = params.goodWithCats;
  if (params.hasSpecialNeeds !== undefined) query.hasSpecialNeeds = String(params.hasSpecialNeeds);
  if (params.isDocile !== undefined) query.isDocile = String(params.isDocile);
  if (params.isTrained !== undefined) query.isTrained = String(params.isTrained);

  return api.get<FeedResponse>('/feed', query);
}

export type MapPin = {
  id: string;
  name: string;
  age: number;
  species: string;
  size?: string;
  vaccinated?: boolean;
  city?: string;
  latitude: number;
  longitude: number;
  photoUrl: string;
  distanceKm?: number;
  verified?: boolean;
  partner?: { isPaidPartner: boolean };
  /** Match score 0–100 quando o usuário está logado */
  matchScore?: number;
};

export type FeedMapResponse = { items: MapPin[] };

const FEED_MAP_TIMEOUT_MS = 35_000;

export type FeedMapSpeciesFilter = 'BOTH' | 'DOG' | 'CAT';

export async function fetchFeedMap(params: {
  lat: number;
  lng: number;
  radiusKm?: number;
  species?: FeedMapSpeciesFilter;
}): Promise<FeedMapResponse> {
  const query: Record<string, string> = {
    lat: String(params.lat),
    lng: String(params.lng),
  };
  if (params.radiusKm != null) query.radiusKm = String(params.radiusKm);
  if (params.species && params.species !== 'BOTH') query.species = params.species;
  return api.get<FeedMapResponse>('/feed/map', query, { timeoutMs: FEED_MAP_TIMEOUT_MS });
}

export { FEED_PAGE_SIZE };
