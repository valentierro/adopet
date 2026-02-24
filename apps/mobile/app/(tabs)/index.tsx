import { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
  Modal,
  Pressable,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, LoadingLogo, VerifiedBadge, PrimaryButton, SecondaryButton } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useClientConfig } from '../../src/hooks/useClientConfig';
import { useAuthStore } from '../../src/stores/authStore';
import { getMe, getTutorStats, getMyAdoptions, getPreferences, getPendingAdoptionConfirmations, getMyNotificationsUnreadCount } from '../../src/api/me';
import { getAdminStats } from '../../src/api/admin';
import { getMinePets } from '../../src/api/pets';
import { getFavorites } from '../../src/api/favorites';
import { getConversations } from '../../src/api/conversations';
import { getPassedPets } from '../../src/api/swipes';
import { fetchFeed } from '../../src/api/feed';
import { spacing } from '../../src/theme';

const LogoLight = require('../../assets/brand/logo/logo_horizontal_light.png');
const LogoDark = require('../../assets/brand/logo/logo_dark.png');

function useDashboardData() {
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({});
          setUserCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        } catch {
          setUserCoords(null);
        }
      }
    })();
  }, []);

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: getMe, staleTime: 60_000 });
  const hasUser = !!user?.id;
  const { data: prefs } = useQuery({
    queryKey: ['me', 'preferences'],
    queryFn: getPreferences,
    staleTime: 5 * 60_000,
    enabled: hasUser,
  });
  const { data: tutorStats } = useQuery({
    queryKey: ['me', 'tutor-stats'],
    queryFn: getTutorStats,
    staleTime: 60_000,
    enabled: hasUser,
  });
  const { data: minePage, refetch: refetchMine } = useQuery({
    queryKey: ['pets', 'mine'],
    queryFn: () => getMinePets({}),
    staleTime: 60_000,
    enabled: hasUser,
  });
  const { data: favoritesPage, refetch: refetchFav } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => getFavorites(),
    staleTime: 60_000,
    enabled: hasUser,
  });
  const { data: conversations = [], refetch: refetchConv } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
    staleTime: 60_000,
    enabled: hasUser,
  });
  const { data: feedData, refetch: refetchFeed } = useQuery({
    queryKey: ['feed', null, prefs?.radiusKm, 'BOTH', userCoords?.lat, userCoords?.lng],
    queryFn: () =>
      fetchFeed({
        ...(userCoords && { lat: userCoords.lat, lng: userCoords.lng }),
        radiusKm: prefs?.radiusKm ?? 300,
        species: 'BOTH',
      }),
    staleTime: 2 * 60_000,
    enabled: hasUser,
  });
  const { data: carouselFeedData, refetch: refetchCarousel } = useQuery({
    queryKey: ['feed', 'carousel', prefs?.radiusKm, 'BOTH', userCoords?.lat, userCoords?.lng],
    queryFn: () =>
      fetchFeed({
        ...(userCoords && { lat: userCoords.lat, lng: userCoords.lng }),
        radiusKm: prefs?.radiusKm ?? 300,
        species: 'BOTH',
        limit: 500,
      }),
    staleTime: 2 * 60_000,
    enabled: hasUser,
  });
  const { data: adoptionsData, refetch: refetchAdoptions } = useQuery({
    queryKey: ['me', 'adoptions'],
    queryFn: getMyAdoptions,
    staleTime: 60_000,
    enabled: hasUser,
  });
  const { data: passedData, refetch: refetchPassed } = useQuery({
    queryKey: ['swipes', 'passed'],
    queryFn: getPassedPets,
    staleTime: 60_000,
    enabled: hasUser,
  });
  const { data: pendingConfirmationsData, refetch: refetchPendingConfirmations } = useQuery({
    queryKey: ['me', 'pending-adoption-confirmations'],
    queryFn: getPendingAdoptionConfirmations,
    staleTime: 60_000,
    enabled: hasUser,
  });
  const { data: notificationsUnreadData, refetch: refetchNotificationsCount } = useQuery({
    queryKey: ['me', 'notifications-unread-count'],
    queryFn: getMyNotificationsUnreadCount,
    staleTime: 60_000,
    enabled: hasUser,
  });

  const myPets = minePage?.items ?? [];
  const myAdoptionsCount = adoptionsData?.items?.length ?? 0;
  const favoritesCount = Array.isArray(favoritesPage?.items) ? favoritesPage.items.length : 0;
  const unreadTotal = conversations.reduce((s, c) => s + (c.unreadCount ?? 0), 0);
  const passedCount = passedData?.items?.length ?? 0;
  const feedPreviewItems = feedData?.items ?? [];
  const feedTotalCount = feedData?.totalCount;
  const carouselFeedItems = carouselFeedData?.items ?? [];

  const pendingConfirmations = pendingConfirmationsData?.items ?? [];
  const [refreshing, setRefreshing] = useState(false);
  const refetchAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchMine(),
      refetchFav(),
      refetchConv(),
      refetchFeed(),
      refetchCarousel(),
      refetchAdoptions(),
      refetchPassed(),
      refetchPendingConfirmations(),
      refetchNotificationsCount(),
    ]);
    setRefreshing(false);
  }, [refetchMine, refetchFav, refetchConv, refetchFeed, refetchCarousel, refetchAdoptions, refetchPassed, refetchPendingConfirmations, refetchNotificationsCount]);

  return {
    user,
    tutorStats,
    myPetsCount: myPets.length,
    myAdoptionsCount,
    pendingConfirmations,
    favoritesCount,
    conversationsCount: conversations.length,
    unreadTotal,
    passedCount,
    feedPreviewItems,
    feedTotalCount,
    carouselFeedItems,
    pendingConfirmations,
    notificationsUnreadCount: notificationsUnreadData?.count ?? 0,
    refetchAll,
    refreshing,
  };
}

