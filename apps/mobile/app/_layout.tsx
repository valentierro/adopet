import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity, Alert } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { AppErrorBoundary } from '../src/components/AppErrorBoundary';
import { AppWithOfflineBanner } from '../src/components/AppWithOfflineBanner';
import { HeaderLogo } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { setAuthProvider } from '../src/api/client';
import { useAuthStore } from '../src/stores/authStore';

SplashScreen.preventAutoHideAsync();

/** Botão Voltar (volta para a tela anterior). */
function HeaderBackButton() {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={() => router.back()}
      style={{ padding: 8, marginLeft: 4 }}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
    </TouchableOpacity>
  );
}

const profileMenuHeaderOptions = {
  headerTitle: () => <HeaderLogo />,
  headerTitleAlign: 'center' as const,
  headerLeft: () => <HeaderBackButton />,
};

const isExpoGo = Constants.appOwnership === 'expo';
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN ?? '';
if (!isExpoGo && SENTRY_DSN) {
  const Sentry = require('@sentry/react-native');
  Sentry.init({
    dsn: SENTRY_DSN,
    enabled: true,
    tracesSampleRate: 0.2,
    _experiments: { profilesSampleRate: 0.1 },
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'ADOPET_QUERY_CACHE',
});

function RootLayout() {
  const router = useRouter();
  const { colors } = useTheme();
  const getAccessToken = useAuthStore((s) => s.getAccessToken);
  const refreshTokens = useAuthStore((s) => s.refreshTokens);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    setAuthProvider(getAccessToken, refreshTokens, () => {
      Alert.alert(
        'Sessão expirada',
        'Sua sessão expirou. Você será redirecionado para a tela de login.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/welcome') }],
      );
    });
  }, [getAccessToken, refreshTokens, router]);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister, maxAge: 24 * 60 * 60 * 1000 }}
    >
      <AppErrorBoundary onGoHome={() => router.replace('/(tabs)')}>
      <AppWithOfflineBanner>
      <Stack
        screenOptions={{
          headerShown: true,
          headerBackTitle: 'Voltar',
          headerStyle: { backgroundColor: colors.headerBg },
          headerTintColor: colors.textPrimary,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="profile-edit" options={{ title: 'Editar perfil', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="change-password" options={{ title: 'Alterar senha', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="tutor-profile" options={{ title: 'Perfil do anunciante' }} />
        <Stack.Screen name="owner-pets" options={{ title: 'Anúncios do tutor' }} />
        <Stack.Screen name="partner-portal" options={{ title: 'Portal do parceiro', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="partner-edit" options={{ title: 'Dados do estabelecimento' }} />
        <Stack.Screen name="partner-coupons" options={{ title: 'Cupons de desconto' }} />
        <Stack.Screen name="partner-coupon-edit" options={{ title: 'Cupom' }} />
        <Stack.Screen name="partner-services" options={{ title: 'Serviços prestados' }} />
        <Stack.Screen name="partner-service-edit" options={{ title: 'Serviço' }} />
        <Stack.Screen name="partner-analytics" options={{ title: 'Analytics' }} />
        <Stack.Screen name="partner-members" options={{ title: 'Membros da ONG', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="partner-subscription" options={{ title: 'Assinatura', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="partner-success" options={{ title: 'Pagamento concluído' }} />
        <Stack.Screen name="partner-cancel" options={{ title: 'Pagamento cancelado' }} />
        <Stack.Screen name="parceria-apresentacao" options={{ title: 'Seja parceiro' }} />
        <Stack.Screen name="solicitar-parceria" options={{ title: 'Solicitar parceria' }} />
        <Stack.Screen name="terms" options={{ title: 'Termos de Uso', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="privacy" options={{ title: 'Política de Privacidade', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="bug-report-suggestion" options={{ title: 'Bug report / Sugestões', ...profileMenuHeaderOptions }} />
      </Stack>
      </AppWithOfflineBanner>
      </AppErrorBoundary>
    </PersistQueryClientProvider>
  );
}

export default isExpoGo ? RootLayout : require('@sentry/react-native').wrap(RootLayout);
