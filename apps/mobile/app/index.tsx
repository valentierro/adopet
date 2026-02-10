import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { setAuthProvider } from '../src/api/client';
import { getOnboardingSeen } from '../src/storage/onboarding';
import { getMe } from '../src/api/me';

export default function IndexScreen() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrate = useAuthStore((s) => s.hydrate);
  const getAccessToken = useAuthStore((s) => s.getAccessToken);
  const refreshTokens = useAuthStore((s) => s.refreshTokens);
  const logout = useAuthStore((s) => s.logout);
  const setUser = useAuthStore((s) => s.setUser);
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);
  const [tokenValidated, setTokenValidated] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    setAuthProvider(getAccessToken, refreshTokens);
  }, [getAccessToken, refreshTokens]);

  // Validar token ao abrir o app: evita ficar "logado" com token expirado em cache
  useEffect(() => {
    if (!isHydrated || !accessToken) {
      if (!accessToken) setTokenValidated(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const me = await getMe();
        if (!cancelled) {
          setUser(me);
          setTokenValidated(true);
        }
      } catch (err) {
        const isUnauthorized = err instanceof Error && err.message.includes('401');
        if (!isUnauthorized) {
          // Erro de servidor (500 etc.): não deslogar; deixa o app abrir e a tela inicial pode tentar de novo
          if (!cancelled) {
            setUser(null);
            setTokenValidated(true);
          }
          return;
        }
        const ok = await refreshTokens();
        if (cancelled) return;
        if (!ok) {
          await logout();
          setTokenValidated(true);
        } else {
          try {
            const me = await getMe();
            if (!cancelled) setUser(me);
          } catch {
            await logout();
          }
          setTokenValidated(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isHydrated, accessToken, refreshTokens, logout, setUser]);

  useEffect(() => {
    if (!isHydrated || !accessToken || !tokenValidated) return;
    getOnboardingSeen().then(setOnboardingSeen);
  }, [isHydrated, accessToken, tokenValidated]);

  if (!isHydrated) {
    return null;
  }

  if (!accessToken) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (accessToken && !tokenValidated) {
    return null;
  }

  if (onboardingSeen === null) {
    return null;
  }

  if (!onboardingSeen) {
    return <Redirect href="/(onboarding)" />;
  }

  return <Redirect href="/(tabs)" />;
}
