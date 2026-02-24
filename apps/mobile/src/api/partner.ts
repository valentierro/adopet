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

/** Corpo para usuário já logado se tornar parceiro (sem email/senha/username). */
export type BecomePartnerBody = {
  establishmentName: string;
  personType?: 'PF' | 'CNPJ';
  cpf?: string;
  cnpj?: string;
  legalName?: string;
  tradeName?: string;
  address?: string;
  planId?: 'BASIC' | 'DESTAQUE' | 'PREMIUM';
};

export async function registerAsPartner(body: BecomePartnerBody): Promise<PartnerMe> {
  return api.post<PartnerMe>('/me/partner/register', body);
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
  const data = await api.get<PartnerMe | null>('/me/partner');
  return data ?? null;
}

export async function updateMyPartner(body: UpdateMyPartnerBody): Promise<PartnerMe> {
  return api.put<PartnerMe>('/me/partner', body);
}

/** Desvincula a ONG da parceria (só o admin sai; membros continuam vinculados à ONG inativa). Apenas tipo ONG. */
export async function leavePartner(): Promise<{ message: string }> {
  return api.post<{ message: string }>('/me/partner/leave');
}

/** Desvincula a ONG e remove todos os membros (todos viram usuários comuns). Apenas tipo ONG. */
export async function leavePartnerAndRemoveMembers(): Promise<{ message: string }> {
  return api.post<{ message: string }>('/me/partner/leave-and-remove-members');
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
  showOnMarketplace: boolean;
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
  showOnMarketplace?: boolean;
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
  showOnMarketplace?: boolean;
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
  showOnMarketplace: boolean;
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
  showOnMarketplace?: boolean;
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
  showOnMarketplace?: boolean;
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

export type PartnerSubscriptionDetails = {
  lastPaymentAt: string | null;
  nextBillingAt: string | null;
};

export async function getPartnerSubscriptionDetails(): Promise<PartnerSubscriptionDetails> {
  return api.get<PartnerSubscriptionDetails>('/me/partner/subscription-details');
}

export type PartnerPaymentHistoryItem = {
  paidAt: string;
  amountFormatted: string;
  status: string;
};

export type PartnerPaymentHistory = {
  items: PartnerPaymentHistoryItem[];
};

export async function getPartnerPaymentHistory(): Promise<PartnerPaymentHistory> {
  return api.get<PartnerPaymentHistory>('/me/partner/payment-history');
}

export type PartnerAnalytics = {
  profileViews: number;
  couponCopies: number;
  byCoupon: Array<{ couponId: string; code: string; copies: number }>;
  marketplaceVisits: number;
  marketplaceByService: Array<{ serviceId: string; name: string; visits: number }>;
  marketplaceByCoupon: Array<{ couponId: string; code: string; visits: number }>;
};

export async function getPartnerAnalytics(): Promise<PartnerAnalytics> {
  return api.get<PartnerAnalytics>('/me/partner/analytics');
}

export type PartnerMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role?: string | null;
  createdAt: string;
  /** true se o usuário já definiu senha (primeiro acesso feito) */
  isActive: boolean;
};

export async function getMyPartnerMembers(): Promise<PartnerMember[]> {
  return api.get<PartnerMember[]>('/me/partner/members');
}

export type PartnerMemberRole =
  | 'VOLUNTARIO'
  | 'COORDENADOR'
  | 'CUIDADOR'
  | 'RECEPCIONISTA'
  | 'VETERINARIO'
  | 'ADMINISTRATIVO'
  | 'OUTRO';

export const PARTNER_MEMBER_ROLE_LABELS: Record<PartnerMemberRole, string> = {
  VOLUNTARIO: 'Voluntário(a)',
  COORDENADOR: 'Coordenador(a)',
  CUIDADOR: 'Cuidador(a)',
  RECEPCIONISTA: 'Recepcionista',
  VETERINARIO: 'Veterinário(a)',
  ADMINISTRATIVO: 'Administrativo',
  OUTRO: 'Outro',
};

export type AddPartnerMemberBody = {
  email: string;
  name: string;
  phone?: string;
  role?: PartnerMemberRole;
};

export async function addMyPartnerMember(body: AddPartnerMemberBody): Promise<PartnerMember> {
  return api.post<PartnerMember>('/me/partner/members', body);
}

export const BULK_MEMBERS_MAX = 25;

export type BulkAddPartnerMembersResult = {
  created: number;
  errors: { row: number; message: string }[];
};

export async function bulkAddMyPartnerMembers(body: {
  members: AddPartnerMemberBody[];
}): Promise<BulkAddPartnerMembersResult> {
  return api.post<BulkAddPartnerMembersResult>('/me/partner/members/bulk', body);
}

export type UpdatePartnerMemberBody = {
  role?: PartnerMemberRole | '';
};

export async function updateMyPartnerMember(memberUserId: string, body: UpdatePartnerMemberBody): Promise<PartnerMember> {
  return api.put<PartnerMember>(`/me/partner/members/${memberUserId}`, body);
}

export async function removeMyPartnerMember(memberUserId: string): Promise<{ message: string }> {
  return api.delete<{ message: string }>(`/me/partner/members/${memberUserId}`);
}

export async function resendPartnerMemberInvite(memberUserId: string): Promise<{ message: string }> {
  return api.post<{ message: string }>(`/me/partner/members/${memberUserId}/resend-invite`);
}

export type PartnerMemberDetails = {
  profile: {
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
    tutorStats?: import('@adopet/shared').TutorStats;
    phone?: string;
  };
  pets: import('@adopet/shared').Pet[];
};

export async function getMyPartnerMemberDetails(memberUserId: string): Promise<PartnerMemberDetails> {
  return api.get<PartnerMemberDetails>(`/me/partner/members/${memberUserId}/details`);
}

// --- Parcerias em anúncios (solicitações e anúncios em parceria) ---

export type PetPartnershipRequestItem = {
  id: string;
  petId: string;
  petName: string;
  petPhotoUrl: string | null;
  requestedByName: string;
  requestedAt: string;
};

export async function getMyPartnerPetPartnershipRequests(): Promise<PetPartnershipRequestItem[]> {
  return api.get<PetPartnershipRequestItem[]>('/me/partner/pet-partnership-requests');
}

export async function confirmPetPartnershipRequest(partnershipId: string): Promise<PetPartnershipItem> {
  return api.post<PetPartnershipItem>(`/me/partner/pet-partnership-requests/${partnershipId}/confirm`);
}

export async function rejectPetPartnershipRequest(partnershipId: string): Promise<{ message: string }> {
  return api.post<{ message: string }>(`/me/partner/pet-partnership-requests/${partnershipId}/reject`);
}

export type PetPartnershipItem = {
  id: string;
  petId: string;
  petName: string;
  petPhotoUrl: string | null;
  confirmedAt: string;
  /** True quando o dono do anúncio é o admin ou um membro da ONG; o admin não vê o botão "Encerrar parceria". */
  ownerIsMemberOfPartner: boolean;
};

export async function getMyPartnerPetPartnerships(): Promise<PetPartnershipItem[]> {
  return api.get<PetPartnershipItem[]>('/me/partner/pet-partnerships');
}

export async function cancelPetPartnership(partnershipId: string): Promise<{ message: string }> {
  return api.post<{ message: string }>(`/me/partner/pet-partnerships/${partnershipId}/cancel`);
}

