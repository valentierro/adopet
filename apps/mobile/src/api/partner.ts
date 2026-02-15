import { api } from './client';

export type PartnerSignupBody = {
  email: string;
  password: string;
  name: string;
  phone: string;
  username: string;
  establishmentName: string;
  personType?: 'PF' | 'CNPJ';
  cpf?: string;
  cnpj?: string;
  legalName?: string;
  tradeName?: string;
  address?: string;
  planId?: 'BASIC' | 'DESTAQUE' | 'PREMIUM';
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type SignupResponse = {
  message: string;
  requiresEmailVerification: true;
};

/** Resposta do partner-signup: tokens ou pedido de confirmação de e-mail, conforme feature flag da API. */
export type PartnerSignupResponseUnion = AuthResponse | SignupResponse;

export async function partnerSignup(body: PartnerSignupBody): Promise<PartnerSignupResponseUnion> {
  return api.post<PartnerSignupResponseUnion>('/auth/partner-signup', body, { skipAuth: true });
}

export type PartnerMe = {
  id: string;
  type: string;
  name: string;
  slug: string;
  city?: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  address?: string;
  galleryUrls?: string[];
  active: boolean;
  approvedAt?: string;
  isPaidPartner: boolean;
  subscriptionStatus?: string;
  planId?: string;
  createdAt: string;
  updatedAt: string;
};

export type UpdateMyPartnerBody = {
  name?: string;
  city?: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  address?: string;
  galleryUrls?: string[];
};

export async function getMyPartner(): Promise<PartnerMe | null> {
  return api.get<PartnerMe | null>('/me/partner');
}

export async function updateMyPartner(body: UpdateMyPartnerBody): Promise<PartnerMe> {
  return api.put<PartnerMe>('/me/partner', body);
}

export type PartnerCoupon = {
  id: string;
  partnerId: string;
  code: string;
  title?: string;
  description?: string;
  discountType: string;
  discountValue: number;
  validFrom?: string;
  validUntil?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function getMyPartnerCoupons(): Promise<PartnerCoupon[]> {
  return api.get<PartnerCoupon[]>('/me/partner/coupons');
}

export type CreatePartnerCouponBody = {
  code: string;
  title?: string;
  description?: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  validUntil?: string;
};

export async function createPartnerCoupon(body: CreatePartnerCouponBody): Promise<PartnerCoupon> {
  return api.post<PartnerCoupon>('/me/partner/coupons', body);
}

export type UpdatePartnerCouponBody = {
  code?: string;
  title?: string;
  description?: string;
  discountType?: 'PERCENT' | 'FIXED';
  discountValue?: number;
  validUntil?: string | null;
  active?: boolean;
};

export async function updatePartnerCoupon(id: string, body: UpdatePartnerCouponBody): Promise<PartnerCoupon> {
  return api.put<PartnerCoupon>(`/me/partner/coupons/${id}`, body);
}

export async function deletePartnerCoupon(id: string): Promise<{ message: string }> {
  return api.delete<{ message: string }>(`/me/partner/coupons/${id}`);
}

// --- Serviços do parceiro ---

export type PartnerService = {
  id: string;
  partnerId: string;
  name: string;
  description?: string;
  priceDisplay?: string;
  imageUrl?: string | null;
  active: boolean;
  validUntil?: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function getMyPartnerServices(): Promise<PartnerService[]> {
  return api.get<PartnerService[]>('/me/partner/services');
}

export type CreatePartnerServiceBody = {
  name: string;
  description?: string;
  priceDisplay?: string;
  validUntil?: string;
  imageUrl?: string;
};

export async function createPartnerService(body: CreatePartnerServiceBody): Promise<PartnerService> {
  return api.post<PartnerService>('/me/partner/services', body);
}

export type UpdatePartnerServiceBody = {
  name?: string;
  description?: string;
  priceDisplay?: string;
  validUntil?: string | null;
  active?: boolean;
  imageUrl?: string | null;
};

export async function updatePartnerService(id: string, body: UpdatePartnerServiceBody): Promise<PartnerService> {
  return api.put<PartnerService>(`/me/partner/services/${id}`, body);
}

export async function deletePartnerService(id: string): Promise<{ message: string }> {
  return api.delete<{ message: string }>(`/me/partner/services/${id}`);
}

export type CreateCheckoutSessionBody = {
  planId: 'BASIC' | 'DESTAQUE' | 'PREMIUM';
  successUrl: string;
  cancelUrl: string;
};

export async function createPartnerCheckoutSession(body: CreateCheckoutSessionBody): Promise<{ url: string }> {
  return api.post<{ url: string }>('/me/partner/checkout-session', body);
}

export async function createPartnerBillingPortalSession(returnUrl: string): Promise<{ url: string }> {
  return api.post<{ url: string }>('/me/partner/billing-portal', { returnUrl });
}

export type PartnerAnalytics = {
  profileViews: number;
  couponCopies: number;
  byCoupon: Array<{ couponId: string; code: string; copies: number }>;
};

export async function getPartnerAnalytics(): Promise<PartnerAnalytics> {
  return api.get<PartnerAnalytics>('/me/partner/analytics');
}
