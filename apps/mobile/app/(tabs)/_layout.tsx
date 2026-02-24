import { Tabs, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../src/hooks/useTheme';
import { usePushToken } from '../../src/hooks/usePushToken';
import { useNotificationResponse } from '../../src/hooks/useNotificationResponse';
import { useAuthStore } from '../../src/stores/authStore';
import { getConversations } from '../../src/api/conversations';
import { getAdminStats } from '../../src/api/admin';
import { HeaderLogo } from '../../src/components';
import { Ionicons } from '@expo/vector-icons';

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

/** Volta sempre para a tela inicial (primeira tab). */
function HeaderBackToHomeButton() {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={() => router.replace('/(tabs)')}
      style={{ padding: 8, marginLeft: 4 }}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
    </TouchableOpacity>
  );
}

/** Header com logo + botão Voltar (volta para a tela anterior, seja home ou perfil). */
const backWithLogoOptions = {
  headerLeft: () => <HeaderBackButton />,
  headerTitle: () => <HeaderLogo />,
  headerTitleAlign: 'center' as const,
};

export default function TabsLayout() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.user?.id);
  const isGuest = !userId;
  usePushToken(!!userId);
  useNotificationResponse(router);
  const isAdmin = useAuthStore((s) => s.user?.isAdmin === true);
  const { data: conversationsData } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
  });
  const { data: adminStats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: getAdminStats,
    enabled: isAdmin,
    refetchInterval: 60_000,
  });
  const conversations = Array.isArray(conversationsData) ? conversationsData : [];
  const unreadTotal = conversations.reduce((s, c) => s + (c.unreadCount ?? 0), 0);
  const adminPendingTotal =
    isAdmin && adminStats
      ? (adminStats.pendingPetsCount ?? 0) +
        (adminStats.pendingReportsCount ?? 0) +
        (adminStats.pendingAdoptionsByTutorCount ?? 0) +
        (adminStats.adoptionsPendingAdopetConfirmationCount ?? 0) +
        (adminStats.pendingVerificationsCount ?? 0)
      : 0;

  const backScreenOptions = {
    headerLeft: () => <HeaderBackButton />,
  };

  return (
    <Tabs
      screenOptions={{
        lazy: true,
        headerStyle: { backgroundColor: colors.headerBg },
        headerTintColor: colors.textPrimary,
        headerLeft: () => <HeaderBackButton />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 8) + 4,
          minHeight: 56 + 10 + Math.max(insets.bottom, 8) + 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: isGuest ? null : undefined,
          title: 'Início',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          href: isGuest ? '/(tabs)/feed' : null,
          title: isGuest ? 'Explorar' : 'Feed',
          headerShown: true,
          headerTitle: isGuest ? 'Pets para adoção' : 'Descobrir pets',
          headerTitleAlign: 'center',
          headerLeft: isGuest ? undefined : () => <HeaderBackButton />,
          tabBarIcon: ({ color, size }) => <Ionicons name="paw" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          href: isGuest ? '/(tabs)/favorites' : undefined,
          title: 'Favoritos',
          headerTitle: () => <HeaderLogo />,
          headerTitleAlign: 'center',
          headerLeft: () => <HeaderBackButton />,
          tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="add-pet"
        options={{
          href: isGuest ? '/(tabs)/add-pet' : undefined,
          title: 'Anunciar',
          headerTitle: () => <HeaderLogo />,
          headerTitleAlign: 'center',
          headerLeft: () => <HeaderBackButton />,
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          href: isGuest ? '/(tabs)/chats' : undefined,
          title: 'Conversas',
          headerTitle: () => <HeaderLogo />,
          headerTitleAlign: 'center',
          headerLeft: () => <HeaderBackButton />,
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />,
          tabBarBadge: !isGuest && unreadTotal > 0 ? (unreadTotal > 99 ? '99+' : unreadTotal) : undefined,
        }}
      />
      {/* Visitante: tab "Entrar" abre entrar.tsx que redireciona para welcome. Logado: tab "Perfil". */}
      <Tabs.Screen
        name="entrar"
        options={{
          href: isGuest ? '/(tabs)/entrar' : null,
          title: 'Entrar',
          headerTitle: () => <HeaderLogo />,
          headerTitleAlign: 'center',
          tabBarIcon: ({ color, size }) => <Ionicons name="log-in-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: isGuest ? null : undefined,
          title: 'Perfil',
          headerTitle: () => <HeaderLogo />,
          headerTitleAlign: 'center',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
          tabBarBadge: !isGuest && adminPendingTotal > 0 ? (adminPendingTotal > 99 ? '99+' : adminPendingTotal) : undefined,
        }}
      />
      <Tabs.Screen
        name="pet/[id]"
        options={{ href: null, title: 'Detalhes do pet', ...backScreenOptions }}
      />
      <Tabs.Screen
        name="pet-priority/[id]"
        options={{ href: null, title: 'Quem priorizar', ...backWithLogoOptions }}
      />
      <Tabs.Screen
        name="chat/[id]"
        options={{ href: null, title: 'Conversa', ...backScreenOptions }}
      />
      <Tabs.Screen
        name="preferences"
        options={{ href: null, title: 'Preferências', ...backWithLogoOptions }}
      />
      <Tabs.Screen
        name="my-pets"
        options={{ href: null, title: 'Meus anúncios', ...backWithLogoOptions }}
      />
      <Tabs.Screen
        name="my-adoptions"
        options={{ href: null, title: 'Minhas adoções', ...backWithLogoOptions }}
      />
      <Tabs.Screen
        name="pet-edit/[id]"
        options={{ href: null, title: 'Editar pet', ...backScreenOptions }}
      />
      <Tabs.Screen
        name="passed-pets"
        options={{ href: null, title: 'Pets que você passou', ...backWithLogoOptions }}
      />
      <Tabs.Screen
        name="map"
        options={{ href: null, title: 'Mapa', ...backWithLogoOptions }}
      />
      <Tabs.Screen
        name="feed-grid"
        options={{ href: null, title: 'Pets', ...backWithLogoOptions }}
      />
      <Tabs.Screen
        name="saved-searches"
        options={{ href: null, title: 'Buscas salvas', ...backWithLogoOptions }}
      />
      <Tabs.Screen
        name="adoption-confirm"
        options={{ href: null, title: 'Confirmar adoção', ...backWithLogoOptions }}
      />
      <Tabs.Screen
        name="recent-adoptions"
        options={{
          href: null,
          title: 'Últimas adoções',
          headerTitle: () => <HeaderLogo />,
          headerTitleAlign: 'center',
          headerLeft: () => <HeaderBackToHomeButton />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{ href: null, title: 'Administração', ...backWithLogoOptions }}
      />
      <Tabs.Screen
        name="seja-parceiro"
        options={{ href: null, title: 'Seja um parceiro', ...backScreenOptions }}
      />
      <Tabs.Screen
        name="partners"
        options={{ href: null, title: 'Parceiros Adopet', ...backWithLogoOptions }}
      />
      <Tabs.Screen
        name="indique-parceiro"
        options={{ href: null, title: 'Indique um parceiro', ...backScreenOptions }}
      />
      <Tabs.Screen
        name="partners-area"
        options={{
          href: null,
          title: 'Ofertas dos parceiros',
          headerTitle: () => <HeaderLogo />,
          headerTitleAlign: 'center',
          ...backScreenOptions,
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          href: null,
          title: 'Para seu pet',
          headerTitle: () => <HeaderLogo />,
          headerTitleAlign: 'center',
          ...backScreenOptions,
        }}
      />
      <Tabs.Screen
        name="partners/[id]"
        options={{
          href: null,
          title: 'Parceiro',
          headerTitle: () => <HeaderLogo />,
          headerTitleAlign: 'center',
          ...backScreenOptions,
        }}
      />
      <Tabs.Screen
        name="seja-parceiro-ong"
        options={{ href: null, title: 'Parceria para ONGs', ...backScreenOptions }}
      />
      <Tabs.Screen
        name="seja-parceiro-comercial"
        options={{ href: null, title: 'Parceria comercial', ...backScreenOptions }}
      />
    </Tabs>
  );
}
