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
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, LoadingLogo, VerifiedBadge, PrimaryButton, SecondaryButton, UsuarioVerificadoModal, DashboardSpotlightTour } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useClientConfig } from '../../src/hooks/useClientConfig';
import { useAuthStore } from '../../src/stores/authStore';
import { getMe, getTutorStats, getMyAdoptions, getPreferences, getPendingAdoptionConfirmations, getMyNotificationsUnreadCount } from '../../src/api/me';
import { getAdminStats } from '../../src/api/admin';
import { getPartnerAnalytics } from '../../src/api/partner';
import { getMinePets } from '../../src/api/pets';
import { getFavorites } from '../../src/api/favorites';
import { getConversations } from '../../src/api/conversations';
import { getPassedPets } from '../../src/api/swipes';
import { fetchFeed } from '../../src/api/feed';
import { spacing } from '../../src/theme';
import { getOnboardingSeen } from '../../src/storage/onboarding';
import {
  getCardsOrder,
  setCardsOrder,
  type ProfileKey,
} from '../../src/storage/homeCardsOrder';
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';

const isWeb = Platform.OS === 'web';

const LogoLight = require('../../assets/brand/logo/logo_horizontal_light.png');
const LogoDark = require('../../assets/brand/logo/logo_dark.png');
const ImgOnfire = require('../../assets/onfire.png');
const ImgPetshop = require('../../assets/petshop.png');
const ImgUltimasDoacoes = require('../../assets/ultimas_doacoes.png');

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
  const mainScrollRef = useRef<ScrollView>(null);
  const mainScrollOffsetRef = useRef(0);
  const verificationChipRef = useRef<View>(null);
  const statsRowRef = useRef<View>(null);
  const feedCardRef = useRef<View>(null);
  const meusAnunciosRef = useRef<View>(null);
  const minhasAdocoesRef = useRef<View>(null);
  const favoritosRef = useRef<View>(null);
  const footerMenuRef = useRef<View>(null);
  const [showDashboardTour, setShowDashboardTour] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [reorderDraft, setReorderDraft] = useState<string[]>([]);
  const [cardsOrder, setCardsOrderState] = useState<string[]>([]);
  const [cardsOrderLoaded, setCardsOrderLoaded] = useState(false);
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
  const isNonOngPartnerEarly = !!(user?.partner && user.partner.type !== 'ONG');
  const { data: partnerAnalytics } = useQuery({
    queryKey: ['me', 'partner', 'analytics'],
    queryFn: getPartnerAnalytics,
    enabled: isNonOngPartnerEarly,
    staleTime: 60_000,
  });

  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    let cancelled = false;
    getOnboardingSeen(uid).then((seen) => {
      if (!cancelled && !seen) setShowDashboardTour(true);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      refetchAll();
      if (isAdmin) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      }
      if (isNonOngPartnerEarly) {
        queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'analytics'] });
      }
    }, [refetchAll, isAdmin, isNonOngPartnerEarly, queryClient]),
  );
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showVerifiedInfoModal, setShowVerifiedInfoModal] = useState(false);
  const [showAdoptionsExplanationModal, setShowAdoptionsExplanationModal] = useState(false);
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
  // ONG: os 3 CTAs (Minha ONG, Anúncios da ONG, Adoções pela ONG) ficam logo abaixo dos atalhos, não no grid

  // Parceiro comercial (não ONG): não inserir card no grid; o CTA Portal do parceiro fica logo abaixo dos atalhos (para todos os parceiros)
  const isNonOngPartner = isPartnerOrMember && !isOngUser;
  if (isNonOngPartner) {
    // Não adiciona partnerPortalCard ao grid; CTA aparece abaixo de Para seu pet / Pets em alta / Últimas adoções
  }

  const profileKey: ProfileKey = isAdmin ? 'admin' : isPartnerOrMember || isOngUser ? 'partner' : 'user';

  useEffect(() => {
    let cancelled = false;
    getCardsOrder(profileKey).then((order) => {
      if (!cancelled) {
        setCardsOrderState(order);
        setCardsOrderLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, [profileKey]);

  const cardById = useMemo(() => {
    const map = new Map<string, (typeof cardsToShow)[0]>();
    for (const c of cardsToShow) map.set(c.id, c);
    return map;
  }, [cardsToShow]);

  const orderedCardsToShow = useMemo(() => {
    if (!cardsOrderLoaded || cardsOrder.length === 0) return cardsToShow;
    const fixedBefore = cardsToShow.filter((c) => c.id === 'feed');
    const fixedAfter = cardsToShow.filter(
      (c) => c.id === 'partnersArea' || c.id === 'partnerOng' || c.id === 'partnerComercial'
    );
    const draggableIds = cardsToShow.filter(
      (c) =>
        !['feed', 'partnersArea', 'partnerOng', 'partnerComercial'].includes(c.id)
    ).map((c) => c.id);
    const ordered: (typeof cardsToShow)[0][] = [...fixedBefore];
    for (const id of cardsOrder) {
      if (draggableIds.includes(id)) {
        const card = cardById.get(id);
        if (card) ordered.push(card);
      }
    }
    for (const id of draggableIds) {
      if (!cardsOrder.includes(id)) {
        const card = cardById.get(id);
        if (card) ordered.push(card);
      }
    }
    return [...ordered, ...fixedAfter];
  }, [cardsToShow, cardsOrder, cardsOrderLoaded, cardById]);

  useEffect(() => {
    if (showReorderModal) setReorderDraft(cardsOrder);
  }, [showReorderModal, cardsOrder]);

  const handleReorderSave = useCallback(async () => {
    await setCardsOrder(profileKey, reorderDraft);
    setCardsOrderState(reorderDraft);
    setShowReorderModal(false);
  }, [profileKey, reorderDraft]);

  const reorderModalData = useMemo(() => {
    const draft = reorderDraft.length > 0 ? reorderDraft : cardsOrder;
    return draft
      .map((id) => ({ key: id, card: cardById.get(id) }))
      .filter((x): x is { key: string; card: NonNullable<typeof x.card> } => !!x.card);
  }, [reorderDraft, cardsOrder, cardById]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={mainScrollRef}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          mainScrollOffsetRef.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
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
              <View style={styles.heroNameWrap}>
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
              </View>
            </View>
            <View style={styles.heroStatusRow}>
              <View style={styles.heroStatusLeft}>
                {isNonPartner &&
                  (isKycVerified ? (
                    <TouchableOpacity
                      onPress={() => setShowVerifiedInfoModal(true)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <VerifiedBadge size={18} showLabel backgroundColor={colors.primary} textColor="#fff" />
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
                    <View ref={verificationChipRef} collapsable={false}>
                      <TouchableOpacity
                        onPress={() => setShowVerificationModal(true)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.verificationChip}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                        <Text style={[styles.verificationChipText, { color: colors.primary }]}>Solicitar verificação</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
              </View>
              {user ? (
                <View style={[styles.roleBadgeWrap, { backgroundColor: roleBadgeColor + '22' }]}>
                  <Ionicons name={roleBadgeIcon} size={14} color={roleBadgeColor} />
                  <Text style={[styles.roleBadgeText, { color: roleBadgeColor }]}>{roleBadgeLabel}</Text>
                </View>
              ) : null}
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
              <View ref={statsRowRef} collapsable={false} style={[styles.statsRow, { backgroundColor: colors.surface }]}>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.primary }]}>{tutorStats.points}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>pontos</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.textSecondary }]} />
                <TouchableOpacity
                  style={styles.stat}
                  onPress={() => setShowAdoptionsExplanationModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statValue, { color: colors.primary }]}>{tutorStats.adoptedCount}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    {tutorStats.adoptedCount === 1 ? 'adoção' : 'adoções'}
                  </Text>
                </TouchableOpacity>
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

        <View style={styles.homeShortcutsRow}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/marketplace')}
            style={[styles.homeShortcutCard, { backgroundColor: colors.surface }]}
            activeOpacity={0.8}
          >
            <View style={styles.homeShortcutIconWrap}>
              <Image source={ImgPetshop} style={styles.homeShortcutImg} resizeMode="contain" />
            </View>
            <Text style={[styles.homeShortcutLabel, { color: colors.textPrimary }]} numberOfLines={1}>Para seu pet</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(tabs)/feed', params: { trending: '1' } })}
            style={[styles.homeShortcutCard, { backgroundColor: colors.surface }]}
            activeOpacity={0.8}
          >
            <View style={styles.homeShortcutIconWrap}>
              <Image source={ImgOnfire} style={styles.homeShortcutImg} resizeMode="contain" />
            </View>
            <Text style={[styles.homeShortcutLabel, { color: colors.textPrimary }]} numberOfLines={1}>Pets em alta</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/recent-adoptions')}
            style={[styles.homeShortcutCard, { backgroundColor: colors.surface }]}
            activeOpacity={0.8}
          >
            <View style={styles.homeShortcutIconWrap}>
              <Image source={ImgUltimasDoacoes} style={styles.homeShortcutImg} resizeMode="contain" />
            </View>
            <Text style={[styles.homeShortcutLabel, { color: colors.textPrimary }]} numberOfLines={1}>Últimas adoções</Text>
          </TouchableOpacity>
        </View>

        {isOngUser && (
          <View style={styles.homeShortcutsRow}>
            <TouchableOpacity
              onPress={() => router.push('/partner-portal')}
              style={[styles.homeShortcutCard, styles.ongShortcutCard, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}
              activeOpacity={0.8}
            >
              <View style={[styles.homeShortcutIconWrap, { backgroundColor: colors.primary + '30' }]}>
                <Ionicons name="business" size={26} color={colors.primary} />
              </View>
              <Text style={[styles.homeShortcutLabel, { color: colors.textPrimary }]} numberOfLines={1}>Minha ONG</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/partner-my-pets')}
              style={[styles.homeShortcutCard, styles.ongShortcutCard, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}
              activeOpacity={0.8}
            >
              <View style={[styles.homeShortcutIconWrap, { backgroundColor: colors.primary + '30' }]}>
                <Ionicons name="megaphone" size={26} color={colors.primary} />
              </View>
              <Text style={[styles.homeShortcutLabel, { color: colors.textPrimary }]} numberOfLines={1}>Anúncios da ONG</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/partner-ong-adoptions')}
              style={[styles.homeShortcutCard, styles.ongShortcutCard, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}
              activeOpacity={0.8}
            >
              <View style={[styles.homeShortcutIconWrap, { backgroundColor: colors.primary + '30' }]}>
                <Ionicons name="heart-circle" size={26} color={colors.primary} />
              </View>
              <Text style={[styles.homeShortcutLabel, { color: colors.textPrimary }]} numberOfLines={1}>Adoções pela ONG</Text>
            </TouchableOpacity>
          </View>
        )}

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

        {isNonOngPartner && (
          <TouchableOpacity
            style={[styles.adminDashboardBlock, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}
            onPress={() => router.push('/partner-portal')}
            activeOpacity={0.85}
          >
            <View style={styles.adminDashboardHeader}>
              <Ionicons name="storefront" size={22} color={colors.primary} />
              <Text style={[styles.adminDashboardTitle, { color: colors.textPrimary }]}>Resumo do parceiro</Text>
            </View>
            <View style={styles.adminDashboardGrid}>
              <View style={styles.adminDashboardCell}>
                <Text style={[styles.adminDashboardCount, { color: colors.primary }]}>
                  {partnerAnalytics?.profileViews ?? 0}
                </Text>
                <Text style={[styles.adminDashboardLabel, { color: colors.textSecondary }]}>Visualizações</Text>
              </View>
              <View style={[styles.adminDashboardCell, { borderLeftWidth: 1, borderLeftColor: colors.textSecondary + '30' }]}>
                <Text style={[styles.adminDashboardCount, { color: colors.primary }]}>
                  {partnerAnalytics?.couponCopies ?? 0}
                </Text>
                <Text style={[styles.adminDashboardLabel, { color: colors.textSecondary }]}>Cupons copiados</Text>
              </View>
              <View style={[styles.adminDashboardCell, { borderLeftWidth: 1, borderLeftColor: colors.textSecondary + '30' }]}>
                <Text style={[styles.adminDashboardCount, { color: colors.primary }]}>
                  {partnerAnalytics?.marketplaceVisits ?? 0}
                </Text>
                <Text style={[styles.adminDashboardLabel, { color: colors.textSecondary }]}>Marketplace</Text>
              </View>
            </View>
            <View style={[styles.adminDashboardCta, { backgroundColor: colors.primary + '25' }]}>
              <Text style={[styles.adminDashboardCtaText, { color: colors.primary }]}>Ir para o portal de parceiro</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.gridHeaderRow}>
          <Text style={[styles.gridSectionTitle, { color: colors.textPrimary }]}>Atalhos</Text>
          <TouchableOpacity
            onPress={() => setShowReorderModal(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.personalizeOrderBtn}
          >
            <Ionicons name="reorder-three" size={20} color={colors.primary} />
            <Text style={[styles.personalizeOrderText, { color: colors.primary }]}>Personalizar ordem</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {orderedCardsToShow.map((card) => {
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
            const cardRef =
              card.id === 'feed' ? feedCardRef
              : card.id === 'my-pets' ? meusAnunciosRef
              : card.id === 'adopted' ? minhasAdocoesRef
              : card.id === 'favorites' ? favoritosRef
              : undefined;
            return (
              <Pressable
                key={card.id}
                ref={cardRef}
                collapsable={!cardRef}
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

        <View ref={footerMenuRef} collapsable={false}>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)/add-pet')}
            activeOpacity={0.9}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.ctaButtonText}>Anunciar pet para adoção</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {user?.id && (
        <DashboardSpotlightTour
          visible={showDashboardTour}
          userId={user.id}
          scrollViewRef={mainScrollRef}
          scrollOffsetRef={mainScrollOffsetRef}
          steps={[
            {
              key: 'verification',
              targetRef: verificationChipRef,
              title: 'Solicitar verificação',
              message: 'Solicite o selo "Verificado" para seu perfil. A equipe Adopet analisa e aprova. O selo ajuda a transmitir confiança para outros usuários.',
              tooltipPlacement: 'bottom',
            },
            {
              key: 'adoptions',
              targetRef: statsRowRef,
              title: 'Pontos e adoções',
              message: 'Aqui você vê seus pontos e a quantidade de adoções confirmadas. Quanto mais adoções, mais você sobe de nível (Tutor Iniciante, Ativo, etc.). Toque no "i" para saber como ganhar pontos.',
              tooltipPlacement: 'bottom',
            },
            {
              key: 'feed',
              targetRef: feedCardRef,
              title: 'Descobrir pets',
              message: 'Toque aqui para ver o feed de pets disponíveis para adoção. Deslize para curtir (favoritar) ou passar. Use o filtro por espécie e o mapa.',
              tooltipPlacement: 'bottom',
            },
            {
              key: 'meus-anuncios',
              targetRef: meusAnunciosRef,
              title: 'Meus anúncios',
              message: 'Cadastre pets para adoção. Seus anúncios aparecem aqui e passam por análise antes de ir para o feed.',
              tooltipPlacement: 'bottom',
            },
            {
              key: 'minhas-adocoes',
              targetRef: minhasAdocoesRef,
              title: 'Minhas adoções',
              message: 'Aqui você vê os pets que adotou ou que foram adotados pelos seus anúncios.',
              tooltipPlacement: 'bottom',
            },
            {
              key: 'favoritos',
              targetRef: favoritosRef,
              title: 'Favoritos',
              message: 'Pets que você curtiu ficam aqui. Toque para ver detalhes e conversar com o tutor.',
              tooltipPlacement: 'bottom',
            },
            {
              key: 'menu',
              targetRef: footerMenuRef,
              title: 'Menu inferior',
              message: 'O menu abaixo tem as abas principais: Início, Favoritos, Anunciar, Conversas e Perfil. Use-o para navegar pelo app.',
              tooltipPlacement: 'top',
            },
          ]}
          onComplete={() => setShowDashboardTour(false)}
        />
      )}

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
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Adoções</Text> — Soma de pets que você adotou + pets que você anunciou e foram adotados (só confirmadas pela Adopet). Toque no número na home para mais detalhes.
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
        visible={showReorderModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReorderModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowReorderModal(false)} />
          <View
            style={[
              styles.reorderModal,
              { backgroundColor: colors.surface, maxHeight: modalHeight },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.reorderModalHeader, { borderBottomColor: colors.textSecondary + '30' }]}>
              <Text style={[styles.reorderModalTitle, { color: colors.textPrimary }]}>
                Personalizar ordem dos atalhos
              </Text>
              <TouchableOpacity
                hitSlop={12}
                onPress={() => setShowReorderModal(false)}
                style={styles.reorderModalClose}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.reorderModalHint, { color: colors.textSecondary }]}>
              {isWeb ? 'Use as setas para alterar a ordem' : 'Arraste os itens ou use as setas para alterar a ordem'}
            </Text>
            <View style={styles.reorderModalList}>
              {isWeb ? (
                <ScrollView showsVerticalScrollIndicator>
                  {reorderModalData.map(({ key, card }, index) => (
                    <View
                      key={key}
                      style={[
                        styles.reorderRow,
                        { backgroundColor: colors.surface, borderColor: colors.textSecondary + '20' },
                      ]}
                    >
                      <View style={styles.reorderRowArrowGroup}>
                        <TouchableOpacity
                          hitSlop={8}
                          onPress={() => {
                            if (index <= 0) return;
                            const next = [...reorderModalData];
                            [next[index - 1], next[index]] = [next[index], next[index - 1]];
                            setReorderDraft(next.map((d) => d.key));
                          }}
                          style={[styles.reorderArrowBtn, index === 0 && styles.reorderArrowBtnDisabled]}
                          disabled={index === 0}
                        >
                          <Ionicons name="chevron-up" size={20} color={index === 0 ? colors.textSecondary + '60' : colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          hitSlop={8}
                          onPress={() => {
                            if (index >= reorderModalData.length - 1) return;
                            const next = [...reorderModalData];
                            [next[index], next[index + 1]] = [next[index + 1], next[index]];
                            setReorderDraft(next.map((d) => d.key));
                          }}
                          style={[styles.reorderArrowBtn, index === reorderModalData.length - 1 && styles.reorderArrowBtnDisabled]}
                          disabled={index === reorderModalData.length - 1}
                        >
                          <Ionicons name="chevron-down" size={20} color={index === reorderModalData.length - 1 ? colors.textSecondary + '60' : colors.primary} />
                        </TouchableOpacity>
                      </View>
                      <View style={[styles.reorderRowIcon, { backgroundColor: colors.primary + '18' }]}>
                        <Ionicons name={card.icon} size={22} color={colors.primary} />
                      </View>
                      <View style={styles.reorderRowText}>
                        <Text style={[styles.reorderRowTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                          {card.title}
                        </Text>
                        <Text style={[styles.reorderRowSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                          {card.subtitle}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <DraggableFlatList
                  data={reorderModalData}
                  keyExtractor={(item) => item.key}
                  onDragEnd={({ data }) => setReorderDraft(data.map((d) => d.key))}
                  renderItem={({ item, drag, isActive }: RenderItemParams<{ key: string; card: (typeof cardsToShow)[0] }>) => (
                    <ScaleDecorator>
                      <Pressable
                        onLongPress={drag}
                        disabled={isActive}
                        style={[
                          styles.reorderRow,
                          { backgroundColor: isActive ? colors.primary + '18' : colors.surface, borderColor: colors.textSecondary + '20' },
                        ]}
                      >
                        <Ionicons name="reorder-three" size={24} color={colors.textSecondary} style={styles.reorderDragHandle} />
                        <View style={[styles.reorderRowIcon, { backgroundColor: colors.primary + '18' }]}>
                          <Ionicons name={item.card.icon} size={22} color={colors.primary} />
                        </View>
                        <View style={styles.reorderRowText}>
                          <Text style={[styles.reorderRowTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                            {item.card.title}
                          </Text>
                          <Text style={[styles.reorderRowSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.card.subtitle}
                          </Text>
                        </View>
                      </Pressable>
                    </ScaleDecorator>
                  )}
                />
              )}
            </View>
            <View style={[styles.reorderModalActions, { borderTopColor: colors.textSecondary + '30' }]}>
              <TouchableOpacity
                style={[styles.reorderModalBtnSecondary, { borderColor: colors.primary }]}
                onPress={() => setShowReorderModal(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.reorderModalBtnSecondaryText, { color: colors.primary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reorderModalBtnPrimary, { backgroundColor: colors.primary }]}
                onPress={handleReorderSave}
                activeOpacity={0.8}
              >
                <Text style={styles.reorderModalBtnPrimaryText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAdoptionsExplanationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAdoptionsExplanationModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowAdoptionsExplanationModal(false)} />
          <Pressable
            style={[styles.verificationModalCard, { backgroundColor: colors.surface, maxWidth: 340 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.verificationModalHeader}>
              <View style={[styles.verificationModalIconWrap, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="heart" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.verificationModalTitle, { color: colors.textPrimary }]}>Sobre as adoções</Text>
            </View>
            <Text style={[styles.verificationModalP, { color: colors.textSecondary }]}>
              O número de adoções reúne duas coisas:
            </Text>
            <Text style={[styles.verificationModalP, { color: colors.textSecondary, marginTop: 0 }]}>
              <Text style={{ fontWeight: '600', color: colors.textPrimary }}>• Pets que você adotou</Text> — adoções em que você foi o adotante.
            </Text>
            <Text style={[styles.verificationModalP, { color: colors.textSecondary, marginTop: 4 }]}>
              <Text style={{ fontWeight: '600', color: colors.textPrimary }}>• Pets que você anunciou e foram adotados</Text> — adoções em que você foi o tutor e outra pessoa adotou.
            </Text>
            <Text style={[styles.verificationModalP, { color: colors.textSecondary, marginTop: 12 }]}>
              Só entram adoções confirmadas pela equipe Adopet. Você pode ver o detalhe em Minhas adoções.
            </Text>
            <View style={styles.verificationModalActions}>
              <PrimaryButton
                title="Ver Minhas adoções"
                onPress={() => {
                  setShowAdoptionsExplanationModal(false);
                  router.push('/(tabs)/my-adoptions');
                }}
                style={styles.verificationModalCta}
              />
              <SecondaryButton
                title="Fechar"
                onPress={() => setShowAdoptionsExplanationModal(false)}
              />
            </View>
          </Pressable>
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

      <UsuarioVerificadoModal
        visible={showVerifiedInfoModal}
        onClose={() => setShowVerifiedInfoModal(false)}
      />

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
  heroNameWrap: { flex: 1, minWidth: 0, marginRight: spacing.sm },
  heroStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, width: '100%' },
  heroStatusLeft: { flexDirection: 'row', alignItems: 'center' },
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
  gridHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  gridSectionTitle: { fontSize: 18, fontWeight: '700' },
  personalizeOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  personalizeOrderText: { fontSize: 14, fontWeight: '600' },
  reorderModal: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    marginHorizontal: spacing.lg,
    borderRadius: 20,
    overflow: 'hidden',
  },
  reorderModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  reorderModalTitle: { fontSize: 18, fontWeight: '700' },
  reorderModalClose: { padding: spacing.xs },
  reorderModalHint: {
    fontSize: 13,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  reorderModalList: { flex: 1, minHeight: 280, maxHeight: 400 },
  reorderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
  },
  reorderDragHandle: { marginRight: spacing.sm },
  reorderRowArrowGroup: {
    marginRight: spacing.sm,
    flexDirection: 'column',
  },
  reorderArrowBtn: {
    padding: 4,
  },
  reorderArrowBtnDisabled: { opacity: 0.5 },
  reorderRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  reorderRowText: { flex: 1, minWidth: 0 },
  reorderRowTitle: { fontSize: 15, fontWeight: '700' },
  reorderRowSubtitle: { fontSize: 12, marginTop: 2 },
  reorderModalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  reorderModalBtnSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  reorderModalBtnSecondaryText: { fontSize: 16, fontWeight: '700' },
  reorderModalBtnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  reorderModalBtnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  homeShortcutsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingHorizontal: 2,
  },
  homeShortcutCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    shadowOpacity: 0.06,
    elevation: 2,
  },
  homeShortcutIconWrap: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  homeShortcutImg: {
    width: 52,
    height: 52,
  },
  homeShortcutLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  ongShortcutCard: {
    borderWidth: 1,
  },
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
  sectionTitleLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
