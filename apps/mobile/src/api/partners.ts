import { api } from './client';

export type Partner = {
  id: string;
  type: string;
  name: string;
  slug: string;
  city?: string | null;
  /** Endereço completo (para abrir no mapa) */
  address?: string | null;
  description?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  /** Parceria paga: destaque na lista e boost no feed */
  isPaidPartner?: boolean;
};

export async function getPartners(type?: 'ONG' | 'CLINIC' | 'STORE', q?: string): Promise<Partner[]> {
  const params: Record<string, string> = {};
  if (type) params.type = type;
  if (q?.trim()) params.q = q.trim();
  return api.get<Partner[]>('/partners', params);
}

/** Marketplace: serviços e descontos de parceiros. Resposta paginada com ordenação. */
export type MarketplaceItem =
  | ({ kind: 'service'; partner: Partner } & PartnerServicePublic)
  | ({ kind: 'coupon'; partner: Partner } & PartnerCouponPublic);

export type MarketplacePage = { items: MarketplaceItem[]; total: number };

export type GetMarketplaceItemsOpts = {
  limit?: number;
  offset?: number;
  sort?: 'name' | 'discount' | 'partner';
};

export async function getMarketplaceItems(
  filter: 'services' | 'discounts' | 'products',
  q?: string,
  partnerType?: 'CLINIC' | 'STORE' | 'ONG',
  opts?: GetMarketplaceItemsOpts,
): Promise<MarketplacePage> {
  const params: Record<string, string> = { filter };
  if (q?.trim()) params.q = q.trim();
  if (partnerType) params.type = partnerType;
  if (opts?.limit != null) params.limit = String(opts.limit);
  if (opts?.offset != null) params.offset = String(opts.offset);
  if (opts?.sort) params.sort = opts.sort;
  const result = await api.get<MarketplacePage>('/marketplace', params, { skipAuth: true });
  return result ?? { items: [], total: 0 };
}

/** Um parceiro por ID (público). Retorna null se não existir. Nunca undefined (React Query). */
export async function getPartnerById(id: string): Promise<Partner | null> {
  const result = await api.get<Partner | null>(`/partners/${id}`, undefined, { skipAuth: true });
  return result ?? null;
}

/** Cupons ativos do parceiro (público – para exibir na página do parceiro). */
export type PartnerCouponPublic = {
  id: string;
  code: string;
  title?: string;
  description?: string;
  discountType: string;
  discountValue: number;
  validUntil?: string | null;
  active: boolean;
};

export async function getPartnerCouponsPublic(partnerId: string): Promise<PartnerCouponPublic[]> {
  return api.get<PartnerCouponPublic[]>(`/partners/${partnerId}/coupons`, undefined, { skipAuth: true });
}

/** Registra visualização da página do parceiro (analytics, público). */
export async function recordPartnerView(partnerId: string): Promise<void> {
  await api.post<{ ok: boolean }>(`/partners/${partnerId}/view`, {}, { skipAuth: true });
}

/** Registra cópia de cupom (analytics, público). */
export async function recordPartnerCouponCopy(partnerId: string, couponId: string): Promise<void> {
  await api.post<{ ok: boolean }>(`/partners/${partnerId}/coupons/${couponId}/copy`, {}, { skipAuth: true });
}

/** Registra visita vinda do marketplace (analytics, público). Chamar ao abrir a página do parceiro a partir de um item do marketplace. */
export async function recordPartnerMarketplaceVisit(
  partnerId: string,
  payload: { serviceId?: string; couponId?: string },
): Promise<void> {
  await api.post<{ ok: boolean }>(`/partners/${partnerId}/marketplace-visit`, payload, { skipAuth: true });
}

/** Serviços ativos do parceiro (público – para exibir na página do parceiro). */
export type PartnerServicePublic = {
  id: string;
  name: string;
  description?: string;
  priceDisplay?: string;
  imageUrl?: string | null;
  validUntil?: string | null;
  active: boolean;
};

export async function getPartnerServicesPublic(partnerId: string): Promise<PartnerServicePublic[]> {
  return api.get<PartnerServicePublic[]>(`/partners/${partnerId}/services`, undefined, { skipAuth: true });
}

/** Lista de pets vinculados ao parceiro (anúncios públicos). Quando autenticado, inclui matchScore. */
export type PartnerPetsPage = {
  items: Array<{
    id: string;
    name: string;
    species: string;
    age: number;
    sex: string;
    size: string;
    vaccinated: boolean;
    neutered: boolean;
    description: string;
    status: string;
    publicationStatus?: string;
    photos?: string[];
    createdAt: string;
    verified?: boolean;
    partner?: { id: string; name: string; slug: string; logoUrl?: string; isPaidPartner?: boolean };
    /** Score de match com o perfil do usuário (0–100), quando logado. */
    matchScore?: number | null;
  }>;
  nextCursor: string | null;
};

export async function getPartnerPets(
  partnerId: string,
  opts?: { cursor?: string; species?: 'BOTH' | 'DOG' | 'CAT' },
): Promise<PartnerPetsPage> {
  const params: Record<string, string> = {};
  if (opts?.cursor) params.cursor = opts.cursor;
  if (opts?.species && opts.species !== 'BOTH') params.species = opts.species;
  return api.get<PartnerPetsPage>(`/pets/by-partner/${partnerId}`, params);
}
