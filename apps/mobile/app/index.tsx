import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { setAuthProvider } from '../src/api/client';
import { getOnboardingSeen } from '../src/storage/onboarding';

export default function IndexScreen() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrate = useAuthStore((s) => s.hydrate);
  const getAccessToken = useAuthStore((s) => s.getAccessToken);
  const refreshTokens = useAuthStore((s) => s.refreshTokens);
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    setAuthProvider(getAccessToken, refreshTokens);
  }, [getAccessToken, refreshTokens]);

  useEffect(() => {
    if (!isHydrated || !accessToken) return;
    getOnboardingSeen().then(setOnboardingSeen);
  }, [isHydrated, accessToken]);

  if (!isHydrated) {
    return null;
  }

  if (!accessToken) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (onboardingSeen === null) {
    return null;
  }

  if (!onboardingSeen) {
    return <Redirect href="/(onboarding)" />;
  }

  return <Redirect href="/(tabs)" />;
}
