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
  TextInput,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, LoadingLogo, PrimaryButton, SecondaryButton, DashboardSpotlightTour, VerifiedBadge, StatusBadge } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useClientConfig } from '../../src/hooks/useClientConfig';
import { useAuthStore } from '../../src/stores/authStore';
import { getMe, getTutorStats, getMyAdoptions, getPreferences, getPendingAdoptionConfirmations, getMyNotificationsUnreadCount } from '../../src/api/me';
import { getAdminStats } from '../../src/api/admin';
import { getPartnerAnalytics, getMyPartnerOngPetsPendingCount } from '../../src/api/partner';
import { getMinePets } from '../../src/api/pets';
import { getFavorites } from '../../src/api/favorites';
import { getConversations } from '../../src/api/conversations';
import { getPassedPets } from '../../src/api/swipes';
import { fetchFeed } from '../../src/api/feed';
import { getPartners } from '../../src/api/partners';
import type { Pet } from '@adopet/shared';
import type { Partner } from '../../src/api/partners';
import { spacing } from '../../src/theme';
import { getFriendlyErrorMessage } from '../../src/utils/errorMessage';
import { getSpeciesLabel } from '../../src/utils/petLabels';
import { getMatchScoreColor } from '../../src/utils/matchScoreColor';
import { getOnboardingSeen } from '../../src/storage/onboarding';
import {
  getCardsOrder,
  setCardsOrder,
  type ProfileKey,
} from '../../src/storage/homeCardsOrder';

const LogoLight = require('../../assets/brand/logo/logo_horizontal_light.png');
const LogoDark = require('../../assets/brand/logo/logo_dark.png');
const ImgOnfire = require('../../assets/onfire.png');
const ImgPetshop = require('../../assets/petshop.png');
const ImgUltimasDoacoes = require('../../assets/ultimas_doacoes.png');

function useDashboardData() {
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status === 'granted') {
          try {
            const loc = await Location.getCurrentPositionAsync({});
            if (!cancelled) setUserCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
          } catch {
            if (!cancelled) setUserCoords(null);
          }
        }
      } catch {
        // Location pode falhar no iOS em certas condições (Expo Go, simulador, permissões)
        if (!cancelled) setUserCoords(null);
      }
    })();
    return () => {
      cancelled = true;
    };
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
  const { data: trendingFeedData, refetch: refetchTrending } = useQuery({
    queryKey: ['feed', 'trending', prefs?.radiusKm, userCoords?.lat, userCoords?.lng],
    queryFn: () =>
      fetchFeed({
        ...(userCoords && { lat: userCoords.lat, lng: userCoords.lng }),
        radiusKm: prefs?.radiusKm ?? 300,
        species: 'BOTH',
        limit: 60,
        sortBy: 'trending',
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
  const myPetsCount =
    typeof minePage?.totalCount === 'number' ? minePage.totalCount : (minePage?.items?.length ?? 0);
  const myAdoptionsCount = adoptionsData?.items?.length ?? 0;
  const favoritesCount =
    typeof favoritesPage?.totalCount === 'number'
      ? favoritesPage.totalCount
      : Array.isArray(favoritesPage?.items)
        ? favoritesPage.items.length
        : 0;
  const favoritePetIds = useMemo(
    () => new Set((favoritesPage?.items ?? []).map((i) => i.petId)),
    [favoritesPage?.items],
  );
  const unreadTotal = conversations.reduce((s, c) => s + (c.unreadCount ?? 0), 0);
  const passedCount = passedData?.items?.length ?? 0;
  const feedPreviewItems = feedData?.items ?? [];
  const feedTotalCount = feedData?.totalCount;
  const carouselFeedItems = carouselFeedData?.items ?? [];
  const trendingFeedItems = trendingFeedData?.items ?? [];

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
      refetchTrending(),
      refetchAdoptions(),
      refetchPassed(),
      refetchPendingConfirmations(),
      refetchNotificationsCount(),
    ]);
    setRefreshing(false);
  }, [refetchMine, refetchFav, refetchConv, refetchFeed, refetchCarousel, refetchTrending, refetchAdoptions, refetchPassed, refetchPendingConfirmations, refetchNotificationsCount]);

  return {
    user,
    tutorStats,
    myPetsCount,
    myAdoptionsCount,
    pendingConfirmations,
    favoritesCount,
    favoritePetIds,
    conversationsCount: conversations.length,
    unreadTotal,
    passedCount,
    feedPreviewItems,
    feedTotalCount,
    carouselFeedItems,
    trendingFeedItems,
    pendingConfirmations,
    notificationsUnreadCount: notificationsUnreadData?.count ?? 0,
    refetchAll,
    refreshing,
  };
}

