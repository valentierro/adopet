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

export async function getPartners(type?: 'ONG' | 'CLINIC' | 'STORE'): Promise<Partner[]> {
  const params: Record<string, string> = {};
  if (type) params.type = type;
  return api.get<Partner[]>('/partners', params);
}

/** Um parceiro por ID (público). */
export async function getPartnerById(id: string): Promise<Partner | null> {
  return api.get<Partner | null>(`/partners/${id}`, undefined, { skipAuth: true });
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
