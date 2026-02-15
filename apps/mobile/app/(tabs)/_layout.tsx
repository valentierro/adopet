import { Tabs, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
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

/** Header com logo + botão Voltar (volta para a tela anterior, seja home ou perfil). */
const backWithLogoOptions = {
  headerLeft: () => <HeaderBackButton />,
  headerTitle: () => <HeaderLogo />,
  headerTitleAlign: 'center' as const,
};

export default function TabsLayout() {
  const router = useRouter();
  const { colors } = useTheme();
  usePushToken(true);
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
        tabBarStyle: { backgroundColor: colors.tabBarBg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          href: null,
          title: 'Feed',
          headerShown: true,
          headerTitle: 'Descobrir pets',
          headerTitleAlign: 'center',
          headerLeft: () => <HeaderBackButton />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
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
          title: 'Conversas',
          headerTitle: () => <HeaderLogo />,
          headerTitleAlign: 'center',
          headerLeft: () => <HeaderBackButton />,
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />,
          tabBarBadge: unreadTotal > 0 ? (unreadTotal > 99 ? '99+' : unreadTotal) : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          headerTitle: () => <HeaderLogo />,
          headerTitleAlign: 'center',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
          tabBarBadge: adminPendingTotal > 0 ? (adminPendingTotal > 99 ? '99+' : adminPendingTotal) : undefined,
        }}
      />
      <Tabs.Screen
        name="pet/[id]"
        options={{ href: null, title: 'Detalhes do pet', ...backScreenOptions }}
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
        name="saved-searches"
        options={{ href: null, title: 'Buscas salvas', ...backWithLogoOptions }}
      />
      <Tabs.Screen
        name="adoption-confirm"
        options={{ href: null, title: 'Confirmar adoção', ...backWithLogoOptions }}
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
