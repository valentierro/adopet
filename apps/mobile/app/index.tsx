import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { getOnboardingSeen, consumeShouldShowOnboardingAfterSignup, consumeShouldShowOnboardingAfterSignupAsync } from '../src/storage/onboarding';
import { getMe } from '../src/api/me';
import { LoadingLogo } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';

const HYDRATE_TIMEOUT_MS = 5000;

export default function IndexScreen() {
  const { colors } = useTheme();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const userId = useAuthStore((s) => s.user?.id);
  const hydrate = useAuthStore((s) => s.hydrate);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);
  const [tokenValidated, setTokenValidated] = useState(false);
  const didForceOnboardingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (!cancelled) useAuthStore.setState({ isHydrated: true });
    }, HYDRATE_TIMEOUT_MS);
    hydrate().catch(() => {
      if (!cancelled) useAuthStore.setState({ isHydrated: true });
    });
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
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
        // 401: o client.ts já tentou refresh.
        // Se accessToken for null, o client fez logout (sessão expirada) e onSessionExpired foi chamado — não chamar logout de novo (esconderia o modal).
        // Se accessToken não for null, foi erro de rede ('network'); o client não deslogou — deslogar para consistência.
        if (!cancelled) {
          if (useAuthStore.getState().accessToken) await logout();
          setTokenValidated(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isHydrated, accessToken, setUser, logout]);

  // Fallback: se onboardingSeen ainda for null (ex.: flag pós-signup não foi consumida), buscar no storage
  useEffect(() => {
    if (!isHydrated || !accessToken || !tokenValidated || !userId) return;
    if (didForceOnboardingRef.current) return;
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      // timeout: SecureStore pode travar no iOS; assume não visto para garantir tour no primeiro acesso
      if (!cancelled) setOnboardingSeen(false);
    }, 5000);
    getOnboardingSeen(userId).then((seen) => {
      if (!cancelled) setOnboardingSeen(seen);
    });
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [isHydrated, accessToken, tokenValidated, userId]);

  const loadingContent = (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <LoadingLogo size={140} />
    </View>
  );

  if (!isHydrated) {
    return loadingContent;
  }

  if (!accessToken) {
    return <Redirect href="/(tabs)/feed" />;
  }

  if (accessToken && !tokenValidated) {
    return loadingContent;
  }

  if (onboardingSeen === null) {
    return loadingContent;
  }

  if (!onboardingSeen && userId) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(tabs)" />;
}
