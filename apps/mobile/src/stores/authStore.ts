import { create } from 'zustand';
import * as authApi from '../api/auth';
import * as partnerApi from '../api/partner';
import { getMe } from '../api/me';
import {
  getStoredAccessToken,
  getStoredRefreshToken,
  setStoredTokens,
  clearStoredTokens,
} from '../storage/tokens';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryClient } from '../queryClient';

const QUERY_CACHE_KEY = 'ADOPET_QUERY_CACHE';
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos

export type User = {
  id: string;
  email: string;
  name: string;
  username?: string;
  avatarUrl?: string;
  phone?: string;
  createdAt: string;
  city?: string;
  bio?: string;
  housingType?: string;
  hasYard?: boolean;
  hasOtherPets?: boolean;
  hasChildren?: boolean;
  timeAtHome?: string;
  petsAllowedAtHome?: string;
  dogExperience?: string;
  catExperience?: string;
  householdAgreesToAdoption?: string;
  whyAdopt?: string;
  activityLevel?: string;
  preferredPetAge?: string;
  commitsToVetCare?: string;
  walkFrequency?: string;
  monthlyBudgetForPet?: string;
  verified?: boolean;
  isAdmin?: boolean;
  partner?: {
    id: string;
    name: string;
    slug: string;
    type?: string; // ONG | CLINIC | STORE
    city?: string;
    subscriptionStatus?: string;
    planId?: string;
    isPaidPartner: boolean;
  };
  partnerMemberships?: Array<{ partnerId: string; partnerName: string; partnerSlug: string }>;
  /** Parceiro (dono de ONG/estabelecimento ou membro); isento de KYC para adoção */
  isPartner?: boolean;
  /** KYC: null = nunca enviou, PENDING = em análise, VERIFIED = aprovado, REJECTED = rejeitado */
  kycStatus?: string | null;
  kycSubmittedAt?: string | null;
  kycVerifiedAt?: string | null;
  kycRejectedAt?: string | null;
  kycRejectionReason?: string | null;
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isLoading: boolean;
  isHydrated: boolean;
  /** Flag para o feed exibir toast "Você saiu da sua conta" após logout (limpa após exibir). */
  showLogoutToast: boolean;
  /** Exibir modal "Sessão expirada" antes de redirecionar para tela de convidado (apenas quando expira por inatividade). */
  sessionExpiredModalVisible: boolean;
  /** Última atividade (timestamp) para expiração por inatividade de 15 min */
  lastActivityAt: number;
  setTokens: (access: string, refresh: string) => void;
  markActivity: () => void;
  isInactivityExpired: () => boolean;
  setUser: (user: User | null) => void;
  setShowLogoutToast: (value: boolean) => void;
  setSessionExpiredModalVisible: (value: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, phone: string, username: string) => Promise<void>;
  partnerSignup: (body: partnerApi.PartnerSignupBody) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean | 'network'>;
  hydrate: () => Promise<void>;
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isLoading: false,
  isHydrated: false,
  showLogoutToast: false,
  sessionExpiredModalVisible: false,
  lastActivityAt: 0,

  setTokens: (access: string, refresh: string) => {
    set({ accessToken: access, refreshToken: refresh, lastActivityAt: Date.now() });
    setStoredTokens(access, refresh);
  },

  markActivity: () => set({ lastActivityAt: Date.now() }),
  isInactivityExpired: () => {
    const last = get().lastActivityAt;
    if (!last) return false;
    return Date.now() - last > INACTIVITY_TIMEOUT_MS;
  },

  setUser: (user: User | null) => set({ user }),

  setShowLogoutToast: (value: boolean) => set({ showLogoutToast: value }),
  setSessionExpiredModalVisible: (value: boolean) => set({ sessionExpiredModalVisible: value }),

  login: async (email: string, password: string) => {
    set({ isLoading: true, user: null });
    try {
      const res = await authApi.login({
        email: email.trim().toLowerCase(),
        password: typeof password === 'string' ? password.trim() : password,
      });
      set({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        lastActivityAt: Date.now(),
        isLoading: false,
      });
      await setStoredTokens(res.accessToken, res.refreshToken);
      // Aguarda um tick para o setAuthProvider do layout ser atualizado (evita 401 em getMe/requisições seguintes)
      await new Promise((r) => setTimeout(r, 0));
      try {
        const me = await getMe();
        set({ user: me });
      } catch {
        set({ user: null });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  signup: async (email: string, password: string, name: string, phone: string, document: string, username: string) => {
    set({ isLoading: true, user: null });
    try {
      const usernameNorm = username.trim().toLowerCase().replace(/^@/, '');
      const documentDigits = String(document).replace(/\D/g, '').slice(0, 14);
      const res = await authApi.signup({ email, password, name, phone, document: documentDigits, username: usernameNorm });
      set({ isLoading: false });
      if ('accessToken' in res) {
        try {
          set({ accessToken: res.accessToken, refreshToken: res.refreshToken, lastActivityAt: Date.now() });
          await setStoredTokens(res.accessToken, res.refreshToken);
          await new Promise((r) => setTimeout(r, 0));
          const me = await getMe();
          set({ user: me });
        } catch {
          set({ user: null });
        }
      }
      return res;
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  partnerSignup: async (body: partnerApi.PartnerSignupBody) => {
    set({ isLoading: true, user: null });
    try {
      const usernameNorm = body.username.trim().toLowerCase().replace(/^@/, '');
      const res = await partnerApi.partnerSignup({
        ...body,
        username: usernameNorm,
      });
      set({ isLoading: false });
      if ('accessToken' in res) {
        set({ accessToken: res.accessToken, refreshToken: res.refreshToken, lastActivityAt: Date.now() });
        await setStoredTokens(res.accessToken, res.refreshToken);
        await new Promise((r) => setTimeout(r, 0));
        try {
          const me = await getMe();
          set({ user: me });
        } catch {
          set({ user: null });
        }
      }
      return res;
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  logout: async () => {
    const refreshToken = get().refreshToken;
    // Limpar state primeiro para UI refletir logout imediatamente (evita crash em race conditions)
    set({ accessToken: null, refreshToken: null, user: null, sessionExpiredModalVisible: false });
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {}
    }
    try {
      await clearStoredTokens();
    } catch {
      // clearStoredTokens já engole erros; fallback extra
    }
    // Limpar cache do React Query para evitar dados do usuário anterior ao reabrir o app
    try {
      queryClient.clear();
      await AsyncStorage.removeItem(QUERY_CACHE_KEY);
    } catch {
      // ignora falha ao limpar cache
    }
  },

  /** Retorna true se renovou; false se falhou por token inválido/expirado (fez logout); 'network' se falhou por rede (não desloga). */
  refreshTokens: async (): Promise<boolean | 'network'> => {
    const refreshToken = get().refreshToken ?? (await getStoredRefreshToken());
    if (!refreshToken) return false;
    try {
      const res = await authApi.refresh(refreshToken);
      get().setTokens(res.accessToken, res.refreshToken);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isNetworkError = /timeout|failed to fetch|network request failed|network error|could not connect|econnrefused|enotfound/i.test(msg);
      if (isNetworkError) return 'network';
      await get().logout();
      return false;
    }
  },

  hydrate: async () => {
    try {
      const access = await getStoredAccessToken();
      const refresh = await getStoredRefreshToken();
      set({
        accessToken: access,
        refreshToken: refresh,
        lastActivityAt: access ? Date.now() : 0,
        isHydrated: true,
      });
    } catch {
      set({ accessToken: null, refreshToken: null, lastActivityAt: 0, isHydrated: true });
    }
  },

  getAccessToken: () => get().accessToken,
  getRefreshToken: () => get().refreshToken ?? null,
}));
