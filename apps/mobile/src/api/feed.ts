import type { Pet } from '@adopet/shared';
import { api } from './client';

export type FeedResponse = {
  items: Pet[];
  nextCursor: string | null;
  totalCount: number;
};

const FEED_PAGE_SIZE = 20;

export type FeedSpeciesFilter = 'BOTH' | 'DOG' | 'CAT';

export type FeedParams = {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  cursor?: string;
  species?: FeedSpeciesFilter;
  /** Listar anúncios de um dono (ex.: perfil do tutor) */
  ownerId?: string;
};

export async function fetchFeed(params: FeedParams = {}): Promise<FeedResponse> {
  const query: Record<string, string> = {};
  if (params.lat != null) query.lat = String(params.lat);
  if (params.lng != null) query.lng = String(params.lng);
  if (params.radiusKm != null) query.radiusKm = String(params.radiusKm);
  if (params.cursor) query.cursor = params.cursor;
  if (params.species) query.species = params.species;
  if (params.ownerId) query.ownerId = params.ownerId;

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
};

export type FeedMapResponse = { items: MapPin[] };

const FEED_MAP_TIMEOUT_MS = 35_000;

export async function fetchFeedMap(params: { lat: number; lng: number; radiusKm?: number }): Promise<FeedMapResponse> {
  const query: Record<string, string> = {
    lat: String(params.lat),
    lng: String(params.lng),
  };
  if (params.radiusKm != null) query.radiusKm = String(params.radiusKm);
  return api.get<FeedMapResponse>('/feed/map', query, { timeoutMs: FEED_MAP_TIMEOUT_MS });
}

export { FEED_PAGE_SIZE };
