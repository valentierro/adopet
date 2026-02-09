import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';

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
        <Stack.Screen name="terms" options={{ title: 'Termos de Uso' }} />
        <Stack.Screen name="privacy" options={{ title: 'Política de Privacidade' }} />
      </Stack>
    </PersistQueryClientProvider>
  );
}