export default function DashboardScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height: windowHeight } = useWindowDimensions();
  const cardGap = spacing.md;
  const cardWidth = (width - spacing.lg * 2 - cardGap) / 2;
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
    trendingFeedItems,
    pendingConfirmations,
    notificationsUnreadCount,
    favoritePetIds,
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
  const personalizeOrderRef = useRef<View>(null);
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
  /** Busca global no header */
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchPets, setGlobalSearchPets] = useState<Pet[]>([]);
  const [globalSearchPartners, setGlobalSearchPartners] = useState<Partner[]>([]);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [showGlobalSearchResults, setShowGlobalSearchResults] = useState(false);
  const [globalSearchPetsExpanded, setGlobalSearchPetsExpanded] = useState(false);
  const [globalSearchPartnersExpanded, setGlobalSearchPartnersExpanded] = useState(false);
  const [globalSearchSettingsExpanded, setGlobalSearchSettingsExpanded] = useState(false);
  const [favoriteTooltipPetId, setFavoriteTooltipPetId] = useState<string | null>(null);
  const globalSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const favoriteTooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Itens do menu Perfil para a seção Configurações na busca global (label usado no filtro). */
  const GLOBAL_SEARCH_SETTINGS_ITEMS: { id: string; label: string; route: string; icon: keyof typeof Ionicons.glyphMap }[] = useMemo(
    () => [
      { id: 'profile-edit', label: 'Editar perfil', route: '/profile-edit', icon: 'person-outline' },
      { id: 'change-password', label: 'Segurança (alterar senha)', route: '/change-password', icon: 'lock-closed-outline' },
      { id: 'notifications', label: 'Notificações', route: '/notifications', icon: 'notifications-outline' },
      { id: 'saved-searches', label: 'Buscas salvas', route: '/saved-searches', icon: 'search-outline' },
      { id: 'kyc', label: 'Solicitar verificação (KYC)', route: '/kyc', icon: 'shield-checkmark-outline' },
      { id: 'preferences', label: 'Preferências de notificações', route: '/notifications', icon: 'options-outline' },
      { id: 'my-adoption-requests', label: 'Minhas solicitações de adoção', route: '/my-adoption-requests', icon: 'document-text-outline' },
      { id: 'adoption-confirm', label: 'Confirmar adoção', route: '/adoption-confirm', icon: 'checkmark-done-outline' },
      { id: 'partner-portal', label: 'Portal do parceiro', route: '/partner-portal', icon: 'business-outline' },
      { id: 'partners', label: 'Parceiros Adopet', route: '/partners', icon: 'people-outline' },
      { id: 'bug-report', label: 'Bug report / Sugestões', route: '/bug-report-suggestion', icon: 'bug-outline' },
      { id: 'survey', label: 'Avaliar o app', route: '/survey', icon: 'stats-chart-outline' },
      { id: 'terms', label: 'Termos de Uso', route: '/terms', icon: 'document-text-outline' },
      { id: 'privacy', label: 'Política de Privacidade', route: '/privacy', icon: 'shield-checkmark-outline' },
      { id: 'export-data', label: 'Exportar meus dados (LGPD)', route: '/(tabs)/profile', icon: 'download-outline' },
    ],
    [],
  );
  const globalSearchSettingsFiltered = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return GLOBAL_SEARCH_SETTINGS_ITEMS.filter((item) => item.label.toLowerCase().includes(q));
  }, [globalSearchQuery, GLOBAL_SEARCH_SETTINGS_ITEMS]);
  /** Tamanho dos cards do carrossel "Descobrir pets" */
  const FEED_CAROUSEL_WIDTH = 110;
  const FEED_CAROUSEL_HEIGHT = 95;
  const FEED_CAROUSEL_GAP = 10;
  const FEED_CAROUSEL_ITEM_WIDTH = FEED_CAROUSEL_WIDTH + FEED_CAROUSEL_GAP;
  const feedThumbUrls = useMemo(
    () => carouselFeedItems.map((p) => p.photos?.[0]).filter(Boolean) as string[],
    [carouselFeedItems],
  );
  /** Até 20 pets com foto, ordenados por maior match score para a seção "Pets em destaque para você" */
  const featuredPets = useMemo(() => {
    const withPhoto = trendingFeedItems.filter((p) => p.photos?.length);
    const byMatch = [...withPhoto].sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    return byMatch.slice(0, 20);
  }, [trendingFeedItems]);
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
  const isOngAdmin = !!(user?.partner?.type === 'ONG');
  const { data: ongPetsPendingCount = 0 } = useQuery({
    queryKey: ['me', 'partner', 'ong-pets', 'pending-count'],
    queryFn: getMyPartnerOngPetsPendingCount,
    enabled: isOngAdmin,
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
      if (isOngAdmin) {
        queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'ong-pets', 'pending-count'] });
      }
    }, [refetchAll, isAdmin, isNonOngPartnerEarly, isOngAdmin, queryClient]),
  );
  useEffect(() => {
    if (user) setUser(user);
  }, [user, setUser]);

  const isPartnerOrMember =
    !!(user?.partner || (user?.partnerMemberships && user.partnerMemberships.length > 0));
  const isOngUser =
    !!(user?.partner?.type === 'ONG' || (user?.partnerMemberships && user.partnerMemberships.length > 0));
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
          : 'Toque no card para ver os pets da sua região',
      icon: 'paw',
      route: '/feed',
      gradient: ['#d97706', '#b45309'],
      fullWidth: true,
    },
    {
      id: 'my-pets',
      primaryShortcut: true,
      title: 'Meus anúncios',
      subtitle:
        myPetsCount === 0 ? 'Faça seu anúncio!' : `${myPetsCount} anúncio${myPetsCount !== 1 ? 's' : ''}`,
      icon: 'megaphone-outline',
      route: '/my-pets',
      badge: myPetsCount > 0 ? myPetsCount : undefined,
    },
    {
      id: 'adopted',
      primaryShortcut: true,
      title: 'Minhas adoções',
      subtitle:
        myAdoptionsCount === 0
          ? 'Ache um novo amigo'
          : myAdoptionsCount === 1
            ? '1 adoção'
            : `${myAdoptionsCount} adoções`,
      icon: 'heart-circle',
      route: '/my-adoptions',
      badge: myAdoptionsCount > 0 ? myAdoptionsCount : undefined,
    },
    {
      id: 'favorites',
      title: 'Favoritos',
      subtitle:
        favoritesCount === 0
          ? 'Curta os pets que gostar'
          : `${favoritesCount} pet${favoritesCount !== 1 ? 's' : ''}`,
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
      subtitle:
        passedCount === 0
          ? 'Deslize e reveja depois'
          : `${passedCount} pet${passedCount !== 1 ? 's' : ''} para rever`,
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
  ];

  // Card condicional: admin → Administração; demais → Conversas (notificações ficam no sino do header)
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
        id: 'chats',
        title: 'Conversas',
        subtitle:
          unreadTotal === 0
            ? 'Nenhuma nova'
            : `${unreadTotal} não lida${unreadTotal !== 1 ? 's' : ''}`,
        icon: 'chatbubbles',
        route: '/(tabs)/chats',
        badge: unreadTotal > 0 ? unreadTotal : undefined,
      };
  const mapIdx = cards.findIndex((c) => c.id === 'map');
  const cardsWithConditional =
    mapIdx >= 0 ? [...cards.slice(0, mapIdx + 1), conditionalCard, ...cards.slice(mapIdx + 1)] : cards;

  // CTAs "Sou ONG" e "Clínicas, lojas" ficam apenas na tela de boas-vindas (parceria-apresentação); não duplicamos na home
  const cardsToShow = cardsWithConditional;
  // ONG: os 3 CTAs (Minha ONG, Anúncios da ONG, Adoções pela ONG) ficam logo abaixo dos atalhos, não no grid

  // Parceiro comercial (não ONG): não inserir card no grid; o CTA Portal do parceiro fica logo abaixo dos atalhos (para todos os parceiros)
  const isNonOngPartner = isPartnerOrMember && !isOngUser;
  if (isNonOngPartner) {
    // Não adiciona partnerPortalCard ao grid; CTA aparece abaixo de Para seu pet / Pets em alta / Últimas adoções
  }

  const cardById = useMemo(() => {
    const map = new Map<string, (typeof cardsToShow)[0]>();
    for (const c of cardsToShow) map.set(c.id, c);
    return map;
  }, [cardsToShow]);

  const orderedCardsToShow = useMemo(() => {
    if (!cardsOrderLoaded || cardsOrder.length === 0) return cardsToShow;
    const fixedBefore = cardsToShow.filter((c) => c.id === 'feed');
    const fixedAfter = cardsToShow.filter((c) => c.id === 'partnersArea');
    const draggableIds = cardsToShow
      .filter((c) => c.id !== 'feed' && c.id !== 'partnersArea')
      .map((c) => c.id);
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

  /** Busca global: debounce 300ms, mínimo 2 caracteres */
  useEffect(() => {
    const query = globalSearchQuery.trim();
    if (globalSearchDebounceRef.current) {
      clearTimeout(globalSearchDebounceRef.current);
      globalSearchDebounceRef.current = null;
    }
    if (query.length < 2) {
      setGlobalSearchPets([]);
      setGlobalSearchPartners([]);
      setShowGlobalSearchResults(false);
      return;
    }
    globalSearchDebounceRef.current = setTimeout(() => {
      globalSearchDebounceRef.current = null;
      setGlobalSearchLoading(true);
      setShowGlobalSearchResults(true);
      Promise.all([
        fetchFeed({ q: query, limit: 12 }),
        getPartners(undefined, query),
      ])
        .then(([feedRes, partnersList]) => {
          setGlobalSearchPets(feedRes.items ?? []);
          setGlobalSearchPartners(partnersList ?? []);
        })
        .catch(() => {
          setGlobalSearchPets([]);
          setGlobalSearchPartners([]);
        })
        .finally(() => setGlobalSearchLoading(false));
    }, 300);
    return () => {
      if (globalSearchDebounceRef.current) clearTimeout(globalSearchDebounceRef.current);
    };
  }, [globalSearchQuery]);

  /** Recolher seções ao mudar o termo de busca */
  useEffect(() => {
    setGlobalSearchPetsExpanded(false);
    setGlobalSearchPartnersExpanded(false);
    setGlobalSearchSettingsExpanded(false);
  }, [globalSearchQuery]);

  /** Tooltip do badge de favorito: some após 2,5 s */
  useEffect(() => {
    if (!favoriteTooltipPetId) return;
    if (favoriteTooltipTimeoutRef.current) clearTimeout(favoriteTooltipTimeoutRef.current);
    favoriteTooltipTimeoutRef.current = setTimeout(() => {
      favoriteTooltipTimeoutRef.current = null;
      setFavoriteTooltipPetId(null);
    }, 2500);
    return () => {
      if (favoriteTooltipTimeoutRef.current) clearTimeout(favoriteTooltipTimeoutRef.current);
    };
  }, [favoriteTooltipPetId]);

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

  if (isLoading && !user) {
    return (
      <View style={[styles.screen, { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <LoadingLogo size={140} />
      </View>
    );
  }
  if (isError && !user) {
    return (
      <View style={[styles.screen, { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: spacing.lg }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} style={{ marginBottom: spacing.md }} />
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm, textAlign: 'center' }}>
          Não foi possível carregar o perfil
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' }}>
          Verifique sua conexão e tente novamente.
        </Text>
        <PrimaryButton title="Tentar de novo" onPress={() => refetchMe()} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header com busca global e notificações (apenas logado) */}
      {user && (
        <View
          style={[
            styles.homeHeader,
            {
              paddingTop: insets.top + spacing.sm,
              paddingBottom: spacing.sm,
              paddingHorizontal: spacing.lg,
              backgroundColor: colors.headerBg,
              borderBottomWidth: 1,
              borderBottomColor: colors.textSecondary + '20',
            },
          ]}
        >
          <View style={[styles.homeHeaderSearchWrap, { backgroundColor: colors.surface }]}>
            <Ionicons name="search-outline" size={20} color={colors.textSecondary} style={styles.homeHeaderSearchIcon} />
            <TextInput
              style={[styles.homeHeaderSearchInput, { color: colors.textPrimary, paddingRight: globalSearchQuery.length > 0 ? 36 : 4 }]}
              placeholder="Buscar pets, parceiros, configurações..."
              placeholderTextColor={colors.textSecondary}
              value={globalSearchQuery}
              onChangeText={setGlobalSearchQuery}
              onFocus={() => {
                if (globalSearchQuery.trim().length >= 2) setShowGlobalSearchResults(true);
              }}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              accessibilityLabel="Busca global"
              accessibilityHint="Digite para buscar pets e parceiros"
            />
            {globalSearchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setGlobalSearchQuery('')}
                style={styles.homeHeaderSearchClear}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Limpar busca"
              >
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : globalSearchLoading ? (
              <Ionicons name="sync" size={18} color={colors.textSecondary} style={styles.homeHeaderSearchLoading} />
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => router.push('/notifications')}
            style={styles.homeHeaderBellWrap}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel={notificationsUnreadCount > 0 ? `${notificationsUnreadCount} notificações não lidas` : 'Notificações'}
          >
            <View>
              <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
              {notificationsUnreadCount > 0 && (
                <View
                  style={[
                    styles.homeHeaderBellBadge,
                    { backgroundColor: colors.accent || '#E11D48' },
                  ]}
                >
                  <Text style={styles.homeHeaderBellBadgeText}>
                    {notificationsUnreadCount > 99 ? '99+' : notificationsUnreadCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      )}
      {/* Overlay de resultados da busca global — começa abaixo do header; área ocupa quase a tela inteira */}
      {user && showGlobalSearchResults && globalSearchQuery.trim().length >= 2 && (() => {
        const headerHeight = insets.top + 40 + spacing.sm * 2;
        const tabBarReserve = 100;
        const resultsAreaHeight = Math.max(280, windowHeight - headerHeight - tabBarReserve);
        /** Recolhido: nenhum item. Expandido: todos os itens (rolagem na lista). */
        const petsToShow = globalSearchPetsExpanded ? globalSearchPets : [];
        const partnersToShow = globalSearchPartnersExpanded ? globalSearchPartners : [];
        const settingsToShow = globalSearchSettingsExpanded ? globalSearchSettingsFiltered : [];
        const hasAnyResults = globalSearchPets.length > 0 || globalSearchPartners.length > 0 || globalSearchSettingsFiltered.length > 0;
        return (
          <>
            <Pressable
              style={[styles.globalSearchBackdrop, { top: headerHeight }]}
              onPress={() => {
                Keyboard.dismiss();
                setShowGlobalSearchResults(false);
              }}
            />
            <View
              style={[
                styles.globalSearchOverlay,
                {
                  backgroundColor: colors.background,
                  top: headerHeight,
                  paddingHorizontal: spacing.lg,
                  paddingTop: spacing.md,
                },
              ]}
              pointerEvents="box-none"
            >
              <ScrollView
                style={[styles.globalSearchResultsScroll, { maxHeight: resultsAreaHeight }]}
                contentContainerStyle={styles.globalSearchResultsContent}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator={true}
              >
                {globalSearchLoading ? (
                  <View style={[styles.globalSearchStateWrap, { backgroundColor: colors.surface }]}>
                    <Ionicons name="sync" size={28} color={colors.primary} style={styles.globalSearchStateIcon} />
                    <Text style={[styles.globalSearchStateText, { color: colors.textPrimary }]}>Buscando...</Text>
                    <Text style={[styles.globalSearchStateSub, { color: colors.textSecondary }]}>Pets e parceiros</Text>
                  </View>
                ) : !hasAnyResults ? (
                  <View style={[styles.globalSearchStateWrap, { backgroundColor: colors.surface }]}>
                    <Ionicons name="search-outline" size={40} color={colors.textSecondary} style={styles.globalSearchStateIcon} />
                    <Text style={[styles.globalSearchStateText, { color: colors.textPrimary }]}>Nenhum resultado</Text>
                    <Text style={[styles.globalSearchStateSub, { color: colors.textSecondary }]}>Tente outro termo</Text>
                  </View>
                ) : null}
                {!globalSearchLoading && globalSearchPets.length > 0 && (
                  <View style={[styles.globalSearchSectionCard, { backgroundColor: colors.surface, borderColor: colors.textSecondary + '25' }]}>
                    <TouchableOpacity
                      style={styles.globalSearchSectionHeader}
                      onPress={() => setGlobalSearchPetsExpanded((v) => !v)}
                      activeOpacity={0.8}
                      accessibilityLabel={globalSearchPetsExpanded ? 'Recolher seção Pets' : 'Expandir seção Pets'}
                      accessibilityState={{ expanded: globalSearchPetsExpanded }}
                    >
                      <View style={[styles.globalSearchSectionIconWrap, { backgroundColor: colors.primary + '20' }]}>
                        <Ionicons name="paw" size={18} color={colors.primary} />
                      </View>
                      <Text style={[styles.globalSearchSectionTitle, { color: colors.textPrimary }]}>Pets</Text>
                      <Text style={[styles.globalSearchSectionCount, { color: colors.textSecondary }]}>{globalSearchPets.length}</Text>
                      {globalSearchPets.length > 0 && (
                        <Ionicons
                          name={globalSearchPetsExpanded ? 'chevron-up' : 'chevron-down'}
                          size={22}
                          color={colors.textSecondary}
                          style={styles.globalSearchSectionChevron}
                        />
                      )}
                    </TouchableOpacity>
                    {petsToShow.map((pet) => (
                      <TouchableOpacity
                        key={pet.id}
                        style={[styles.globalSearchRow, { borderTopWidth: 1, borderTopColor: colors.textSecondary + '15' }]}
                        onPress={() => {
                          setGlobalSearchQuery('');
                          setShowGlobalSearchResults(false);
                          Keyboard.dismiss();
                          router.push(`/(tabs)/pet/${pet.id}`);
                        }}
                        activeOpacity={0.7}
                      >
                        {pet.photos?.[0] ? (
                          <Image source={{ uri: pet.photos[0] }} style={styles.globalSearchRowImage} />
                        ) : (
                          <View style={[styles.globalSearchRowImage, styles.globalSearchRowImagePlaceholder, { backgroundColor: colors.background }]}>
                            <Ionicons name="paw" size={22} color={colors.textSecondary} />
                          </View>
                        )}
                        <View style={styles.globalSearchRowText}>
                          <Text style={[styles.globalSearchRowTitle, { color: colors.textPrimary }]} numberOfLines={1}>{pet.name}</Text>
                          <Text style={[styles.globalSearchRowSub, { color: colors.textSecondary }]} numberOfLines={1}>
                            {getSpeciesLabel(pet.species)}
                            {typeof pet.age === 'number' ? ` · ${pet.age} ${pet.age === 1 ? 'ano' : 'anos'}` : ''}
                            {pet.city ? ` · ${pet.city}` : ''}
                          </Text>
                        </View>
                        {favoritePetIds.has(pet.id) && (
                          <View style={styles.globalSearchRowFavoriteBadgeWrap}>
                            {favoriteTooltipPetId === pet.id && (
                              <View
                                style={[
                                  styles.globalSearchRowFavoriteTooltip,
                                  { backgroundColor: colors.surface, borderColor: colors.textSecondary + '30' },
                                ]}
                              >
                                <Text style={[styles.globalSearchRowFavoriteTooltipText, { color: colors.textPrimary }]}>
                                  Este pet está na sua lista de favoritos
                                </Text>
                              </View>
                            )}
                            <Pressable
                              style={[styles.globalSearchRowFavoriteBadge, { backgroundColor: colors.accent + '20' }]}
                              onLongPress={() => setFavoriteTooltipPetId(pet.id)}
                              accessibilityLabel="Nos favoritos"
                              accessibilityHint="Toque e segure para ver a dica"
                            >
                              <Ionicons name="heart" size={16} color={colors.accent || '#E11D48'} />
                            </Pressable>
                          </View>
                        )}
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {!globalSearchLoading && globalSearchPartners.length > 0 && (
                  <View style={[styles.globalSearchSectionCard, { backgroundColor: colors.surface, borderColor: colors.textSecondary + '25' }]}>
                    <TouchableOpacity
                      style={styles.globalSearchSectionHeader}
                      onPress={() => setGlobalSearchPartnersExpanded((v) => !v)}
                      activeOpacity={0.8}
                      accessibilityLabel={globalSearchPartnersExpanded ? 'Recolher seção Parceiros' : 'Expandir seção Parceiros'}
                      accessibilityState={{ expanded: globalSearchPartnersExpanded }}
                    >
                      <View style={[styles.globalSearchSectionIconWrap, { backgroundColor: colors.primary + '20' }]}>
                        <Ionicons name="business" size={18} color={colors.primary} />
                      </View>
                      <Text style={[styles.globalSearchSectionTitle, { color: colors.textPrimary }]}>Parceiros</Text>
                      <Text style={[styles.globalSearchSectionCount, { color: colors.textSecondary }]}>{globalSearchPartners.length}</Text>
                      {globalSearchPartners.length > 0 && (
                        <Ionicons
                          name={globalSearchPartnersExpanded ? 'chevron-up' : 'chevron-down'}
                          size={22}
                          color={colors.textSecondary}
                          style={styles.globalSearchSectionChevron}
                        />
                      )}
                    </TouchableOpacity>
                    {partnersToShow.map((partner) => (
                      <TouchableOpacity
                        key={partner.id}
                        style={[styles.globalSearchRow, { borderTopWidth: 1, borderTopColor: colors.textSecondary + '15' }]}
                        onPress={() => {
                          setGlobalSearchQuery('');
                          setShowGlobalSearchResults(false);
                          Keyboard.dismiss();
                          router.push(`/(tabs)/partners/${partner.id}`);
                        }}
                        activeOpacity={0.7}
                      >
                        {partner.logoUrl ? (
                          <Image source={{ uri: partner.logoUrl }} style={styles.globalSearchRowImage} />
                        ) : (
                          <View style={[styles.globalSearchRowImage, styles.globalSearchRowImagePlaceholder, { backgroundColor: colors.background }]}>
                            <Ionicons name="business" size={22} color={colors.textSecondary} />
                          </View>
                        )}
                        <View style={styles.globalSearchRowText}>
                          <Text style={[styles.globalSearchRowTitle, { color: colors.textPrimary }]} numberOfLines={1}>{partner.name}</Text>
                          <Text style={[styles.globalSearchRowSub, { color: colors.textSecondary }]} numberOfLines={1}>
                            {partner.city ?? partner.type ?? 'Parceiro'}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {!globalSearchLoading && globalSearchSettingsFiltered.length > 0 && (
                  <View style={[styles.globalSearchSectionCard, { backgroundColor: colors.surface, borderColor: colors.textSecondary + '25' }]}>
                    <TouchableOpacity
                      style={styles.globalSearchSectionHeader}
                      onPress={() => setGlobalSearchSettingsExpanded((v) => !v)}
                      activeOpacity={0.8}
                      accessibilityLabel={globalSearchSettingsExpanded ? 'Recolher seção Configurações' : 'Expandir seção Configurações'}
                      accessibilityState={{ expanded: globalSearchSettingsExpanded }}
                    >
                      <View style={[styles.globalSearchSectionIconWrap, { backgroundColor: colors.primary + '20' }]}>
                        <Ionicons name="settings-outline" size={18} color={colors.primary} />
                      </View>
                      <Text style={[styles.globalSearchSectionTitle, { color: colors.textPrimary }]}>Configurações</Text>
                      <Text style={[styles.globalSearchSectionCount, { color: colors.textSecondary }]}>{globalSearchSettingsFiltered.length}</Text>
                      {globalSearchSettingsFiltered.length > 0 && (
                        <Ionicons
                          name={globalSearchSettingsExpanded ? 'chevron-up' : 'chevron-down'}
                          size={22}
                          color={colors.textSecondary}
                          style={styles.globalSearchSectionChevron}
                        />
                      )}
                    </TouchableOpacity>
                    {settingsToShow.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.globalSearchRow, { borderTopWidth: 1, borderTopColor: colors.textSecondary + '15' }]}
                        onPress={() => {
                          setGlobalSearchQuery('');
                          setShowGlobalSearchResults(false);
                          Keyboard.dismiss();
                          router.push(item.route as any);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.globalSearchRowImage, styles.globalSearchRowImagePlaceholder, { backgroundColor: colors.primary + '18' }]}>
                          <Ionicons name={item.icon} size={22} color={colors.primary} />
                        </View>
                        <View style={styles.globalSearchRowText}>
                          <Text style={[styles.globalSearchRowTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.label}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>
            </View>
          </>
        );
      })()}
      <ScrollView
        ref={mainScrollRef}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          mainScrollOffsetRef.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: user ? spacing.md : insets.top + spacing.md,
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

        <View style={styles.spotlightSection}>
          <View style={styles.spotlightHeader}>
            <Text style={[styles.spotlightTitle, { color: colors.textPrimary }]}>Pets em destaque para você</Text>
            {featuredPets.length > 0 ? (
              <TouchableOpacity onPress={() => router.push('/feed')} hitSlop={12}>
                <Text style={[styles.spotlightVerTodos, { color: colors.primary }]}>Ver todos</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {featuredPets.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.spotlightScrollContent}
            >
              {featuredPets.map((pet) => (
                <TouchableOpacity
                  key={pet.id}
                  style={[styles.spotlightCard, { backgroundColor: colors.surface }]}
                  onPress={() => router.push({ pathname: '/(tabs)/feed', params: { petId: pet.id, trending: '1' } })}
                  activeOpacity={0.85}
                >
                  <View style={styles.spotlightCardImageWrap}>
                    <Image
                      source={{ uri: pet.photos[0] }}
                      style={styles.spotlightCardImage}
                      resizeMode="cover"
                    />
                    <View style={styles.spotlightTopRightBadges}>
                      {typeof pet.matchScore === 'number' && (
                        <View style={[styles.spotlightMatchBadge, { backgroundColor: getMatchScoreColor(pet.matchScore) + 'e6' }]}>
                          <Text style={styles.spotlightMatchBadgeText}>{pet.matchScore}%</Text>
                        </View>
                      )}
                      {pet.verified && (
                        <View style={styles.spotlightVerifiedWrap}>
                          <VerifiedBadge variant="pet" size={20} iconBackgroundColor={colors.primary} />
                        </View>
                      )}
                    </View>
                    {pet.partner && (
                      <View
                        style={[
                          styles.spotlightPartnerBadge,
                          {
                            backgroundColor: (pet.partner as { isPaidPartner?: boolean }).isPaidPartner
                              ? 'rgba(251, 191, 36, 0.95)'
                              : 'rgba(217, 119, 6, 0.92)',
                          },
                        ]}
                      >
                        {(pet.partner as { logoUrl?: string }).logoUrl ? (
                          <Image
                            source={{ uri: (pet.partner as { logoUrl: string }).logoUrl }}
                            style={styles.spotlightPartnerLogo}
                            resizeMode="contain"
                          />
                        ) : (
                          <Ionicons
                            name={(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? 'star' : 'heart'}
                            size={12}
                            color="#fff"
                          />
                        )}
                        <Text style={styles.spotlightPartnerText}>
                          {(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? 'Patrocinado' : 'Parceiro'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={[styles.spotlightCardNameWrap, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.spotlightCardName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {pet.name}
                    </Text>
                    <Text style={[styles.spotlightCardMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                      {getSpeciesLabel(pet.species)}
                      {typeof pet.age === 'number' ? ` • ${pet.age} ${pet.age === 1 ? 'ano' : 'anos'}` : ''}
                    </Text>
                    <View style={styles.spotlightCardBadges}>
                      <StatusBadge
                        label={pet.vaccinated ? 'Vacinado' : 'Não vacinado'}
                        variant={pet.vaccinated ? 'success' : 'warning'}
                      />
                      {typeof pet.neutered === 'boolean' && (
                        <StatusBadge
                          label={pet.neutered ? 'Castrado' : 'Não castrado'}
                          variant={pet.neutered ? 'success' : 'warning'}
                        />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.spotlightEmpty, { backgroundColor: colors.surface }]}>
              <Ionicons name="paw-outline" size={40} color={colors.textSecondary} style={styles.spotlightEmptyIcon} />
              <Text style={[styles.spotlightEmptyText, { color: colors.textSecondary }]}>
                Ainda não há pets em destaque. Anuncie ou volte em breve.
              </Text>
              <View style={styles.spotlightEmptyActions}>
                <TouchableOpacity
                  style={[styles.spotlightEmptyBtn, { backgroundColor: colors.primary }]}
                  onPress={() => router.push('/feed')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.spotlightEmptyBtnText}>Ver feed</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.spotlightEmptyBtn, styles.spotlightEmptyBtnSecondary, { borderColor: colors.primary }]}
                  onPress={() => router.push('/(tabs)/add-pet')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.spotlightEmptyBtnTextSecondary, { color: colors.primary }]}>Anunciar pet</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Card "Descobrir pets" — sem carrossel, após "Pets em destaque para você" */}
        <View ref={feedCardRef} style={{ marginBottom: spacing.lg }} collapsable={false}>
          <View style={styles.cardWrapFeedHero}>
            <LinearGradient
              colors={['#d97706', '#b45309']}
              style={[styles.cardFeedHero, { borderRadius: 16, overflow: 'hidden' }]}
            >
              <View style={styles.feedCardContent}>
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
                    ) : (
                      <Text style={[styles.feedCardSubtitle, { color: 'rgba(255,255,255,0.9)' }]} numberOfLines={1}>
                        Nenhum pet no momento na sua região
                      </Text>
                    )}
                    <Text style={[styles.feedCardActionPhrase, { color: 'rgba(255,255,255,0.9)' }]}>
                      {feedThumbUrls.length > 0 ? 'Toque para ver no feed ou no mapa' : 'Explore no feed ou no mapa'}
                    </Text>
                  </View>
                </View>
                <View style={styles.feedCardButtonsRow}>
                  <TouchableOpacity
                    style={styles.feedCardVerPetsButton}
                    onPress={() => router.push('/feed')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.feedCardVerPetsButtonText}>Ver pets</Text>
                    <Ionicons name="chevron-forward" size={18} color="#b45309" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.feedCardMapButton}
                    onPress={() => router.push('/map')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="map" size={18} color="#fff" />
                    <Text style={styles.feedCardMapButtonText}>Ver no mapa</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>

        <View style={[styles.homeShortcutsRow, styles.homeShortcutsRowCompact]}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/marketplace')}
            style={[styles.homeShortcutCard, styles.homeShortcutCardCompact, { backgroundColor: colors.surface }]}
            activeOpacity={0.8}
          >
            <View style={[styles.homeShortcutIconWrap, styles.homeShortcutIconWrapCompact]}>
              <Image source={ImgPetshop} style={[styles.homeShortcutImg, styles.homeShortcutImgCompact]} resizeMode="contain" />
            </View>
            <Text style={[styles.homeShortcutLabel, styles.homeShortcutLabelCompact, { color: colors.textPrimary }]} numberOfLines={1}>Para seu pet</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(tabs)/feed', params: { trending: '1' } })}
            style={[styles.homeShortcutCard, styles.homeShortcutCardCompact, { backgroundColor: colors.surface }]}
            activeOpacity={0.8}
          >
            <View style={[styles.homeShortcutIconWrap, styles.homeShortcutIconWrapCompact]}>
              <Image source={ImgOnfire} style={[styles.homeShortcutImg, styles.homeShortcutImgCompact]} resizeMode="contain" />
            </View>
            <Text style={[styles.homeShortcutLabel, styles.homeShortcutLabelCompact, { color: colors.textPrimary }]} numberOfLines={1}>Pets em alta</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/recent-adoptions')}
            style={[styles.homeShortcutCard, styles.homeShortcutCardCompact, { backgroundColor: colors.surface }]}
            activeOpacity={0.8}
          >
            <View style={[styles.homeShortcutIconWrap, styles.homeShortcutIconWrapCompact]}>
              <Image source={ImgUltimasDoacoes} style={[styles.homeShortcutImg, styles.homeShortcutImgCompact]} resizeMode="contain" />
            </View>
            <Text style={[styles.homeShortcutLabel, styles.homeShortcutLabelCompact, { color: colors.textPrimary }]} numberOfLines={1}>Últimas adoções</Text>
          </TouchableOpacity>
        </View>

        {isOngAdmin && (
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
              {ongPetsPendingCount > 0 && (
                <View style={[styles.homeShortcutBadge, { backgroundColor: '#D97706' }]}>
                  <Text style={styles.homeShortcutBadgeText}>{ongPetsPendingCount}</Text>
                </View>
              )}
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
          <View ref={personalizeOrderRef} collapsable={false}>
            <TouchableOpacity
              onPress={() => setShowReorderModal(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.personalizeOrderBtn}
            >
              <Ionicons name="reorder-three" size={20} color={colors.primary} />
              <Text style={[styles.personalizeOrderText, { color: colors.primary }]}>Personalizar ordem</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.grid}>
          {orderedCardsToShow
            .filter((card) => card.id !== 'feed')
            .map((card) => {
            const isFull = card.fullWidth;
            const isFeedCard = false;
            const feedCarouselData = isFeedCard && feedThumbUrls.length > 0 ? [...feedThumbUrls, ...feedThumbUrls, ...feedThumbUrls] : [];
            const feedCarouselSegmentWidth = feedThumbUrls.length > 0 ? FEED_CAROUSEL_ITEM_WIDTH * feedThumbUrls.length : 0;
            const content = isFeedCard && feedThumbUrls.length > 0 ? (
              <View style={styles.feedCardContent}>
                <ScrollView
                  ref={feedCarouselRef}
                  style={styles.feedCarouselScrollView}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  snapToInterval={FEED_CAROUSEL_ITEM_WIDTH}
                  snapToAlignment="start"
                  contentContainerStyle={[
                    styles.feedCarouselContent,
                    styles.feedCarouselContentBanner,
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
                      style={[styles.feedThumbBanner, { width: FEED_CAROUSEL_WIDTH, height: FEED_CAROUSEL_HEIGHT, marginRight: i < feedCarouselData.length - 1 ? FEED_CAROUSEL_GAP : 0 }]}
                    />
                  ))}
                </ScrollView>
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
                      Toque no card para ver os pets disponíveis
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.feedCardVerPetsButton}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    router.push('/feed');
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.feedCardVerPetsButtonText}>Ver pets</Text>
                  <Ionicons name="chevron-forward" size={18} color="#b45309" />
                </TouchableOpacity>
              </View>
            ) : isFeedCard && feedPreviewItems.length === 0 ? (
              <View style={styles.feedCardContent}>
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
            ) : card.id === 'partnersArea' || card.id === 'partnerPortal' || card.id === 'ongPortal' || card.id === 'ongMyPets' || card.id === 'ongAdoptions' ? (
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
              key: 'personalize-order',
              targetRef: personalizeOrderRef,
              title: 'Personalizar ordem dos botões',
              message: 'Toque aqui para alterar a ordem dos atalhos da tela inicial. Arraste os itens para deixar como preferir.',
              tooltipPlacement: 'bottom',
            },
            {
              key: 'feed',
              targetRef: feedCardRef,
              title: 'Descobrir pets',
              message: 'Toque aqui para ver o feed de pets disponíveis para adoção. Deslize para curtir (favoritar) ou passar. Use o filtro por espécie e o mapa.',
              tooltipPlacement: 'bottom',
            },
          ]}
          onComplete={() => setShowDashboardTour(false)}
        />
      )}

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
              {
                backgroundColor: colors.surface,
                minHeight: Math.min(Math.max(420, windowHeight * 0.55), 560),
                maxHeight: modalHeight,
              },
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
              Use as setas para alterar a ordem
            </Text>
            <ScrollView
              style={[styles.reorderModalList, { minHeight: 280 }]}
              contentContainerStyle={styles.reorderModalListContent}
              showsVerticalScrollIndicator
            >
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

    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  homeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  homeHeaderSearchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
  },
  homeHeaderSearchIcon: { marginRight: spacing.sm },
  homeHeaderSearchInput: { flex: 1, fontSize: 15, paddingVertical: 8, paddingRight: 4 },
  homeHeaderSearchClear: { position: 'absolute', right: 8, top: 0, bottom: 0, justifyContent: 'center' },
  homeHeaderSearchLoading: { marginLeft: spacing.xs },
  homeHeaderBellWrap: { padding: 8 },
  homeHeaderBellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  homeHeaderBellBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  globalSearchBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 999,
  },
  globalSearchOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  globalSearchResultsScroll: {},
  globalSearchResultsContent: { paddingBottom: spacing.xl },
  globalSearchStateWrap: {
    borderRadius: 16,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  globalSearchStateIcon: { marginBottom: spacing.sm },
  globalSearchStateText: { fontSize: 17, fontWeight: '600' },
  globalSearchStateSub: { fontSize: 14, marginTop: 4 },
  globalSearchSectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  globalSearchSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  globalSearchSectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  globalSearchSectionTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  globalSearchSectionCount: { fontSize: 13 },
  globalSearchSectionChevron: { marginLeft: spacing.xs },
  globalSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  globalSearchRowImage: { width: 48, height: 48, borderRadius: 12 },
  globalSearchRowImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  globalSearchRowText: { flex: 1, marginLeft: spacing.md, minWidth: 0 },
  globalSearchRowFavoriteBadgeWrap: { position: 'relative', marginRight: spacing.xs },
  globalSearchRowFavoriteBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  globalSearchRowFavoriteTooltip: {
    position: 'absolute',
    bottom: 36,
    right: 0,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    shadowOpacity: 0.15,
    elevation: 4,
    width: 220,
    zIndex: 10,
  },
  globalSearchRowFavoriteTooltipText: { fontSize: 12, textAlign: 'center', lineHeight: 16 },
  globalSearchRowTitle: { fontSize: 16, fontWeight: '600' },
  globalSearchRowSub: { fontSize: 13, marginTop: 2 },
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
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
  reorderModalListContent: { paddingBottom: spacing.md },
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
  homeShortcutsRowCompact: {
    marginBottom: spacing.md,
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
  homeShortcutCardCompact: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: 12,
    minHeight: 44,
  },
  homeShortcutIconWrap: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  homeShortcutIconWrapCompact: {
    width: 36,
    height: 36,
    marginBottom: spacing.xs,
  },
  homeShortcutImg: {
    width: 52,
    height: 52,
  },
  homeShortcutImgCompact: {
    width: 36,
    height: 36,
  },
  homeShortcutLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  homeShortcutLabelCompact: {
    fontSize: 11,
    fontWeight: '600',
  },
  homeShortcutBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  homeShortcutBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  ongShortcutCard: {
    borderWidth: 1,
    position: 'relative',
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
    minHeight: 180,
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
  feedCardButtonsRow: { flexDirection: 'row', gap: spacing.sm },
  feedCardVerPetsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 18,
    paddingHorizontal: spacing.sm,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  feedCardVerPetsButtonText: { color: '#b45309', fontSize: 16, fontWeight: '700' },
  feedCardTitle: { fontSize: 16, fontWeight: '800' },
  feedCardTitleHero: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  feedCardNumberHero: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  feedCardActionPhrase: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  feedCardSubtitle: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  feedThumbsRow: { flexDirection: 'row', gap: 6, marginTop: spacing.xs },
  feedCarouselScrollView: { backgroundColor: 'transparent' },
  feedCarouselContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingVertical: 2,
    backgroundColor: 'transparent',
  },
  feedCarouselContentBanner: { marginBottom: spacing.sm },
  feedThumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.15)' },
  feedThumbLarge: { borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.15)' },
  feedThumbBanner: { borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.15)' },
  spotlightSection: { marginBottom: spacing.lg },
  spotlightHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  spotlightTitle: { fontSize: 18, fontWeight: '800' },
  spotlightVerTodos: { fontSize: 14, fontWeight: '600' },
  spotlightEmpty: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
  },
  spotlightEmptyIcon: { marginBottom: spacing.sm },
  spotlightEmptyText: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: spacing.md },
  spotlightEmptyActions: { flexDirection: 'row', gap: spacing.sm },
  spotlightEmptyBtn: { paddingVertical: 12, paddingHorizontal: spacing.lg, borderRadius: 12 },
  spotlightEmptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  spotlightEmptyBtnSecondary: { backgroundColor: 'transparent', borderWidth: 2 },
  spotlightEmptyBtnTextSecondary: { fontSize: 15, fontWeight: '600' },
  spotlightScrollContent: { paddingRight: spacing.lg },
  spotlightCard: {
    width: 180,
    marginRight: spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
  },
  spotlightCardImageWrap: { position: 'relative', width: 180, height: 200 },
  spotlightCardImage: { width: 180, height: 200, backgroundColor: 'rgba(0,0,0,0.08)' },
  spotlightTopRightBadges: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 1,
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },
  spotlightMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  spotlightMatchBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  spotlightVerifiedWrap: {},
  spotlightPartnerBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    zIndex: 1,
  },
  spotlightPartnerLogo: { width: 14, height: 14, borderRadius: 7 },
  spotlightPartnerText: { fontSize: 10, fontWeight: '600', color: '#fff' },
  spotlightCardNameWrap: { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  spotlightCardName: { fontSize: 15, fontWeight: '700' },
  spotlightCardMeta: { fontSize: 12, marginTop: 2 },
  spotlightCardBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  feedThumbMore: { alignItems: 'center', justifyContent: 'center' },
  feedThumbMoreText: { color: 'rgba(255,255,255,0.95)', fontSize: 14, fontWeight: '700' },
  feedCardMapButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 18,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
  },
  feedCardMapButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
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
});
