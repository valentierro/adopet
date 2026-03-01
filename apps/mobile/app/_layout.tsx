import { useEffect, useRef, useCallback } from 'react';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity, AppState, Alert, Modal, Pressable, Text, Platform, type AppStateStatus } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryClient } from '../src/queryClient';
import * as SplashScreen from 'expo-splash-screen';
import { AppErrorBoundary } from '../src/components/AppErrorBoundary';
import { AppWithOfflineBanner } from '../src/components/AppWithOfflineBanner';
import { HeaderLogo, UpdateAvailableModal } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { useModalMaxWidth } from '../src/hooks/useResponsiveGridColumns';
import { useAppVersionCheck } from '../src/hooks/useAppVersionCheck';
import { setAuthProvider, setOnFeatureDisabled } from '../src/api/client';
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
const useSentry = !isExpoGo && !!SENTRY_DSN;
if (useSentry) {
  try {
    const Sentry = require('@sentry/react-native');
    Sentry.init({
      dsn: SENTRY_DSN,
      enabled: true,
      tracesSampleRate: 0.2,
      _experiments: { profilesSampleRate: 0.1 },
    });
  } catch (_) {
    // Sentry pode falhar no iOS se não estiver buildado corretamente
  }
}

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'ADOPET_QUERY_CACHE',
});

