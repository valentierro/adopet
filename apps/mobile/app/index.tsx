import { useEffect, useRef, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { getOnboardingSeen, consumeShouldShowOnboardingAfterSignup, consumeShouldShowOnboardingAfterSignupAsync } from '../src/storage/onboarding';
import { getMe } from '../src/api/me';

export default function IndexScreen() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const userId = useAuthStore((s) => s.user?.id);
  const hydrate = useAuthStore((s) => s.hydrate);
  const refreshTokens = useAuthStore((s) => s.refreshTokens);
  const logout = useAuthStore((s) => s.logout);
  const setUser = useAuthStore((s) => s.setUser);
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);
  const [tokenValidated, setTokenValidated] = useState(false);
  const didForceOnboardingRef = useRef(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Consumir flag "mostrar onboarding pós-signup" (memória + storage) assim que tiver token,
  // para garantir que o tour apareça mesmo após reload ou navegação.
  useEffect(() => {
    if (!isHydrated || !accessToken) return;
    const fromMemory = consumeShouldShowOnboardingAfterSignup();
    if (fromMemory) {
      didForceOnboardingRef.current = true;
      setOnboardingSeen(false);
      return;
    }
    let cancelled = false;
    consumeShouldShowOnboardingAfterSignupAsync().then((show) => {
      if (!cancelled && show) {
        didForceOnboardingRef.current = true;
        setOnboardingSeen(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isHydrated, accessToken]);

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
        if (ok === true) {
          try {
            const me = await getMe();
            if (!cancelled) setUser(me);
          } catch {
            if (!cancelled) await logout();
          }
          if (!cancelled) setTokenValidated(true);
        } else if (ok === 'network') {
          if (!cancelled) {
            await logout();
            setTokenValidated(true);
          }
        } else {
          await logout();
          if (!cancelled) setTokenValidated(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isHydrated, accessToken, refreshTokens, logout, setUser]);

  // Fallback: se onboardingSeen ainda for null (ex.: flag pós-signup não foi consumida), buscar no storage
  useEffect(() => {
    if (!isHydrated || !accessToken || !tokenValidated || !userId) return;
    if (didForceOnboardingRef.current) return;
    let cancelled = false;
    getOnboardingSeen(userId).then((seen) => {
      if (!cancelled) setOnboardingSeen(seen);
    });
    return () => {
      cancelled = true;
    };
  }, [isHydrated, accessToken, tokenValidated, userId]);

  if (!isHydrated) {
    return null;
  }

  if (!accessToken) {
    return <Redirect href="/(tabs)/feed" />;
  }

  if (accessToken && !tokenValidated) {
    return null;
  }

  if (onboardingSeen === null) {
    return null;
  }

  if (!onboardingSeen && userId) {
    return <Redirect href="/(onboarding)" />;
  }

  return <Redirect href="/(tabs)" />;
}
