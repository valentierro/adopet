import { useEffect, useRef, useCallback, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import {
  TouchableOpacity,
  AppState,
  Alert,
  Modal,
  Pressable,
  Text,
  Platform,
  Image,
  Dimensions,
  StyleSheet,
  Animated,
  Appearance,
  type AppStateStatus,
} from 'react-native';
import { useThemeStore } from '../src/stores/themeStore';
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

/** Header padronizado: seta voltar + logo Adopet centralizado. Título da página fica no início do conteúdo. */
const stackHeaderOptions = {
  headerLeft: () => <HeaderBackButton />,
  headerTitle: () => <HeaderLogo />,
  headerTitleAlign: 'center' as const,
};

const isExpoGo = Constants.appOwnership === 'expo';

const SplashImage = require('../assets/brand/splash/splash_full.png');
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
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

  // Tela fake de splash (apenas no Expo Go) para visualizar a arte em tela cheia
  const [showFakeSplash, setShowFakeSplash] = useState(isExpoGo);
  const fakeSplashOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 380);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const setColorSchemeNative =
      typeof (Appearance as { setColorScheme?: (s: 'light' | 'dark' | null) => void }).setColorScheme === 'function'
        ? (Appearance as { setColorScheme: (s: 'light' | 'dark' | null) => void }).setColorScheme
        : null;
    useThemeStore.getState().hydrate().then(() => {
      const scheme = useThemeStore.getState().preference;
      if (scheme && setColorSchemeNative) setColorSchemeNative(scheme);
    });
  }, []);

  useEffect(() => {
    if (!isExpoGo || !showFakeSplash) return;
    const timer = setTimeout(() => {
      Animated.timing(fakeSplashOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => setShowFakeSplash(false));
    }, 2200);
    return () => clearTimeout(timer);
  }, [isExpoGo, showFakeSplash, fakeSplashOpacity]);

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
  // Faz logout ao confirmar (refreshTokens não chama logout para permitir exibir o modal antes)
  const handleSessionExpiredClose = useCallback(async () => {
    setSessionExpiredModalVisible(false);
    await logout();
    router.replace('/(tabs)/feed');
  }, [setSessionExpiredModalVisible, logout, router]);
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
      {showFakeSplash && (
        <Modal visible transparent animationType="none" statusBarTranslucent>
          <Animated.View style={[styles.fakeSplashContainer, { opacity: fakeSplashOpacity }]}>
            <Image
              source={SplashImage}
              style={styles.fakeSplashImage}
              resizeMode="cover"
            />
          </Animated.View>
        </Modal>
      )}
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
        <Stack.Screen name="profile-edit" options={{ title: 'Editar perfil', ...stackHeaderOptions }} />
        <Stack.Screen name="change-password" options={{ title: 'Alterar senha', ...stackHeaderOptions }} />
        <Stack.Screen name="notifications" options={{ title: 'Notificações', ...stackHeaderOptions }} />
        <Stack.Screen name="tutor-profile" options={{ title: 'Perfil do anunciante', ...stackHeaderOptions }} />
        <Stack.Screen name="user-unavailable" options={{ title: 'Usuário não disponível', ...stackHeaderOptions }} />
        <Stack.Screen name="owner-pets" options={{ title: 'Anúncios do tutor', ...stackHeaderOptions }} />
        <Stack.Screen name="partner-pets" options={{ title: 'Anúncios vinculados', ...stackHeaderOptions }} />
        <Stack.Screen name="partner-my-pets" options={{ title: 'Anúncios da ONG', ...stackHeaderOptions }} />
        <Stack.Screen name="partner-ong-adoptions" options={{ title: 'Adoções pela ONG', ...stackHeaderOptions }} />
        <Stack.Screen name="feature-disabled" options={{ title: 'Em breve', ...stackHeaderOptions }} />
        <Stack.Screen name="partner-portal" options={{ title: 'Portal do parceiro', ...stackHeaderOptions }} />
        <Stack.Screen name="partner-edit" options={{ title: 'Dados do estabelecimento', ...stackHeaderOptions }} />
        <Stack.Screen name="partner-coupons" options={{ title: 'Cupons de desconto', ...stackHeaderOptions }} />
        <Stack.Screen name="partner-coupon-edit" options={{ title: 'Cupom', ...stackHeaderOptions }} />
        <Stack.Screen name="partner-services" options={{ title: 'Serviços prestados', ...stackHeaderOptions }} />
        <Stack.Screen name="partner-service-edit" options={{ title: 'Serviço', ...stackHeaderOptions }} />
        <Stack.Screen name="partner-analytics" options={{ title: 'Analytics', ...stackHeaderOptions }} />
        <Stack.Screen name="partner-members" options={{ title: 'Membros da ONG', ...stackHeaderOptions }} />
        <Stack.Screen name="partner-adoption-forms" options={{ title: 'Formulários de adoção', ...stackHeaderOptions }} />
        <Stack.Screen name="partner-adoption-form-intro" options={{ title: 'Novo formulário', ...stackHeaderOptions }} />
        <Stack.Screen name="partner-adoption-form-edit" options={{ title: 'Formulário de adoção', ...stackHeaderOptions }} />
        <Stack.Screen name="partner-adoption-requests" options={{ title: 'Solicitações de adoção', ...stackHeaderOptions }} />
        <Stack.Screen name="partner-members-bulk" options={{ title: 'Importar membros em lote', ...stackHeaderOptions }} />
        <Stack.Screen name="partner-member-profile" options={{ title: 'Perfil do membro', ...stackHeaderOptions }} />
        <Stack.Screen name="partner-subscription" options={{ title: 'Assinatura', ...stackHeaderOptions }} />
        <Stack.Screen name="partner-success" options={{ title: 'Pagamento concluído', ...stackHeaderOptions }} />
        <Stack.Screen name="partner-cancel" options={{ title: 'Pagamento cancelado', ...stackHeaderOptions }} />
        <Stack.Screen name="parceria-apresentacao" options={{ title: 'Seja parceiro', ...stackHeaderOptions }} />
        <Stack.Screen name="solicitar-parceria" options={{ title: 'Solicitar parceria', ...stackHeaderOptions }} />
        <Stack.Screen name="terms" options={{ title: 'Termos de Uso', ...stackHeaderOptions }} />
        <Stack.Screen name="privacy" options={{ title: 'Política de Privacidade', ...stackHeaderOptions }} />
        <Stack.Screen name="bug-report-suggestion" options={{ title: 'Bug report / Sugestões', ...stackHeaderOptions }} />
        <Stack.Screen name="kyc" options={{ title: 'Solicitar verificação (KYC)', ...stackHeaderOptions }} />
        <Stack.Screen name="my-adoption-requests" options={{ title: 'Minhas solicitações', ...stackHeaderOptions }} />
        <Stack.Screen name="adoption-form-fill/[requestId]" options={{ title: 'Formulário de adoção', ...stackHeaderOptions }} />
        <Stack.Screen name="survey" options={{ title: 'Pesquisa de satisfação', ...stackHeaderOptions }} />
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

const styles = StyleSheet.create({
  fakeSplashContainer: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#7CB342',
  },
  fakeSplashImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
});

export default useSentry
  ? (() => {
      try {
        return require('@sentry/react-native').wrap(RootLayout);
      } catch {
        return RootLayout;
      }
    })()
  : RootLayout;