function RootLayout() {
  const router = useRouter();
  const { colors } = useTheme();
  const getAccessToken = useAuthStore((s) => s.getAccessToken);
  const refreshTokens = useAuthStore((s) => s.refreshTokens);
  const logout = useAuthStore((s) => s.logout);
  const markActivity = useAuthStore((s) => s.markActivity);
  const isInactivityExpired = useAuthStore((s) => s.isInactivityExpired);
  const accessToken = useAuthStore((s) => s.accessToken);
  const userId = useAuthStore((s) => s.user?.id);
  const sessionExpiredModalVisible = useAuthStore((s) => s.sessionExpiredModalVisible);
  const setSessionExpiredModalVisible = useAuthStore((s) => s.setSessionExpiredModalVisible);
  const sessionExpiredShownRef = useRef(false);
  const {
    forceUpdate,
    optionalUpdate,
    currentVersion,
    latestVersion,
    optionalShownThisSession,
  } = useAppVersionCheck();
  const showUpdateModal = !!userId && (forceUpdate || optionalUpdate);
  const modalMaxWidth = useModalMaxWidth();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (accessToken) sessionExpiredShownRef.current = false;
    setAuthProvider(
      getAccessToken,
      refreshTokens,
      () => {
        if (sessionExpiredShownRef.current) return;
        if (!useAuthStore.getState().accessToken) return; // usuário deslogou; não mostrar "sessão expirada"
        sessionExpiredShownRef.current = true;
        useAuthStore.getState().setSessionExpiredModalVisible(true);
      },
      {
        shouldSkipRefreshForInactivity: isInactivityExpired,
        onInactivityExpire: () => logout(),
        markActivity,
      },
    );
  }, [getAccessToken, refreshTokens, logout, markActivity, isInactivityExpired, accessToken]);

  // Modal "Sessão expirada": exibir quando a sessão expirar e redirecionar ao fechar
  // Usa Modal na web (Alert.alert não funciona em react-native-web); Alert no native
  const handleSessionExpiredClose = useCallback(() => {
    setSessionExpiredModalVisible(false);
    router.replace('/(tabs)/feed');
  }, [setSessionExpiredModalVisible, router]);
  useEffect(() => {
    if (!sessionExpiredModalVisible) return;
    // Na web usa Modal (renderizado abaixo); no native usa Alert
    if (Platform.OS !== 'web') {
      Alert.alert(
        'Sessão expirada',
        'Sua sessão expirou por inatividade. Faça login novamente para continuar.',
        [{ text: 'OK', onPress: handleSessionExpiredClose }],
        { cancelable: false }
      );
    }
  }, [sessionExpiredModalVisible, handleSessionExpiredClose]);

  useEffect(() => {
    setOnFeatureDisabled(() => {
      Alert.alert('Recurso em breve', 'Este recurso estará disponível em breve.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    });
    return () => setOnFeatureDisabled(null);
  }, [router]);

  // Renovar token ao voltar ao app e a cada 5 min em foreground (access token dura 15 min; refresh antecipado evita expirar durante uso)
  // Não renova se inativo há 15+ min (deixa a próxima requisição acionar o fluxo de sessão expirada)
  const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 min
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const refreshIfLoggedIn = () => {
      if (getAccessToken() && !isInactivityExpired()) refreshTokens().catch(() => {});
    };
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        refreshIfLoggedIn();
        intervalId = setInterval(refreshIfLoggedIn, REFRESH_INTERVAL_MS);
      } else {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    });
    if (AppState.currentState === 'active') {
      refreshIfLoggedIn();
      intervalId = setInterval(refreshIfLoggedIn, REFRESH_INTERVAL_MS);
    }
    return () => {
      subscription.remove();
      if (intervalId) clearInterval(intervalId);
    };
  }, [getAccessToken, refreshTokens, isInactivityExpired]);

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
        <Stack.Screen name="notifications" options={{ title: 'Notificações', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="tutor-profile" options={{ title: 'Perfil do anunciante' }} />
        <Stack.Screen name="user-unavailable" options={{ title: 'Usuário não disponível', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="owner-pets" options={{ title: 'Anúncios do tutor', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="partner-pets" options={{ title: 'Anúncios vinculados', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="partner-my-pets" options={{ title: 'Anúncios da ONG', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="partner-ong-adoptions" options={{ title: 'Adoções pela ONG', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="feature-disabled" options={{ title: 'Em breve', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="partner-portal" options={{ title: 'Portal do parceiro', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="partner-edit" options={{ title: 'Dados do estabelecimento', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="partner-coupons" options={{ title: 'Cupons de desconto' }} />
        <Stack.Screen name="partner-coupon-edit" options={{ title: 'Cupom' }} />
        <Stack.Screen name="partner-services" options={{ title: 'Serviços prestados' }} />
        <Stack.Screen name="partner-service-edit" options={{ title: 'Serviço' }} />
        <Stack.Screen name="partner-analytics" options={{ title: 'Analytics' }} />
        <Stack.Screen name="partner-members" options={{ title: 'Membros da ONG', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="partner-adoption-forms" options={{ title: 'Formulários de adoção', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="partner-adoption-form-intro" options={{ title: 'Novo formulário', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="partner-adoption-form-edit" options={{ title: 'Formulário de adoção', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="partner-adoption-requests" options={{ title: 'Solicitações de adoção', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="partner-members-bulk" options={{ title: 'Importar membros em lote', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="partner-member-profile" options={{ title: 'Perfil do membro' }} />
        <Stack.Screen name="partner-subscription" options={{ title: 'Assinatura', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="partner-success" options={{ title: 'Pagamento concluído' }} />
        <Stack.Screen name="partner-cancel" options={{ title: 'Pagamento cancelado' }} />
        <Stack.Screen name="parceria-apresentacao" options={{ title: 'Seja parceiro' }} />
        <Stack.Screen name="solicitar-parceria" options={{ title: 'Solicitar parceria' }} />
        <Stack.Screen name="terms" options={{ title: 'Termos de Uso', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="privacy" options={{ title: 'Política de Privacidade', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="bug-report-suggestion" options={{ title: 'Bug report / Sugestões', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="kyc" options={{ title: 'Solicitar verificação (KYC)', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="my-adoption-requests" options={{ title: 'Minhas solicitações', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="adoption-form-fill/[requestId]" options={{ title: 'Formulário de adoção', ...profileMenuHeaderOptions }} />
        <Stack.Screen name="survey" options={{ title: 'Pesquisa de satisfação', ...profileMenuHeaderOptions }} />
      </Stack>
      <UpdateAvailableModal
        visible={showUpdateModal}
        forceUpdate={forceUpdate}
        currentVersion={currentVersion}
        latestVersion={latestVersion}
        onUpdate={() => {}}
        onDismiss={() => optionalShownThisSession()}
      />
      {Platform.OS === 'web' && sessionExpiredModalVisible && (
        <Modal visible transparent animationType="fade">
          <Pressable
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 24 }}
            onPress={handleSessionExpiredClose}
          >
            <Pressable
              style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 24, maxWidth: modalMaxWidth, width: '100%' }}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 }}>
                Sessão expirada
              </Text>
              <Text style={{ fontSize: 15, lineHeight: 22, color: colors.textSecondary, marginBottom: 24 }}>
                Sua sessão expirou por inatividade. Faça login novamente para continuar.
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center' }}
                onPress={handleSessionExpiredClose}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>OK</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      )}
      </AppWithOfflineBanner>
      </AppErrorBoundary>
    </PersistQueryClientProvider>
  );
}

export default useSentry
  ? (() => {
      try {
        return require('@sentry/react-native').wrap(RootLayout);
      } catch {
        return RootLayout;
      }
    })()
  : RootLayout;
