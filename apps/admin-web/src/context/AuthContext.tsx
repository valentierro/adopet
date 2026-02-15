import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setTokenGetter } from '@/api/client';
import { login as apiLogin, logout as apiLogout, AuthResponse } from '@/api/auth';
import { getMe, MeResponse } from '@/api/me';

const TOKEN_KEY = 'adopet_admin_token';
const REFRESH_KEY = 'adopet_admin_refresh';

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export type AuthState = {
  user: MeResponse | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    setTokenGetter(() => getStoredToken());
    try {
      const me = await getMe();
      if (!me.isAdmin) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        setUser(null);
        setError('Acesso negado. Apenas administradores podem acessar o painel.');
        return;
      }
      setUser(me);
      setError(null);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setTokenGetter(() => getStoredToken());
    loadUser();
  }, [loadUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null);
      const res: AuthResponse = await apiLogin(email, password);
      localStorage.setItem(TOKEN_KEY, res.accessToken);
      if (res.refreshToken) localStorage.setItem(REFRESH_KEY, res.refreshToken);
      setTokenGetter(() => getStoredToken());
      const me = await getMe();
      if (!me.isAdmin) {
        await apiLogout(res.refreshToken ?? '');
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        setError('Acesso negado. Este usuário não é administrador.');
        return;
      }
      setUser(me);
    },
    []
  );

  const logout = useCallback(async () => {
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (refresh) await apiLogout(refresh);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setUser(null);
    setError(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAdmin: !!user?.isAdmin,
      loading,
      error,
      login,
      logout,
      clearError: () => setError(null),
    }),
    [user, loading, error, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