const GAMIFICATION_LEVELS: { pts: number; title: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { pts: 0, title: 'Tutor Iniciante', icon: 'paw-outline' },
  { pts: 25, title: 'Tutor Ativo', icon: 'paw' },
  { pts: 75, title: 'Tutor Confiável', icon: 'ribbon-outline' },
  { pts: 150, title: 'Tutor Destaque', icon: 'star' },
  { pts: 300, title: 'Tutor Ouro', icon: 'trophy' },
];

const TUTOR_LEVEL_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  BEGINNER: 'paw-outline',
  ACTIVE: 'paw',
  TRUSTED: 'ribbon-outline',
  STAR: 'star',
  GOLD: 'trophy',
};

export default function DashboardScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height: windowHeight } = useWindowDimensions();
  const cardGap = spacing.md;
  const cardWidth = (width - spacing.lg * 2 - cardGap) / 2;
  const [showGamificationModal, setShowGamificationModal] = useState(false);
  const modalHeight = Math.min(windowHeight * 0.82, 560);

  const {
    user,
    tutorStats,
    myPetsCount,
    myAdoptionsCount,
    favoritesCount,
    conversationsCount,
    unreadTotal,
    passedCount,
    feedPreviewItems,
    feedTotalCount,
    carouselFeedItems,
    pendingConfirmations,
    notificationsUnreadCount,
    refetchAll,
    refreshing,
  } = useDashboardData();

  const setUser = useAuthStore((s) => s.setUser);
  const { config: clientConfig } = useClientConfig();
  const queryClient = useQueryClient();
  const feedCarouselRef = useRef<ScrollView>(null);
  const feedCarouselOffsetRef = useRef(0);
  const FEED_CAROUSEL_THUMB_SIZE = 56;
  const FEED_CAROUSEL_GAP = 6;
  const FEED_CAROUSEL_ITEM_WIDTH = FEED_CAROUSEL_THUMB_SIZE + FEED_CAROUSEL_GAP;
  const feedThumbUrls = useMemo(
    () => carouselFeedItems.map((p) => p.photos?.[0]).filter(Boolean) as string[],
    [carouselFeedItems],
  );
  useEffect(() => {
    if (feedThumbUrls.length === 0) return;
    const segmentWidth = FEED_CAROUSEL_ITEM_WIDTH * feedThumbUrls.length;
    const id = setInterval(() => {
      const next = feedCarouselOffsetRef.current + FEED_CAROUSEL_ITEM_WIDTH;
      const wrapped = next >= 2 * segmentWidth ? next - segmentWidth : next;
      feedCarouselRef.current?.scrollTo({ x: wrapped, animated: true });
    }, 3000);
    return () => clearInterval(id);
  }, [feedThumbUrls.length]);
  const { data: _u, isLoading, isError, refetch: refetchMe } = useQuery({ queryKey: ['me'], queryFn: getMe, retry: 1 });
  const isAdmin = user?.isAdmin === true;
  const { data: adminStats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: getAdminStats,
    enabled: isAdmin,
    staleTime: 60_000,
  });

  useFocusEffect(
    useCallback(() => {
      refetchAll();
      if (isAdmin) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      }
    }, [refetchAll, isAdmin, queryClient]),
  );
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const firstName = user?.name?.trim().split(/\s+/)[0] || '';
  const isNonPartner = !user?.partner && !(user?.partnerMemberships && user.partnerMemberships.length > 0);
  const isKycVerified = user?.kycStatus === 'VERIFIED';
  const isKycPending = user?.kycStatus === 'PENDING';

  /** Badge do perfil na tela inicial: Admin, ONG, Parceiro ou Tutor */
  const roleBadgeLabel =
    user?.isAdmin === true
      ? 'Admin'
      : user?.partner?.type === 'ONG' || (user?.partnerMemberships && user.partnerMemberships.length > 0)
        ? 'ONG'
        : user?.partner
          ? 'Parceiro'
          : 'Tutor';
  const roleBadgeIcon: keyof typeof Ionicons.glyphMap =
    roleBadgeLabel === 'Admin'
      ? 'shield-checkmark'
      : roleBadgeLabel === 'ONG'
        ? 'heart'
        : roleBadgeLabel === 'Parceiro'
          ? 'storefront'
          : 'paw';
  const roleBadgeColor = roleBadgeLabel === 'Admin' ? '#b45309' : '#15803d';
  const [showKycPendingModal, setShowKycPendingModal] = useState(false);

  const handleRequestVerification = () => {
    setShowVerificationModal(false);
    router.push('/kyc');
  };

  useEffect(() => {
    if (user) setUser(user);
  }, [user, setUser]);

  if (isLoading && !user) {
    return (
      <ScreenContainer>
        <LoadingLogo size={160} />
      </ScreenContainer>
    );
  }

  if (!user && !isLoading && isError) {
    return (
      <ScreenContainer>
        <View style={[styles.errorWrap, { paddingHorizontal: spacing.lg }]}>
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Não foi possível carregar seus dados</Text>
          <Text style={[styles.errorSub, { color: colors.textSecondary }]}>Verifique sua conexão e tente novamente.</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={() => refetchMe()} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const cards: {
    id: string;
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    route: string;
    gradient?: [string, string];
    badge?: number;
    fullWidth?: boolean;
    primaryShortcut?: boolean;
  }[] = [
    {
      id: 'feed',
      primaryShortcut: true,
      title: 'Encontre seu próximo amigo',
      subtitle:
        typeof feedTotalCount === 'number'
          ? feedTotalCount === 0
            ? 'Nenhum pet no momento na sua região'
            : `${feedTotalCount} disponível${feedTotalCount !== 1 ? 'eis' : ''}`
          : 'Toque e deslize para curtir',
      icon: 'paw',
      route: '/feed',
      gradient: ['#d97706', '#b45309'],
      fullWidth: true,
    },
    {
      id: 'my-pets',
      primaryShortcut: true,
      title: 'Meus anúncios',
      subtitle: myPetsCount === 0 ? 'Nenhum anúncio' : `${myPetsCount} anúncio${myPetsCount !== 1 ? 's' : ''}`,
      icon: 'megaphone-outline',
      route: '/my-pets',
      badge: myPetsCount > 0 ? myPetsCount : undefined,
    },
    {
      id: 'adopted',
      primaryShortcut: true,
      title: 'Minhas adoções',
      subtitle: myAdoptionsCount === 0 ? 'Nenhuma adoção' : (myAdoptionsCount === 1 ? '1 adoção' : `${myAdoptionsCount} adoções`),
      icon: 'heart-circle',
      route: '/my-adoptions',
      badge: myAdoptionsCount > 0 ? myAdoptionsCount : undefined,
    },
    {
      id: 'favorites',
      title: 'Favoritos',
      subtitle: favoritesCount === 0 ? 'Nenhum favorito' : `${favoritesCount} pet${favoritesCount !== 1 ? 's' : ''}`,
      icon: 'heart',
      route: '/favorites',
      badge: favoritesCount > 0 ? favoritesCount : undefined,
    },
    {
      id: 'map',
      title: 'Ver no mapa',
      subtitle: 'Pets na região',
      icon: 'map',
      route: '/map',
    },
    {
      id: 'passed',
      title: 'Pets que passou',
      subtitle: passedCount === 0 ? 'Nenhum na lista' : `${passedCount} pet${passedCount !== 1 ? 's' : ''} para rever`,
      icon: 'arrow-undo',
      route: '/passed-pets',
      badge: passedCount > 0 ? passedCount : undefined,
    },
    {
      id: 'partnersArea',
      title: 'Ofertas dos parceiros',
      subtitle: 'Serviços e cupons de clínicas e lojas',
      icon: 'pricetag',
      route: '/partners-area',
      gradient: ['#d97706', '#b45309'],
      fullWidth: true,
    },
    {
      id: 'partnerOng',
      title: 'Sou ONG ou instituição',
      subtitle: 'Parceria gratuita para abrigos e instituições',
      icon: 'heart',
      route: '/seja-parceiro-ong',
      gradient: ['#d97706', '#b45309'],
      fullWidth: true,
    },
    {
      id: 'partnerComercial',
      title: 'Clínicas, veterinários, lojas',
      subtitle: 'Planos com destaque e preços no app',
      icon: 'storefront',
      route: '/seja-parceiro-comercial',
      gradient: ['#d97706', '#b45309'],
      fullWidth: true,
    },
  ];

  // Card condicional no lugar de Conversas: admin → Administração; demais → Notificações
  const conditionalCard: (typeof cards)[0] = isAdmin
    ? {
        id: 'admin',
        title: 'Administração',
        subtitle: 'Painel administrativo',
        icon: 'shield-checkmark',
        route: '/admin',
        gradient: ['rgba(217, 119, 6, 0.9)', 'rgba(180, 83, 9, 0.95)'],
      }
    : {
        id: 'notifications',
        title: 'Notificações',
        subtitle:
          notificationsUnreadCount === 0
            ? 'Nenhuma nova'
            : `${notificationsUnreadCount} não lida${notificationsUnreadCount !== 1 ? 's' : ''}`,
        icon: 'notifications',
        route: '/notifications',
        badge: notificationsUnreadCount > 0 ? notificationsUnreadCount : undefined,
      };
  const mapIdx = cards.findIndex((c) => c.id === 'map');
  const cardsWithConditional =
    mapIdx >= 0 ? [...cards.slice(0, mapIdx + 1), conditionalCard, ...cards.slice(mapIdx + 1)] : cards;

  // Parceiro/membro de ONG ou admin: não vê os CTAs "Sou ONG" e "Clínicas, lojas"
  const isPartnerOrMember =
    user?.partner || (user?.partnerMemberships && user.partnerMemberships.length > 0);
  const isOngUser =
    user?.partner?.type === 'ONG' || (user?.partnerMemberships && user.partnerMemberships.length > 0);
  let cardsToShow = isPartnerOrMember || isAdmin
    ? cardsWithConditional.filter((c) => c.id !== 'partnerOng' && c.id !== 'partnerComercial')
    : cardsWithConditional;
  // Home diferenciada para ONG: sempre exibe Minha ONG, Anúncios da ONG e Adoções pela ONG (não depende de flag)
  if (isPartnerOrMember && isOngUser) {
    const ongCards = [
      {
        id: 'ongPortal',
        title: 'Minha ONG',
        subtitle: 'Portal do parceiro, solicitações e anúncios em parceria',
        icon: 'business' as keyof typeof Ionicons.glyphMap,
        route: '/partner-portal',
        gradient: ['#0d9488', '#0f766e'] as [string, string],
        fullWidth: true,
      },
      {
        id: 'ongMyPets',
        title: 'Anúncios da ONG',
        subtitle: 'Pets em parceria com a sua instituição',
        icon: 'megaphone' as keyof typeof Ionicons.glyphMap,
        route: '/partner-my-pets',
        gradient: ['#0d9488', '#0f766e'] as [string, string],
        fullWidth: true,
      },
      {
        id: 'ongAdoptions',
        title: 'Adoções pela ONG',
        subtitle: 'Pets da ONG que encontraram lar',
        icon: 'heart-circle' as keyof typeof Ionicons.glyphMap,
        route: '/partner-ong-adoptions',
        gradient: ['#0d9488', '#0f766e'] as [string, string],
        fullWidth: true,
      },
    ];
    const idx = cardsToShow.findIndex((c) => c.id === 'partnersArea');
    if (idx >= 0) {
      cardsToShow = [...cardsToShow.slice(0, idx), ...ongCards, ...cardsToShow.slice(idx)];
    } else {
      cardsToShow = [...cardsToShow, ...ongCards];
    }
  }

  // Parceiro comercial (não ONG): CTA para Portal do parceiro acima de Ofertas dos parceiros
  const isNonOngPartner = isPartnerOrMember && !isOngUser;
  if (isNonOngPartner) {
    const partnerPortalCard = {
      id: 'partnerPortal',
      title: 'Portal do parceiro',
      subtitle: 'Cupons, serviços e gestão do seu estabelecimento',
      icon: 'storefront' as keyof typeof Ionicons.glyphMap,
      route: '/partner-portal',
      gradient: ['#0d9488', '#0f766e'] as [string, string],
      fullWidth: true,
    };
    const partnersAreaIdx = cardsToShow.findIndex((c) => c.id === 'partnersArea');
    if (partnersAreaIdx >= 0) {
      cardsToShow = [...cardsToShow.slice(0, partnersAreaIdx), partnerPortalCard, ...cardsToShow.slice(partnersAreaIdx)];
    } else {
      cardsToShow = [...cardsToShow, partnerPortalCard];
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.xl,
            paddingHorizontal: spacing.lg,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refetchAll} tintColor={colors.primary} />
        }
      >
        {pendingConfirmations.length > 0 ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/adoption-confirm')}
            style={styles.confirmBanner}
          >
            <View style={styles.confirmBannerContent}>
              <Ionicons name="paw" size={20} color="#fff" style={styles.confirmBannerIcon} />
              <Text style={styles.confirmBannerText} numberOfLines={2}>
                Você tem adoções não confirmadas
              </Text>
            </View>
            <View style={styles.confirmBannerButtonWrap}>
              <Text style={styles.confirmBannerButtonText}>Confirmar</Text>
            </View>
          </TouchableOpacity>
        ) : null}
        <LinearGradient
          colors={[colors.primary + '22', colors.primary + '08']}
          style={[styles.hero, { borderRadius: 20, overflow: 'hidden' }]}
        >
          <View style={styles.heroInner}>
            <Text style={[styles.hello, { color: colors.textSecondary }]}>Olá,</Text>
            <View style={styles.heroNameRow}>
              <View style={styles.heroNameWithBadge}>
                {isNonPartner &&
                  (isKycVerified ? (
                    <TouchableOpacity
                      onPress={() => setShowVerificationModal(true)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <VerifiedBadge size={26} iconBackgroundColor={colors.primary} />
                    </TouchableOpacity>
                  ) : isKycPending ? (
                    <TouchableOpacity
                      onPress={() => setShowKycPendingModal(true)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.verificationChip}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="time-outline" size={20} color={colors.warning || '#d97706'} />
                      <Text style={[styles.verificationChipText, { color: colors.warning || '#d97706' }]}>Verificação em análise</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => setShowVerificationModal(true)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.verificationChip}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                      <Text style={[styles.verificationChipText, { color: colors.primary }]}>Solicitar verificação</Text>
                    </TouchableOpacity>
                  ))}
                <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">
                  {firstName || 'Visitante'}
                </Text>
              </View>
              <View style={styles.heroLogoBlock}>
                <Image
                  source={isDark ? LogoDark : LogoLight}
                  style={styles.heroLogo}
                  resizeMode="contain"
                />
                {user ? (
                  <View style={[styles.roleBadgeWrap, { backgroundColor: roleBadgeColor + '22' }]}>
                    <Ionicons name={roleBadgeIcon} size={14} color={roleBadgeColor} />
                    <Text style={[styles.roleBadgeText, { color: roleBadgeColor }]}>{roleBadgeLabel}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <Text style={[styles.heroTagline, { color: colors.textSecondary }]}>
              Encontre seu próximo companheiro
            </Text>
            {typeof feedTotalCount === 'number' && feedTotalCount > 0 ? (
              <TouchableOpacity onPress={() => router.push('/feed')} activeOpacity={0.7}>
                <Text style={[styles.heroHint, { color: colors.primary }]}>
                  {feedTotalCount} pet{feedTotalCount !== 1 ? 's' : ''} na sua região
                </Text>
              </TouchableOpacity>
            ) : null}
            {tutorStats ? (
              <View style={[styles.statsRow, { backgroundColor: colors.surface }]}>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.primary }]}>{tutorStats.points}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>pontos</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.textSecondary }]} />
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.primary }]}>{tutorStats.adoptedCount}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    {tutorStats.adoptedCount === 1 ? 'adoção' : 'adoções'}
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.textSecondary }]} />
                <View style={[styles.stat, styles.statTitleWrap]}>
                  <View style={[styles.tutorLevelBadge, { backgroundColor: colors.primary + '18' }]}>
                    <Ionicons
                      name={TUTOR_LEVEL_ICON[tutorStats.level] ?? 'paw-outline'}
                      size={20}
                      color={colors.primary}
                      style={styles.statTitleIcon}
                    />
                    <Text style={[styles.statTitle, { color: colors.textPrimary }]} numberOfLines={2} ellipsizeMode="tail">
                      {tutorStats.title}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  hitSlop={12}
                  onPress={() => setShowGamificationModal(true)}
                  style={styles.statInfoBtn}
                >
                  <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </LinearGradient>

        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Atalhos</Text>
          <TouchableOpacity
            onPress={() => router.push('/recent-adoptions')}
            style={[styles.sectionTitleLinkTouch, { backgroundColor: '#d9770618' }]}
            activeOpacity={0.7}
          >
            <Ionicons name="heart" size={16} color="#d97706" style={styles.sectionTitleLinkIcon} />
            <Text style={[styles.sectionTitleLink, { color: '#d97706' }]}>Últimas adoções</Text>
          </TouchableOpacity>
        </View>

        {isAdmin && (
          <TouchableOpacity
            style={[styles.adminDashboardBlock, { backgroundColor: 'rgba(217, 119, 6, 0.12)', borderColor: 'rgba(217, 119, 6, 0.35)' }]}
            onPress={() => router.push('/admin')}
            activeOpacity={0.85}
          >
            <View style={styles.adminDashboardHeader}>
              <Ionicons name="shield-checkmark" size={22} color="#b45309" />
              <Text style={[styles.adminDashboardTitle, { color: colors.textPrimary }]}>Resumo administrativo</Text>
            </View>
            <View style={styles.adminDashboardGrid}>
              <View style={styles.adminDashboardCell}>
                <Text style={[styles.adminDashboardCount, { color: colors.primary }]}>
                  {adminStats?.pendingPetsCount ?? 0}
                </Text>
                <Text style={[styles.adminDashboardLabel, { color: colors.textSecondary }]}>Anúncios pendentes</Text>
              </View>
              <View style={[styles.adminDashboardCell, { borderLeftWidth: 1, borderLeftColor: colors.textSecondary + '30' }]}>
                <Text style={[styles.adminDashboardCount, { color: colors.primary }]}>
                  {adminStats?.pendingReportsCount ?? 0}
                </Text>
                <Text style={[styles.adminDashboardLabel, { color: colors.textSecondary }]}>Denúncias</Text>
              </View>
              <View style={[styles.adminDashboardCell, { borderLeftWidth: 1, borderLeftColor: colors.textSecondary + '30' }]}>
                <Text style={[styles.adminDashboardCount, { color: colors.primary }]}>
                  {(adminStats?.pendingAdoptionsByTutorCount ?? 0) + (adminStats?.adoptionsPendingAdopetConfirmationCount ?? 0)}
                </Text>
                <Text style={[styles.adminDashboardLabel, { color: colors.textSecondary }]}>Adoções p/ confirmar</Text>
              </View>
              <View style={[styles.adminDashboardCell, { borderLeftWidth: 1, borderLeftColor: colors.textSecondary + '30' }]}>
                <Text style={[styles.adminDashboardCount, { color: colors.primary }]}>
                  {adminStats?.pendingVerificationsCount ?? 0}
                </Text>
                <Text style={[styles.adminDashboardLabel, { color: colors.textSecondary }]}>Verificações</Text>
              </View>
              <View style={[styles.adminDashboardCell, { borderLeftWidth: 1, borderLeftColor: colors.textSecondary + '30' }]}>
                <Text style={[styles.adminDashboardCount, { color: colors.primary }]}>
                  {adminStats?.pendingKycCount ?? 0}
                </Text>
                <Text style={[styles.adminDashboardLabel, { color: colors.textSecondary }]}>KYC</Text>
              </View>
            </View>
            <View style={[styles.adminDashboardCta, { backgroundColor: 'rgba(217, 119, 6, 0.2)' }]}>
              <Text style={[styles.adminDashboardCtaText, { color: '#b45309' }]}>Abrir painel</Text>
              <Ionicons name="chevron-forward" size={18} color="#b45309" />
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.grid}>
          {cardsToShow.map((card) => {
            const isFull = card.fullWidth;
            const isFeedCard = card.id === 'feed';
            const feedCarouselData = isFeedCard && feedThumbUrls.length > 0 ? [...feedThumbUrls, ...feedThumbUrls, ...feedThumbUrls] : [];
            const feedCarouselSegmentWidth = feedThumbUrls.length > 0 ? FEED_CAROUSEL_ITEM_WIDTH * feedThumbUrls.length : 0;
            const content = isFeedCard && feedThumbUrls.length > 0 ? (
              <View style={styles.feedCardContent}>
                <View style={styles.feedCardHeroBadge}>
                  <Text style={styles.feedCardHeroBadgeText}>Comece aqui</Text>
                </View>
                <View style={styles.feedCardTop}>
                  <View style={[styles.feedCardIconWrapLarge, styles.iconWrapLight]}>
                    <Ionicons name="paw" size={36} color="#fff" />
                  </View>
                  <View style={styles.feedCardText}>
                    <Text style={[styles.feedCardTitleHero, { color: '#fff' }]} numberOfLines={1}>
                      Encontre seu próximo amigo
                    </Text>
                    {typeof feedTotalCount === 'number' && feedTotalCount > 0 ? (
                      <Text style={[styles.feedCardNumberHero, { color: 'rgba(255,255,255,0.95)' }]}>
                        {feedTotalCount} pet{feedTotalCount !== 1 ? 's' : ''} na sua região
                      </Text>
                    ) : null}
                    <Text style={[styles.feedCardActionPhrase, { color: 'rgba(255,255,255,0.9)' }]}>
                      Toque e deslize para curtir
                    </Text>
                  </View>
                  <View style={styles.feedCardCta}>
                    <Text style={styles.feedCardCtaText}>Ver pets</Text>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.95)" />
                  </View>
                </View>
                <ScrollView
                  ref={feedCarouselRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  snapToInterval={FEED_CAROUSEL_ITEM_WIDTH}
                  snapToAlignment="start"
                  contentContainerStyle={[
                    styles.feedCarouselContent,
                    { width: feedCarouselData.length * FEED_CAROUSEL_ITEM_WIDTH - FEED_CAROUSEL_GAP },
                  ]}
                  onScroll={(e) => {
                    feedCarouselOffsetRef.current = e.nativeEvent.contentOffset.x;
                  }}
                  scrollEventThrottle={32}
                  onLayout={() => {
                    feedCarouselRef.current?.scrollTo({ x: feedCarouselSegmentWidth, animated: false });
                    feedCarouselOffsetRef.current = feedCarouselSegmentWidth;
                  }}
                  onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                    const x = e.nativeEvent.contentOffset.x;
                    if (x < feedCarouselSegmentWidth * 0.5) {
                      feedCarouselRef.current?.scrollTo({ x: x + feedCarouselSegmentWidth, animated: false });
                    } else if (x > feedCarouselSegmentWidth * 2.5) {
                      feedCarouselRef.current?.scrollTo({ x: x - feedCarouselSegmentWidth, animated: false });
                    }
                  }}
                >
                  {feedCarouselData.map((uri, i) => (
                    <Image
                      key={`${uri}-${i}`}
                      source={{ uri }}
                      style={[styles.feedThumbLarge, { width: FEED_CAROUSEL_THUMB_SIZE, height: FEED_CAROUSEL_THUMB_SIZE, marginRight: i < feedCarouselData.length - 1 ? FEED_CAROUSEL_GAP : 0 }]}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : isFeedCard && feedPreviewItems.length === 0 ? (
              <View style={styles.feedCardContent}>
                <View style={styles.feedCardHeroBadge}>
                  <Text style={styles.feedCardHeroBadgeText}>Comece aqui</Text>
                </View>
                <View style={styles.feedCardTop}>
                  <View style={[styles.feedCardIconWrapLarge, styles.iconWrapLight]}>
                    <Ionicons name="paw" size={36} color="#fff" />
                  </View>
                  <View style={styles.feedCardText}>
                    <Text style={[styles.feedCardTitleHero, { color: '#fff' }]} numberOfLines={1}>
                      Encontre seu próximo amigo
                    </Text>
                    <Text style={[styles.feedCardSubtitle, { color: 'rgba(255,255,255,0.9)' }]} numberOfLines={1}>
                      Nenhum pet no momento na sua região
                    </Text>
                    <Text style={[styles.feedCardActionPhrase, { color: 'rgba(255,255,255,0.9)' }]}>
                      Explore no mapa ou volte em breve
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.feedCardMapButton}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    router.push('/map');
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="map" size={18} color="#fff" />
                  <Text style={styles.feedCardMapButtonText}>Explorar no mapa</Text>
                </TouchableOpacity>
              </View>
            ) : card.id === 'partnerOng' || card.id === 'partnerComercial' || card.id === 'partnersArea' || card.id === 'partnerPortal' || card.id === 'ongPortal' || card.id === 'ongMyPets' || card.id === 'ongAdoptions' ? (
              <View style={styles.partnersCardRow}>
                <View style={[styles.partnersCardIconWrap, styles.iconWrapLight]}>
                  <Ionicons name={card.icon as any} size={28} color="#fff" />
                </View>
                <View style={styles.partnersCardText}>
                  <Text style={[styles.cardTitle, { color: '#fff', marginTop: 0 }]} numberOfLines={1}>
                    {card.title}
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: 'rgba(255,255,255,0.9)' }]} numberOfLines={2}>
                    {card.subtitle}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.cardContent}>
                {card.badge != null && card.badge > 0 ? (
                  <View style={[styles.badge, { backgroundColor: card.gradient ? 'rgba(255,255,255,0.25)' : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)') }]}>
                    <Text style={[styles.badgeText, { color: card.gradient ? '#fff' : colors.textPrimary }]}>
                      {card.badge > 99 ? '99+' : card.badge}
                    </Text>
                  </View>
                ) : null}
                <View style={[styles.iconWrap, card.gradient && styles.iconWrapLight]}>
                  <Ionicons
                    name={card.icon}
                    size={isFull ? 32 : 28}
                    color={card.gradient ? '#fff' : colors.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.cardTitle,
                    { color: card.gradient ? '#fff' : colors.textPrimary },
                  ]}
                  numberOfLines={1}
                >
                  {card.title}
                </Text>
                <Text
                  style={[
                    styles.cardSubtitle,
                    { color: card.gradient ? 'rgba(255,255,255,0.9)' : colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {card.subtitle}
                </Text>
              </View>
            );

            const isPrimaryShortcut = card.primaryShortcut && !card.gradient;
            return (
              <Pressable
                key={card.id}
                style={({ pressed }) => [
                  styles.cardWrap,
                  isFull ? styles.cardWrapFull : { width: cardWidth },
                  isFeedCard && (feedThumbUrls.length > 0 || feedPreviewItems.length === 0) && styles.cardWrapFeedHero,
                  { opacity: pressed ? 0.88 : 1 },
                ]}
                onPress={() => router.push(card.route as any)}
              >
                {card.gradient ? (
                  <LinearGradient
                    colors={card.gradient as [string, string, ...string[]]}
                    style={[
                      styles.card,
                      isFull && styles.cardFull,
                      isFeedCard && (feedThumbUrls.length > 0 || feedPreviewItems.length === 0) && styles.cardFeedHero,
                    ]}
                  >
                    {content}
                  </LinearGradient>
                ) : (
                  <View
                    style={[
                      styles.card,
                      { backgroundColor: colors.cardBg || colors.surface },
                      isFull && styles.cardFull,
                      isPrimaryShortcut && { borderWidth: 1.5, borderColor: colors.primary + '50' },
                    ]}
                  >
                    {content}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(tabs)/add-pet')}
          activeOpacity={0.9}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.ctaButtonText}>Anunciar pet para adoção</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showGamificationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGamificationModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowGamificationModal(false)}
          />
          <View
            style={[styles.gamificationModal, { backgroundColor: colors.surface, height: modalHeight }]}
          >
            <View style={[styles.gamificationModalHeader, { flexShrink: 0 }]}>
              <Text style={[styles.gamificationModalTitle, { color: colors.textPrimary }]}>
                Como funciona sua pontuação
              </Text>
              <TouchableOpacity
                hitSlop={12}
                onPress={() => setShowGamificationModal(false)}
                style={styles.gamificationModalClose}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.gamificationModalBody}
              contentContainerStyle={styles.gamificationModalBodyContent}
              showsVerticalScrollIndicator={true}
              bounces={false}
            >
              <Text style={[styles.gamificationModalP, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Pontos</Text> — Você ganha pontos quando seus pets recebem o selo de verificação do Adopet (10 pts por pet) e quando uma adoção é confirmada pela equipe (25 pts por adoção). Há bônus na primeira adoção e em marcos como 3ª, 5ª e 10ª adoção.
              </Text>
              <Text style={[styles.gamificationModalP, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Adoções</Text> — É a quantidade de pets que você já doou e que tiveram a adoção confirmada.
              </Text>
              <Text style={[styles.gamificationModalP, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Título</Text> — Seu nível como tutor, baseado nos pontos acumulados:
              </Text>
              <View style={[styles.gamificationLevels, { backgroundColor: colors.surface, borderColor: colors.primary + '40' }]}>
                <View style={[styles.gamificationLevelHeader, { backgroundColor: colors.primary + '18', borderBottomColor: colors.primary + '50' }]}>
                  <Text style={[styles.gamificationLevelHeaderPts, { color: colors.primary }]}>Pontos</Text>
                  <Text style={[styles.gamificationLevelHeaderTitle, { color: colors.textPrimary }]}>Título</Text>
                </View>
                {GAMIFICATION_LEVELS.map(({ pts, title, icon }, idx) => (
                  <View
                    key={title}
                    style={[
                      styles.gamificationLevelRow,
                      { borderBottomColor: colors.textSecondary + '30' },
                      idx === GAMIFICATION_LEVELS.length - 1 && styles.gamificationLevelRowLast,
                    ]}
                  >
                    <Text style={[styles.gamificationLevelPts, { color: colors.primary }]}>{pts} pts</Text>
                    <View style={styles.gamificationLevelTitleWrap}>
                      <Ionicons name={icon} size={18} color={colors.primary} style={styles.gamificationLevelIcon} />
                      <Text style={[styles.gamificationLevelTitle, { color: colors.textPrimary }]}>{title}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity
              style={[styles.gamificationModalBtn, { backgroundColor: colors.primary, flexShrink: 0 }]}
              onPress={() => setShowGamificationModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.gamificationModalBtnText}>Entendi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showVerificationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVerificationModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowVerificationModal(false)} />
          <Pressable
            style={[styles.verificationModalCard, { backgroundColor: colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.verificationModalHeader}>
              <View style={[styles.verificationModalIconWrap, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.verificationModalTitle, { color: colors.textPrimary }]}>Solicitar selo</Text>
            </View>
            <Text style={[styles.verificationModalP, { color: colors.textSecondary }]}>
              O selo "Verificado" indica que sua identidade foi conferida pela equipe Adopet. A verificação ajuda a reduzir fraudes e maus-tratos e torna a adoção mais segura para todos.
            </Text>
            <Text style={[styles.verificationModalP, { color: colors.textSecondary }]}>
              Só quem tem o selo pode concluir o processo de adoção no app: o tutor só consegue marcar você como adotante após sua verificação ser aprovada.
            </Text>
            <Text style={[styles.verificationModalP, { color: colors.textSecondary }]}>
              Para solicitar o selo, envie um documento (RG ou CNH) e uma selfie segurando o documento. Nossa equipe analisa e, se estiver tudo certo, você recebe o selo e pode finalizar adoções.
            </Text>
            {isKycVerified ? (
              <Text style={[styles.verificationModalP, { color: colors.primary, fontWeight: '600' }]}>
                Você já concluiu a verificação de identidade.
              </Text>
            ) : null}
            <View style={styles.verificationModalActions}>
              {!isKycVerified && (
                <PrimaryButton
                  title="Solicitar"
                  onPress={handleRequestVerification}
                  style={styles.verificationModalCta}
                />
              )}
              <SecondaryButton
                title={isKycVerified ? 'Fechar' : 'Depois'}
                onPress={() => setShowVerificationModal(false)}
              />
            </View>
          </Pressable>
        </View>
      </Modal>

      <Modal
        visible={showKycPendingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowKycPendingModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowKycPendingModal(false)} />
          <Pressable
            style={[styles.verificationModalCard, { backgroundColor: colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.verificationModalHeader}>
              <View style={[styles.verificationModalIconWrap, { backgroundColor: (colors.warning || '#d97706') + '22' }]}>
                <Ionicons name="time" size={32} color={colors.warning || '#d97706'} />
              </View>
              <Text style={[styles.verificationModalTitle, { color: colors.textPrimary }]}>Verificação em análise</Text>
            </View>
            <Text style={[styles.verificationModalP, { color: colors.textSecondary }]}>
              Sua verificação de identidade está sendo analisada pela equipe Adopet. O resultado pode levar até 48 horas.
            </Text>
            <Text style={[styles.verificationModalP, { color: colors.textSecondary }]}>
              Assim que for aprovada, você poderá concluir o processo de adoção no app e os tutores poderão marcar você como adotante.
            </Text>
            <SecondaryButton title="Fechar" onPress={() => setShowKycPendingModal(false)} />
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: spacing.xl },
  confirmBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EA580C',
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  confirmBannerContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginRight: spacing.md },
  confirmBannerIcon: {},
  confirmBannerText: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },
  confirmBannerButtonWrap: {
    backgroundColor: '#059669',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
  },
  confirmBannerButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  hero: {
    marginBottom: spacing.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  heroInner: {},
  heroNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, minHeight: 32 },
  heroNameWithBadge: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0, marginRight: spacing.sm, gap: 6 },
  verificationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  verificationChipText: { fontSize: 12, fontWeight: '600' },
  heroLogoBlock: { alignItems: 'flex-end' },
  heroLogo: { height: 26, width: 90 },
  roleBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  roleBadgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  hello: { fontSize: 14, marginBottom: 2 },
  name: { fontSize: 22, fontWeight: '700', letterSpacing: 0.3, flexShrink: 1, minWidth: 0 },
  heroTagline: { fontSize: 13, marginTop: 4 },
  heroHint: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
  },
  stat: { flex: 1, alignItems: 'center' },
  statTitleWrap: { flex: 1.2, minWidth: 0, flexShrink: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  tutorLevelBadge: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
    maxWidth: '100%',
  },
  statTitleIcon: { marginBottom: 0 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 2 },
  statTitle: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  statDivider: { width: 1, height: 24, opacity: 0.3, marginHorizontal: spacing.xs },
  statInfoBtn: { padding: spacing.xs, marginLeft: spacing.xs },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  gamificationModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
  },
  gamificationModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  gamificationModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    paddingRight: spacing.md,
  },
  gamificationModalClose: { padding: spacing.xs },
  gamificationModalBody: {
    flex: 1,
    minHeight: 0,
  },
  gamificationModalBodyContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  gamificationModalP: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  gamificationLevels: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: spacing.sm,
    borderWidth: 1,
  },
  gamificationLevelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1.5,
  },
  gamificationLevelHeaderPts: { fontSize: 12, fontWeight: '800', width: 56, textTransform: 'uppercase', letterSpacing: 0.5 },
  gamificationLevelHeaderTitle: { fontSize: 12, fontWeight: '800', flex: 1, textTransform: 'uppercase', letterSpacing: 0.5 },
  gamificationLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  gamificationLevelRowLast: { borderBottomWidth: 0 },
  gamificationLevelPts: { fontSize: 14, fontWeight: '700', width: 56 },
  gamificationLevelTitleWrap: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  gamificationLevelIcon: { marginRight: 8 },
  gamificationLevelTitle: { fontSize: 14, fontWeight: '600', flex: 1 },
  gamificationModalBtn: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 14,
    alignItems: 'center',
  },
  gamificationModalBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionTitleLinkTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  sectionTitleLinkIcon: {
    marginRight: 5,
  },
  sectionTitleLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  cardWrap: {},
  cardWrapFull: { width: '100%' },
  card: {
    borderRadius: 16,
    minHeight: 112,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0.06,
    elevation: 3,
  },
  cardFull: { width: '100%' },
  partnersCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    flex: 1,
  },
  partnersCardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnersCardText: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'flex-end',
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  iconWrap: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapLight: { backgroundColor: 'rgba(255,255,255,0.25)' },
  cardTitle: { fontSize: 16, fontWeight: '800', marginTop: 28 },
  cardSubtitle: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  cardWrapFeedHero: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    shadowOpacity: 0.2,
    elevation: 8,
  },
  cardFeedHero: {
    minHeight: 200,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  feedCardContent: { flex: 1, padding: spacing.md, justifyContent: 'space-between' },
  feedCardHeroBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    zIndex: 1,
  },
  feedCardHeroBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  feedCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  feedCardIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  feedCardIconWrapLarge: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  feedCardText: { flex: 1, marginLeft: spacing.sm, minWidth: 0, justifyContent: 'center' },
  feedCardCta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  feedCardCtaText: { color: 'rgba(255,255,255,0.95)', fontSize: 14, fontWeight: '700' },
  feedCardTitle: { fontSize: 16, fontWeight: '800' },
  feedCardTitleHero: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  feedCardNumberHero: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  feedCardActionPhrase: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  feedCardSubtitle: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  feedThumbsRow: { flexDirection: 'row', gap: 6, marginTop: spacing.xs },
  feedCarouselContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingVertical: 2,
  },
  feedThumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.15)' },
  feedThumbLarge: { borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.15)' },
  feedThumbMore: { alignItems: 'center', justifyContent: 'center' },
  feedThumbMoreText: { color: 'rgba(255,255,255,0.95)', fontSize: 14, fontWeight: '700' },
  feedCardMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  feedCardMapButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xl },
  errorTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.sm, textAlign: 'center' },
  errorSub: { fontSize: 15, textAlign: 'center', marginBottom: spacing.lg },
  retryBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: 12 },
  retryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  adminDashboardBlock: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  adminDashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  adminDashboardTitle: { fontSize: 15, fontWeight: '700' },
  adminDashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  adminDashboardCell: {
    flex: 1,
    minWidth: '20%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminDashboardCount: { fontSize: 20, fontWeight: '800' },
  adminDashboardLabel: { fontSize: 11, textAlign: 'center', marginTop: 2 },
  adminDashboardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    marginTop: 2,
  },
  adminDashboardCtaText: { fontSize: 14, fontWeight: '700' },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    shadowOpacity: 0.12,
    elevation: 4,
  },
  ctaButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  verificationModalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: spacing.xl,
  },
  verificationModalHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  verificationModalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  verificationModalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  verificationModalP: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  verificationModalFeedback: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  verificationModalActions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  verificationModalCta: { marginBottom: 0 },
});
