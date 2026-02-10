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
  verified?: boolean;
  isAdmin?: boolean;
  partner?: {
    id: string;
    name: string;
    slug: string;
    subscriptionStatus?: string;
    planId?: string;
    isPaidPartner: boolean;
  };
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isLoading: boolean;
  isHydrated: boolean;
  setTokens: (access: string, refresh: string) => void;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, phone: string, username: string) => Promise<void>;
  partnerSignup: (body: partnerApi.PartnerSignupBody) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
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

  setTokens: (access: string, refresh: string) => {
    set({ accessToken: access, refreshToken: refresh });
    setStoredTokens(access, refresh);
  },

  setUser: (user: User | null) => set({ user }),

  login: async (email: string, password: string) => {
    set({ isLoading: true, user: null });
    try {
      const res = await authApi.login({ email, password });
      set({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        isLoading: false,
      });
      await setStoredTokens(res.accessToken, res.refreshToken);
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

  signup: async (email: string, password: string, name: string, phone: string, username: string) => {
    set({ isLoading: true, user: null });
    try {
      const usernameNorm = username.trim().toLowerCase().replace(/^@/, '');
      const res = await authApi.signup({ email, password, name, phone, username: usernameNorm });
      set({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        isLoading: false,
      });
      await setStoredTokens(res.accessToken, res.refreshToken);
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

  partnerSignup: async (body: partnerApi.PartnerSignupBody) => {
    set({ isLoading: true, user: null });
    try {
      const usernameNorm = body.username.trim().toLowerCase().replace(/^@/, '');
      const res = await partnerApi.partnerSignup({
        ...body,
        username: usernameNorm,
      });
      set({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        isLoading: false,
      });
      await setStoredTokens(res.accessToken, res.refreshToken);
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

  logout: async () => {
    const { refreshToken } = get();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {}
    }
    await clearStoredTokens();
    set({ accessToken: null, refreshToken: null, user: null });
  },

  refreshTokens: async (): Promise<boolean> => {
    const refreshToken = get().refreshToken ?? (await getStoredRefreshToken());
    if (!refreshToken) return false;
    try {
      const res = await authApi.refresh(refreshToken);
      get().setTokens(res.accessToken, res.refreshToken);
      return true;
    } catch {
      await get().logout();
      return false;
    }
  },

  hydrate: async () => {
    const access = await getStoredAccessToken();
    const refresh = await getStoredRefreshToken();
    set({
      accessToken: access,
      refreshToken: refresh,
      isHydrated: true,
    });
  },

  getAccessToken: () => get().accessToken,
  getRefreshToken: () => get().refreshToken ?? null,
}));
