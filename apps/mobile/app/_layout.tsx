import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { AppErrorBoundary } from '../src/components/AppErrorBoundary';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 2 * 60 * 1000 } },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'ADOPET_QUERY_CACHE',
});

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister, maxAge: 24 * 60 * 60 * 1000 }}
    >
      <AppErrorBoundary>
      <Stack
        screenOptions={{
          headerShown: true,
          headerBackTitle: 'Voltar',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="profile-edit" options={{ title: 'Editar perfil' }} />
        <Stack.Screen name="tutor-profile" options={{ title: 'Perfil do anunciante' }} />
        <Stack.Screen name="partner-portal" options={{ title: 'Portal do parceiro' }} />
        <Stack.Screen name="partner-edit" options={{ title: 'Dados do estabelecimento' }} />
        <Stack.Screen name="partner-coupons" options={{ title: 'Cupons de desconto' }} />
        <Stack.Screen name="partner-coupon-edit" options={{ title: 'Cupom' }} />
        <Stack.Screen name="partner-services" options={{ title: 'Serviços prestados' }} />
        <Stack.Screen name="partner-service-edit" options={{ title: 'Serviço' }} />
        <Stack.Screen name="partner-analytics" options={{ title: 'Analytics' }} />
        <Stack.Screen name="partner-subscription" options={{ title: 'Assinatura' }} />
        <Stack.Screen name="partner-success" options={{ title: 'Pagamento concluído' }} />
        <Stack.Screen name="partner-cancel" options={{ title: 'Pagamento cancelado' }} />
        <Stack.Screen name="parceria-apresentacao" options={{ title: 'Seja parceiro' }} />
        <Stack.Screen name="solicitar-parceria" options={{ title: 'Solicitar parceria' }} />
        <Stack.Screen name="terms" options={{ title: 'Termos de Uso' }} />
        <Stack.Screen name="privacy" options={{ title: 'Política de Privacidade' }} />
      </Stack>
      </AppErrorBoundary>
    </PersistQueryClientProvider>
  );
}
