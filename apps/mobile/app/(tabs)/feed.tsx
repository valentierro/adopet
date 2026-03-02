import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useRouter, useNavigation, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, FlatList, Pressable, Modal, useWindowDimensions, Dimensions, Alert, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { SwipeableCard, FeedCard, MatchOverlay, Toast, EmptyState, LoadingLogo, VerifiedBadge, PrimaryButton, SecondaryButton, GuestWelcomeSheet, OnboardingSlidesSheet, NotificationBanner } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { fetchFeed, type FeedResponse, type FeedSpeciesFilter, type FeedTriageFilters, type FeedPartnerFilter } from '../../src/api/feed';
import { createSwipe } from '../../src/api/swipes';
import { addFavorite } from '../../src/api/favorites';
import { recordPetView } from '../../src/api/pets';
import { trackEvent } from '../../src/analytics';
import { getPreferences, updatePreferences } from '../../src/api/me';
import { useUpdateCityFromLocation } from '../../src/hooks/useUpdateCityFromLocation';
import { useResponsiveGridColumns } from '../../src/hooks/useResponsiveGridColumns';
import { getMatchScoreColor } from '../../src/utils/matchScoreColor';
import { getViewedPetIds } from '../../src/utils/viewedPets';
import { useAuthStore } from '../../src/stores/authStore';
import { spacing } from '../../src/theme';

type FeedItem = FeedResponse['items'][number];

const FEED_QUERY_KEY = ['feed'];
const GRID_GAP = spacing.sm;
const GRID_PADDING = spacing.md;
/** Padding lateral do grid na tela (menor que GRID_PADDING para não cortar o card da direita) */
const GRID_SCREEN_PADDING = spacing.sm;
/** Redução extra na largura dos cards para não cortar o card da direita em alguns aparelhos */
const GRID_CELL_SAFETY = spacing.md;
const GRID_CELL_ASPECT = 4 / 5;
/** Cards do feed visitante (estilo Airbnb): mais quadrados, em carrossel horizontal por seção */
const GUEST_CARD_WIDTH = 148;
const GUEST_CARD_IMAGE_SIZE = 148;
const GUEST_CARD_META_HEIGHT = 52;
const GUEST_CARD_GAP = spacing.sm;
const LogoLight = require('../../assets/brand/logo/logo_horizontal_light.png');
const LogoDark = require('../../assets/brand/logo/logo_dark.png');

const FEED_RADIUS_OPTIONS = [50, 100, 200, 300, 500];

/** Raças pré-definidas (mesmas do anúncio): valor enviado à API = label */
const BREED_OPTIONS_DOG: { value: string; label: string }[] = [
  { value: 'SRD', label: 'SRD (vira-lata)' },
  { value: 'LABRADOR', label: 'Labrador' },
  { value: 'GOLDEN', label: 'Golden Retriever' },
  { value: 'POODLE', label: 'Poodle' },
  { value: 'BULLDOG_FRANCES', label: 'Bulldog Francês' },
  { value: 'PIT_BULL', label: 'Pit Bull' },
  { value: 'PASTOR_ALEMAO', label: 'Pastor Alemão' },
  { value: 'YORKSHIRE', label: 'Yorkshire' },
  { value: 'SHIH_TZU', label: 'Shih Tzu' },
  { value: 'DACHSHUND', label: 'Dachshund' },
  { value: 'BEAGLE', label: 'Beagle' },
  { value: 'ROTTWEILER', label: 'Rottweiler' },
  { value: 'OUTRA', label: 'Outra' },
];
const BREED_OPTIONS_CAT: { value: string; label: string }[] = [
  { value: 'SRD', label: 'SRD (vira-lata)' },
  { value: 'PERSA', label: 'Persa' },
  { value: 'SIAMES', label: 'Siamês' },
  { value: 'MAINE_COON', label: 'Maine Coon' },
  { value: 'ANGORA', label: 'Angorá' },
  { value: 'BRITISH', label: 'British Shorthair' },
  { value: 'SPHYNX', label: 'Sphynx' },
  { value: 'RAGDOLL', label: 'Ragdoll' },
  { value: 'OUTRA', label: 'Outra' },
];
const BREED_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Qualquer' },
  ...BREED_OPTIONS_DOG,
  ...BREED_OPTIONS_CAT.filter((c) => c.value !== 'SRD'),
];

const FEED_MATCH_SCORE_INTRO_SEEN_KEY_PREFIX = 'feed_match_score_intro_seen_';
const GUEST_WELCOME_SHEET_SEEN_KEY = '@adopet/guest_saw_welcome_sheet';
const ONBOARDING_SLIDES_SEEN_KEY = '@adopet/onboarding_slides_seen';
const FEED_SWIPE_HINT_SEEN_KEY = '@adopet/feed_swipe_hint_seen';
const FEED_SWIPE_HINT_SEEN_KEY_PREFIX = '@adopet/feed_swipe_hint_seen_';

/** Formata distância em km sem quebrar se vier undefined/string da API */
function formatDistanceKm(val: unknown): string | null {
  if (val == null) return null;
  const n = Number(val);
  return Number.isFinite(n) ? `${n.toFixed(1)} km` : null;
}

const FEATURE_SLIDES = [
  { icon: 'paw' as const, title: 'Descubra pets', line2: 'Adoção perto de você. Filtre por espécie e local.' },
  { icon: 'heart' as const, title: 'Match com o pet', line2: 'Compatibilidade e conversa direta com o tutor.' },
  { icon: 'chatbubbles' as const, title: 'Favoritos e conversas', line2: 'Salve os que gostou e fale com o tutor.' },
  { icon: 'add-circle' as const, title: 'Anuncie para adoção', line2: 'Cadastre pets com fotos. Conta verificável.' },
  { icon: 'shield-checkmark' as const, title: 'Adoção responsável', line2: 'Voluntário e sem custos. Encontre com segurança.' },
];
const SLIDE_INTERVAL_MS = 4500;

/** Tempo que o usuário precisa ficar no card (swipe) para contar como visualização. */
const FEED_VIEW_DURATION_MS = 2500;

/** Faixas e cores do match score (igual a matchScoreColor.ts): 0-25 vermelho, 26-50 âmbar, 51-75 azul, 76-100 verde */
const MATCH_SCORE_INTRO_BANDS = [
  { min: 0, max: 25, color: '#dc2626', label: 'Baixa' },
  { min: 26, max: 50, color: '#d97706', label: 'Média' },
  { min: 51, max: 75, color: '#2563eb', label: 'Boa' },
  { min: 76, max: 100, color: '#16a34a', label: 'Alta' },
] as const;

/** Match score mínimo (0–100) para exibir o tooltip de incentivo no swipe. Igual à faixa verde do ícone (76–100). */
const MATCH_TOOLTIP_MIN_SCORE = 76;

/** Mensagens de incentivo ao match (tooltip no swipe), exibidas por ~2,5s. */
const MATCH_TOOLTIP_MESSAGES = [
  'Uau! Esse pet combina muito com você! 💜',
  'Match alto! Vocês podem ser uma ótima dupla 🐾',
  'Que combo! Esse amor tem tudo para dar certo 💕',
  'Nossa, que compatibilidade! Dá até vontade de adotar já 🏠',
  'Olha esse match! Parece que foi feito para você ✨',
  'Altíssima compatibilidade! Vale a pena conhecer 🐶🐱',
  'Esse aí tem sua cara! Que match incrível 🌟',
  'Combinou demais com seu perfil! Que fofo 🥹',
  'Match top! Esse pet pode ser o seu novo melhor amigo 💖',
  'Compatibilidade nas alturas! Que encontro feliz 🎉',
];

export default function FeedScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const showLogoutToast = useAuthStore((s) => s.showLogoutToast);
  const setShowLogoutToast = useAuthStore((s) => s.setShowLogoutToast);
  const [cursor, setCursor] = useState<string | null>(null);
  /** Lista única do feed (ordem da API). Usada no swipe e no grid. */
  const [accumulatedItems, setAccumulatedItems] = useState<FeedResponse['items'] | null>(null);
  const [showMatchOverlay, setShowMatchOverlay] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const likedPetIdRef = useRef<string | null>(null);
  const matchOverlayShownForRef = useRef<string | null>(null);
  const lastLikedPetRef = useRef<FeedItem | null>(null);
  const lastPassedPetRef = useRef<FeedItem | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [speciesFilter, setSpeciesFilter] = useState<FeedSpeciesFilter>('BOTH');
  const [partnerFilter, setPartnerFilter] = useState<FeedPartnerFilter>('all');
  const [triageFilters, setTriageFilters] = useState<FeedTriageFilters>({});
  const [showTriageModal, setShowTriageModal] = useState(false);
  const [triageModalRadiusKm, setTriageModalRadiusKm] = useState(300);
  /** Raio para visitantes (sem prefs): aplicado ao feed quando não há userId */
  const [guestRadiusKm, setGuestRadiusKm] = useState<number>(300);
  const [nameSearch, setNameSearch] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [debouncedNameSearch, setDebouncedNameSearch] = useState('');
  const [deckHeight, setDeckHeight] = useState<number>(0);
  const [changingFilter, setChangingFilter] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  type ViewMode = 'swipe' | 'grid';
  type SortMode = 'relevance' | 'trending';
  const isGuest = !userId;
  const params = useLocalSearchParams<{ trending?: string }>();
  const [sortMode, setSortModeState] = useState<SortMode>(() => (params.trending === '1' ? 'trending' : 'relevance'));
  const appliedTrendingRef = useRef(false);
  const [viewMode, setViewModeState] = useState<ViewMode>('swipe');
  useEffect(() => {
    if (params.trending === '1' && !appliedTrendingRef.current) {
      appliedTrendingRef.current = true;
      setSortModeState('trending');
      setViewModeState('grid');
    }
  }, [params.trending]);
  const effectiveViewMode: ViewMode = isGuest ? 'grid' : viewMode;
  const [matchTooltipMessage, setMatchTooltipMessage] = useState<string | null>(null);
  const matchTooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matchTooltipPetIdRef = useRef<string | null>(null);
  const feedViewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showMatchScoreIntroModal, setShowMatchScoreIntroModal] = useState(false);
  const [matchScoreDontShowAgain, setMatchScoreDontShowAgain] = useState(false);
  const [showGuestWelcomeSheet, setShowGuestWelcomeSheet] = useState(false);
  const [showOnboardingSlidesSheet, setShowOnboardingSlidesSheet] = useState(false);
  const [showLogoutBanner, setShowLogoutBanner] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const swipeHintCheckDoneRef = useRef(false);
  const [viewedPetIds, setViewedPetIds] = useState<Set<string>>(new Set());
  const hasTriageFilters = Object.keys(triageFilters).some((k) => {
    const v = triageFilters[k as keyof FeedTriageFilters];
    if (v === undefined || v === false) return false;
    if (Array.isArray(v)) return v.length > 0;
    return v !== '';
  });

  const guestSlidesOrange = colors.warning ?? '#d97706';

  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const numColumns = useResponsiveGridColumns();
  const gridContentWidth = screenWidth - insets.left - insets.right - 2 * GRID_SCREEN_PADDING;
  const gridCellWidth = gridContentWidth > 0 ? (gridContentWidth - GRID_GAP * (numColumns - 1) - GRID_CELL_SAFETY) / numColumns : 0;
  const guestSlideWidth = Math.min(screenWidth - spacing.lg * 2, 280);
  const guestSlideStep = guestSlideWidth + spacing.md;
  const guestSlideListRef = useRef<ScrollView>(null);
  const [guestSlideIndex, setGuestSlideIndex] = useState(0);
  useEffect(() => {
    if (!isGuest) return;
    const t = setInterval(() => {
      setGuestSlideIndex((i) => {
        const next = i + 1;
        const target = next >= FEATURE_SLIDES.length ? 0 : next;
        guestSlideListRef.current?.scrollTo({ x: target * guestSlideStep, animated: true });
        return target;
      });
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(t);
  }, [isGuest, guestSlideStep]);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
  }, []);

  const setSortMode = useCallback((mode: SortMode) => {
    setSortModeState(mode);
    setCursor(null);
    setAccumulatedItems(null);
    setChangingFilter(true);
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({});
          setUserCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        } catch {
          // mantém null: feed sem filtro por raio
        }
      }
    })();
  }, []);

  useUpdateCityFromLocation(userId ? userCoords : null);

  useFocusEffect(
    useCallback(() => {
      if (isGuest && showLogoutToast) {
        setShowLogoutToast(false);
        setShowLogoutBanner(true);
      }
    }, [isGuest, showLogoutToast, setShowLogoutToast]),
  );

  const { data: prefs } = useQuery({
    queryKey: ['me', 'preferences'],
    queryFn: getPreferences,
    staleTime: 5 * 60_000,
    enabled: !!userId,
  });

  const updateRadiusMutation = useMutation({
    mutationFn: (radiusKm: number) => updatePreferences({ radiusKm }),
    onSuccess: (data) => {
      queryClient.setQueryData(['me', 'preferences'], data);
      queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY });
    },
    onError: () => {
      Alert.alert('Erro', 'Não foi possível salvar o raio. Tente novamente.');
    },
  });

  useEffect(() => {
    if (showTriageModal) {
      if (userId && prefs?.radiusKm != null) setTriageModalRadiusKm(prefs.radiusKm);
      else if (!userId) setTriageModalRadiusKm(guestRadiusKm);
      else setTriageModalRadiusKm(300);
    }
  }, [showTriageModal, prefs?.radiusKm, userId, guestRadiusKm]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedNameSearch(nameSearch.trim()), 400);
    return () => clearTimeout(t);
  }, [nameSearch]);

  useEffect(() => {
    if (debouncedNameSearch) {
      setCursor(null);
      setAccumulatedItems(null);
      setChangingFilter(true);
    }
  }, [debouncedNameSearch]);

  const effectiveRadiusKm = userId ? (prefs?.radiusKm ?? 300) : guestRadiusKm;
  const sortByTrending = sortMode === 'trending';
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: [...FEED_QUERY_KEY, cursor, effectiveRadiusKm, speciesFilter, partnerFilter, userCoords?.lat, userCoords?.lng, triageFilters, sortMode, debouncedNameSearch],
    queryFn: () =>
      fetchFeed({
        ...(userCoords && { lat: userCoords.lat, lng: userCoords.lng }),
        radiusKm: effectiveRadiusKm,
        cursor: cursor ?? undefined,
        ...(debouncedNameSearch && { q: debouncedNameSearch }),
        species: speciesFilter,
        partnerFilter: partnerFilter !== 'all' ? partnerFilter : undefined,
        ...(sortByTrending && { sortBy: 'trending' }),
        ...triageFilters,
      }),
    staleTime: 60_000,
    enabled: true,
  });

  const nextCursor = data?.nextCursor ?? null;

  useEffect(() => {
    if (!isLoading && !isRefetching) setChangingFilter(false);
  }, [isLoading, isRefetching]);

  // Primeira carga: define lista; ao carregar mais: append (mesma ordem/prioridade da API para grid e swipe)
  useEffect(() => {
    if (!data?.items?.length) return;
    if (cursor === null) {
      setAccumulatedItems(data.items);
    } else {
      setAccumulatedItems((prev) => {
        const ids = new Set((prev ?? []).map((p) => p.id));
        const newItems = data.items.filter((p) => !ids.has(p.id));
        return newItems.length ? [...(prev ?? []), ...newItems] : prev ?? [];
      });
    }
  }, [data?.items, cursor]);

  const items = accumulatedItems ?? data?.items ?? [];
  const displayGridItems = effectiveViewMode === 'grid' ? items : [];
  const GUEST_SECTION_MAX = 5;
  const guestSections: {
    title: string;
    data: FeedItem[];
    gridSpecies?: FeedSpeciesFilter;
    gridSize?: string;
  }[] = (() => {
    if (!isGuest || displayGridItems.length === 0) return [];
    const sections: {
      title: string;
      data: FeedItem[];
      gridSpecies?: FeedSpeciesFilter;
      gridSize?: string;
    }[] = [];
    const near = displayGridItems.slice(0, 20);
    if (near.length > 0) sections.push({ title: 'Pets perto de você', data: near });
    const dogs = displayGridItems.filter((p) => String(p.species).toUpperCase() === 'DOG');
    if (dogs.length > 0) sections.push({ title: 'Cachorros para adoção', data: dogs, gridSpecies: 'DOG' });
    const cats = displayGridItems.filter((p) => String(p.species).toUpperCase() === 'CAT');
    if (cats.length > 0) sections.push({ title: 'Gatos para adoção', data: cats, gridSpecies: 'CAT' });
    const byDate = [...displayGridItems].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
    const recent = byDate.slice(0, 15);
    if (recent.length > 0) sections.push({ title: 'Recém-chegados', data: recent });
    const forApartment = displayGridItems.filter((p) => String(p.size || '').toLowerCase() === 'small');
    if (forApartment.length > 0 && sections.length < GUEST_SECTION_MAX) {
      sections.push({ title: 'Para apartamento', data: forApartment, gridSize: 'small' });
    }
    if (sections.length === 0) sections.push({ title: 'Pets para adoção', data: displayGridItems });
    return sections.slice(0, GUEST_SECTION_MAX);
  })();

  useFocusEffect(
    useCallback(() => {
      refetch();
      getViewedPetIds(userId).then(setViewedPetIds);
      if (userId) {
        const storageKey = FEED_MATCH_SCORE_INTRO_SEEN_KEY_PREFIX + userId;
        AsyncStorage.getItem(storageKey).then((seen) => {
          if (seen !== '1') setShowMatchScoreIntroModal(true);
        });
          } else {
            AsyncStorage.getItem(ONBOARDING_SLIDES_SEEN_KEY)
              .then((onboardingSeen) => {
                if (onboardingSeen === '1' || onboardingSeen === 'true') {
                  setShowOnboardingSlidesSheet(false);
                  AsyncStorage.getItem(GUEST_WELCOME_SHEET_SEEN_KEY).then((welcomeSeen) => {
                    setShowGuestWelcomeSheet(welcomeSeen !== '1' && welcomeSeen !== 'true');
                  });
                } else {
                  setShowOnboardingSlidesSheet(true);
                  setShowGuestWelcomeSheet(false);
                }
              })
              .catch(() => {
                setShowOnboardingSlidesSheet(true);
                setShowGuestWelcomeSheet(false);
              });
          }
    }, [refetch, userId]),
  );

  useEffect(() => {
    if (effectiveViewMode !== 'swipe' || items.length === 0 || swipeHintCheckDoneRef.current) return;
    swipeHintCheckDoneRef.current = true;
    const key = userId ? FEED_SWIPE_HINT_SEEN_KEY_PREFIX + userId : FEED_SWIPE_HINT_SEEN_KEY;
    AsyncStorage.getItem(key).then((seen) => {
      if (seen !== '1') setShowSwipeHint(true);
    });
  }, [effectiveViewMode, items.length, userId]);

  const dismissGuestWelcomeSheet = useCallback(() => {
    AsyncStorage.setItem(GUEST_WELCOME_SHEET_SEEN_KEY, '1');
    setShowGuestWelcomeSheet(false);
  }, []);

  const completeOnboardingSlides = useCallback(() => {
    AsyncStorage.setItem(ONBOARDING_SLIDES_SEEN_KEY, '1');
    AsyncStorage.setItem(GUEST_WELCOME_SHEET_SEEN_KEY, '1');
    setShowOnboardingSlidesSheet(false);
  }, []);

  const handleOnboardingLogin = useCallback(() => {
    trackEvent({ name: 'onboarding_completed', properties: { last_slide_index: 5 } });
    trackEvent({ name: 'onboarding_final_action', properties: { action: 'login' } });
    completeOnboardingSlides();
    router.push('/(auth)/login');
  }, [completeOnboardingSlides]);

  const handleOnboardingSignup = useCallback(() => {
    trackEvent({ name: 'onboarding_completed', properties: { last_slide_index: 5 } });
    trackEvent({ name: 'onboarding_final_action', properties: { action: 'signup' } });
    completeOnboardingSlides();
    router.push('/(auth)/signup');
  }, [completeOnboardingSlides]);

  const handleOnboardingExplore = useCallback(() => {
    trackEvent({ name: 'onboarding_completed', properties: { last_slide_index: 5 } });
    trackEvent({ name: 'onboarding_final_action', properties: { action: 'explore' } });
    completeOnboardingSlides();
  }, [completeOnboardingSlides]);

  const resetOnboardingForTesting = useCallback(() => {
    if (!__DEV__) return;
    AsyncStorage.removeItem(ONBOARDING_SLIDES_SEEN_KEY);
    AsyncStorage.removeItem(GUEST_WELCOME_SHEET_SEEN_KEY);
    setShowOnboardingSlidesSheet(true);
    setShowGuestWelcomeSheet(false);
  }, []);

  const swipeMutation = useMutation({
    mutationFn: async (params: { petId: string; action: 'LIKE' | 'PASS' }) => {
      await createSwipe({ petId: params.petId, action: params.action });
      if (params.action === 'LIKE') {
        try {
          await addFavorite(params.petId);
        } catch {
          // já favoritado ou erro
        }
      }
    },
    onMutate: async ({ petId, action }) => {
      const removePetFromList = () => {
        setAccumulatedItems((prev) => (prev ?? []).filter((p) => p.id !== petId));
      };
      if (action === 'PASS') {
        const current = items[0];
        if (current?.id === petId) {
          lastPassedPetRef.current = current;
          setShowUndo(true);
          undoTimeoutRef.current = setTimeout(() => {
            lastPassedPetRef.current = null;
            setShowUndo(false);
          }, 5000);
        }
        removePetFromList();
      } else if (action === 'LIKE') {
        const current = items[0];
        if (current?.id === petId) lastLikedPetRef.current = current;
        removePetFromList();
        likedPetIdRef.current = petId;
        if (matchOverlayShownForRef.current !== petId) {
          matchOverlayShownForRef.current = petId;
          setShowMatchOverlay(true);
          setToastMessage('Adicionado aos favoritos!');
        }
      }
    },
    onSuccess: (_, variables) => {
      const key = userId ? FEED_SWIPE_HINT_SEEN_KEY_PREFIX + userId : FEED_SWIPE_HINT_SEEN_KEY;
      AsyncStorage.setItem(key, '1');
      setShowSwipeHint(false);
      trackEvent({ name: 'swipe', properties: { petId: variables.petId, action: variables.action } });
      if (variables.action === 'LIKE') {
        trackEvent({ name: 'like', properties: { petId: variables.petId } });
        trackEvent({ name: 'favorite_added', properties: { petId: variables.petId } });
        lastLikedPetRef.current = null;
        queryClient.refetchQueries({ queryKey: ['favorites'] });
      }
      if (variables.action === 'PASS') {
        queryClient.invalidateQueries({ queryKey: ['swipes', 'passed'] });
        queryClient.refetchQueries({ queryKey: ['swipes', 'passed'] });
      }
    },
    onError: (_, variables) => {
      if (variables.action === 'LIKE') {
        matchOverlayShownForRef.current = null;
        likedPetIdRef.current = null;
        setShowMatchOverlay(false);
        const pet = lastLikedPetRef.current;
        lastLikedPetRef.current = null;
        if (pet) {
          setAccumulatedItems((prev) => [pet, ...(prev ?? [])]);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['swipes', 'passed'] });
    },
  });

  const handleLike = useCallback(() => {
    const current = items[0];
    if (!current) return;
    swipeMutation.mutate({ petId: current.id, action: 'LIKE' });
  }, [items, swipeMutation]);

  const handlePass = useCallback(() => {
    const current = items[0];
    if (!current) return;
    swipeMutation.mutate({ petId: current.id, action: 'PASS' });
  }, [items, swipeMutation]);

  const handleUndo = useCallback(() => {
    const pet = lastPassedPetRef.current;
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    undoTimeoutRef.current = null;
    lastPassedPetRef.current = null;
    setShowUndo(false);
    if (pet) {
      setAccumulatedItems((prev) => [pet, ...(prev ?? [])]);
    }
  }, []);

  const loadMore = useCallback(() => {
    if (nextCursor) setCursor(nextCursor);
  }, [nextCursor]);

  const handleRefresh = useCallback(() => {
    setCursor(null);
    setAccumulatedItems(null);
    refetch();
  }, [refetch]);

  const currentPet = items[0];
  const navigation = useNavigation();

  useLayoutEffect(() => {
    if (!isGuest) return;
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => router.replace('/(auth)/welcome')}
          style={{ paddingHorizontal: 12, paddingVertical: 8 }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 15 }}>Entrar</Text>
        </TouchableOpacity>
      ),
    });
  }, [isGuest, navigation, colors.primary, router]);

  // Tooltip de match no swipe: mostra mensagem por ~2,5s; some ao trocar de pet; só mostra após o modal de match fechar
  useEffect(() => {
    if (effectiveViewMode !== 'swipe') {
      setMatchTooltipMessage(null);
      if (matchTooltipTimeoutRef.current) {
        clearTimeout(matchTooltipTimeoutRef.current);
        matchTooltipTimeoutRef.current = null;
      }
      return;
    }
    if (showMatchOverlay) {
      setMatchTooltipMessage(null);
      if (matchTooltipTimeoutRef.current) {
        clearTimeout(matchTooltipTimeoutRef.current);
        matchTooltipTimeoutRef.current = null;
      }
      return;
    }
    if (!currentPet) {
      setMatchTooltipMessage(null);
      matchTooltipPetIdRef.current = null;
      if (matchTooltipTimeoutRef.current) {
        clearTimeout(matchTooltipTimeoutRef.current);
        matchTooltipTimeoutRef.current = null;
      }
      return;
    }
    setMatchTooltipMessage(null);
    if (matchTooltipTimeoutRef.current) {
      clearTimeout(matchTooltipTimeoutRef.current);
      matchTooltipTimeoutRef.current = null;
    }
    if (currentPet.matchScore == null || currentPet.matchScore < MATCH_TOOLTIP_MIN_SCORE) return;
    const petId = currentPet.id;
    matchTooltipPetIdRef.current = petId;
    const msg = MATCH_TOOLTIP_MESSAGES[Math.floor(Math.random() * MATCH_TOOLTIP_MESSAGES.length)];
    setMatchTooltipMessage(msg);
    matchTooltipTimeoutRef.current = setTimeout(() => {
      matchTooltipTimeoutRef.current = null;
      setMatchTooltipMessage((prev) => (matchTooltipPetIdRef.current === petId ? null : prev));
    }, 2500);
    return () => {
      if (matchTooltipTimeoutRef.current) {
        clearTimeout(matchTooltipTimeoutRef.current);
        matchTooltipTimeoutRef.current = null;
      }
    };
  }, [effectiveViewMode, showMatchOverlay, currentPet?.id, currentPet?.matchScore]);

  // Registrar visualização no feed (swipe): após 2,5 s no mesmo card, chama POST /pets/:id/view (uma vez por permanência no card).
  useEffect(() => {
    if (effectiveViewMode !== 'swipe' || !currentPet || !userId) {
      if (feedViewTimerRef.current) {
        clearTimeout(feedViewTimerRef.current);
        feedViewTimerRef.current = null;
      }
      return;
    }
    const petId = currentPet.id;
    if (feedViewTimerRef.current) clearTimeout(feedViewTimerRef.current);
    feedViewTimerRef.current = setTimeout(() => {
      feedViewTimerRef.current = null;
      recordPetView(petId).catch(() => {});
    }, FEED_VIEW_DURATION_MS);
    return () => {
      if (feedViewTimerRef.current) {
        clearTimeout(feedViewTimerRef.current);
        feedViewTimerRef.current = null;
      }
    };
  }, [effectiveViewMode, currentPet?.id, userId]);

  if (isLoading && items.length === 0) {
    return (
      <>
        <View style={[styles.screen, { backgroundColor: colors.background }]}>
          <View style={[styles.brandHeader, { paddingTop: insets.top + 8 }]}>
            <Pressable
              onLongPress={__DEV__ && isGuest ? resetOnboardingForTesting : undefined}
              style={styles.headerLogoPressable}
            >
              <ExpoImage source={isDark ? LogoDark : LogoLight} style={styles.headerLogo} contentFit="contain" />
            </Pressable>
          </View>
          <View style={[styles.deck, styles.deckLoading]}>
            <LoadingLogo size={160} />
          </View>
        </View>
        {isGuest && showOnboardingSlidesSheet && (
          <OnboardingSlidesSheet
            visible={showOnboardingSlidesSheet}
            onComplete={completeOnboardingSlides}
            onLogin={handleOnboardingLogin}
            onSignup={handleOnboardingSignup}
            onExplore={handleOnboardingExplore}
            onTrackEvent={trackEvent}
            onShowToast={setToastMessage}
          />
        )}
        {isGuest && !showOnboardingSlidesSheet && (
          <GuestWelcomeSheet
            visible={showGuestWelcomeSheet}
            onDismiss={dismissGuestWelcomeSheet}
            onLogin={() => { setShowGuestWelcomeSheet(false); router.push('/(auth)/login'); }}
            onSignup={() => { setShowGuestWelcomeSheet(false); router.push('/(auth)/signup'); }}
          />
        )}
      </>
    );
  }

  if (items.length === 0 && !data) {
    const radiusKm = prefs?.radiusKm ?? 300;
    const emptyMessage = userCoords
      ? `Nenhum pet no raio de ${radiusKm} km por aqui. 🐾 Quer ver mais? Aumente o raio na aba Mapa (ex.: 100 km). Ou testa outro filtro de espécie!`
      : 'Nenhum anúncio no feed por enquanto. 🐾 Ativa a localização para ver pets perto de você ou ajusta os filtros.';
    const emptyContent = (
      <>
        <View style={[styles.brandHeader, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onLongPress={__DEV__ && isGuest ? resetOnboardingForTesting : undefined}
            style={styles.headerLogoPressable}
          >
            <ExpoImage source={isDark ? LogoDark : LogoLight} style={styles.headerLogo} contentFit="contain" />
          </Pressable>
        </View>
        <View style={styles.emptyWrap}>
          <EmptyState
            title="Nenhum pet no momento 🐾"
            message={isGuest ? 'Crie sua conta para favoritar pets e conversar com os tutores.' : emptyMessage}
            icon={<Ionicons name="paw-outline" size={56} color={colors.textSecondary} />}
          />
          {isGuest ? (
            <>
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.replace('/(auth)/welcome')}
              >
                <Text style={[styles.secondaryBtnText, { color: '#fff' }]}>Entrar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: colors.primary }]}
                onPress={() => router.replace('/(auth)/welcome')}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Criar conta</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {hasTriageFilters && (
                <TouchableOpacity
                  style={[styles.secondaryBtn, { borderColor: colors.primary }]}
                  onPress={() => {
                    setTriageFilters({});
                    setCursor(null);
                    setAccumulatedItems(null);
                    setChangingFilter(true);
                  }}
                >
                  <Ionicons name="options-outline" size={20} color={colors.primary} />
                  <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Alterar ou remover filtros</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: colors.primary }]}
                onPress={() => router.push('/preferences')}
              >
                <Ionicons name="options-outline" size={20} color={colors.primary} />
                <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Ajustar preferências</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: colors.primary }]}
                onPress={() => router.push('/map')}
              >
                <Ionicons name="map-outline" size={20} color={colors.primary} />
                <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Ver no mapa</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </>
    );
    const emptyStateGuestCarousel = isGuest ? (
      <View style={[styles.guestSlidesBlockFixed, { backgroundColor: guestSlidesOrange + '0C', borderTopColor: guestSlidesOrange + '25' }]}>
        <Text style={[styles.guestSlidesTitle, { color: colors.textPrimary }]}>Conheça o app</Text>
        <ScrollView
          ref={guestSlideListRef}
          horizontal
          pagingEnabled={false}
          snapToInterval={guestSlideStep}
          snapToAlignment="start"
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: spacing.lg }}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / guestSlideStep);
            setGuestSlideIndex(Math.min(Math.max(0, i), FEATURE_SLIDES.length - 1));
          }}
          style={styles.guestSlideList}
        >
          {FEATURE_SLIDES.map((item) => (
            <View key={item.title} style={[styles.guestSlideRow, { width: guestSlideWidth, backgroundColor: guestSlidesOrange + '18' }]}>
              <View style={[styles.guestSlideIconWrapSmall, { backgroundColor: guestSlidesOrange + '35' }]}>
                <Ionicons name={item.icon} size={22} color={guestSlidesOrange} />
              </View>
              <View style={styles.guestSlideTextWrap}>
                <Text style={[styles.guestSlideTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.guestSlideLine2, { color: colors.textSecondary }]} numberOfLines={2}>{item.line2}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={styles.guestSlidesDots}>
          {FEATURE_SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.guestSlidesDot, { backgroundColor: i === guestSlideIndex ? guestSlidesOrange : colors.textSecondary + '50' }]}
            />
          ))}
        </View>
      </View>
    ) : null;
  return (
    <>
      <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.emptyStateScrollContent} showsVerticalScrollIndicator={false}>
        {emptyContent}
        {emptyStateGuestCarousel}
      </ScrollView>
      {isGuest && showOnboardingSlidesSheet && (
        <OnboardingSlidesSheet
          visible={showOnboardingSlidesSheet}
          onComplete={completeOnboardingSlides}
          onLogin={handleOnboardingLogin}
          onSignup={handleOnboardingSignup}
          onExplore={handleOnboardingExplore}
          onTrackEvent={trackEvent}
          onShowToast={setToastMessage}
        />
      )}
      {isGuest && !showOnboardingSlidesSheet && (
        <GuestWelcomeSheet
          visible={showGuestWelcomeSheet}
          onDismiss={dismissGuestWelcomeSheet}
          onLogin={() => { setShowGuestWelcomeSheet(false); router.push('/(auth)/login'); }}
          onSignup={() => { setShowGuestWelcomeSheet(false); router.push('/(auth)/signup'); }}
        />
      )}
    </>
    );
  }

  if (!currentPet && effectiveViewMode === 'swipe' && !(changingFilter && (isRefetching || isLoading))) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={[styles.brandHeader, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onLongPress={__DEV__ && isGuest ? resetOnboardingForTesting : undefined}
            style={styles.headerLogoPressable}
          >
            <ExpoImage source={isDark ? LogoDark : LogoLight} style={styles.headerLogo} contentFit="contain" />
          </Pressable>
        </View>
        <View style={styles.emptyWrap}>
          <EmptyState
            title="Você viu todos por enquanto! 💕"
            message="Acabaram os pets no raio atual. Quer ver mais? Aumente o raio na aba Mapa (ex.: 100 km ou mais). Novos anúncios podem aparecer nas próximas horas também. 🐾"
            icon={<Ionicons name="heart-outline" size={56} color={colors.textSecondary} />}
          />
          {hasTriageFilters && (
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.primary }]}
              onPress={() => {
                setTriageFilters({});
                setCursor(null);
                setAccumulatedItems(null);
                setChangingFilter(true);
              }}
            >
              <Ionicons name="options-outline" size={20} color={colors.primary} />
              <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Alterar ou remover filtros</Text>
            </TouchableOpacity>
          )}
          {nextCursor ? (
            <TouchableOpacity
              style={[styles.loadMoreBtn, { backgroundColor: colors.primary }]}
              onPress={() => setCursor(nextCursor)}
            >
              <Text style={styles.loadMoreBtnText}>Carregar mais</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.primary }]}
            onPress={() => router.push('/preferences')}
          >
            <Ionicons name="options-outline" size={20} color={colors.primary} />
            <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Ajustar preferências</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.primary }]}
            onPress={() => router.push('/passed-pets')}
          >
            <Ionicons name="arrow-undo-outline" size={20} color={colors.primary} />
            <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Pets que você passou</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.primary }]}
            onPress={() => router.push('/map')}
          >
            <Ionicons name="map-outline" size={20} color={colors.primary} />
            <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Ver no mapa</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const chips: { value: FeedSpeciesFilter; label: string }[] = [
    { value: 'BOTH', label: 'Todos' },
    { value: 'DOG', label: 'Cachorros' },
    { value: 'CAT', label: 'Gatos' },
  ];

  const partnerChips: { value: FeedPartnerFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'partners_only', label: 'Só parceiros' },
    { value: 'no_partners', label: 'Sem parceria' },
  ];

  const headerAndChips = (
    <>
      <View style={[styles.brandHeader, { paddingTop: 16, paddingBottom: isGuest ? spacing.sm : 4 }]}>
        <Pressable
          onLongPress={__DEV__ && isGuest ? resetOnboardingForTesting : undefined}
          style={styles.headerLogoPressable}
        >
          <ExpoImage source={isDark ? LogoDark : LogoLight} style={styles.headerLogo} contentFit="contain" />
        </Pressable>
        <View style={styles.headerRight}>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {(effectiveViewMode === 'grid' ? displayGridItems.length : items.length)}
            {data?.totalCount != null && data.totalCount > 0 ? ` de ${data.totalCount} ` : ' '}
            {(effectiveViewMode === 'grid' ? displayGridItems.length : items.length) !== 1 ? 'pets' : 'pet'}
          </Text>
          {!isGuest && (
            <View style={styles.viewModeToggle}>
              <TouchableOpacity
                style={[styles.viewModeBtn, viewMode === 'swipe' && { backgroundColor: colors.primary }]}
                onPress={() => setViewMode('swipe')}
                accessibilityLabel="Visualização em cards"
              >
                <Ionicons name="layers-outline" size={22} color={viewMode === 'swipe' ? '#fff' : colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewModeBtn, viewMode === 'grid' && { backgroundColor: colors.primary }]}
                onPress={() => setViewMode('grid')}
                accessibilityLabel="Visualização em grade"
              >
                <Ionicons name="grid-outline" size={22} color={viewMode === 'grid' ? '#fff' : colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      <Text style={[styles.feedDisclaimer, { color: colors.textSecondary }]} numberOfLines={1}>
        Adoção responsável, voluntária e sem custos
      </Text>
      {!isGuest && (
        <View style={[styles.chipsRow, styles.chipsRowFirst, { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, paddingTop: spacing.xs }]}>
          <TouchableOpacity
            style={[
              styles.chip,
              { borderColor: colors.textSecondary },
              sortMode === 'relevance' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setSortMode('relevance')}
            accessibilityLabel="Ordenar para você"
          >
            <Text style={[styles.chipText, { color: sortMode === 'relevance' ? '#fff' : colors.textSecondary }]}>
              Para você
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.chip,
              { borderColor: colors.textSecondary },
              sortMode === 'trending' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setSortMode('trending')}
            accessibilityLabel="Ordenar em alta"
          >
            <Text style={[styles.chipText, { color: sortMode === 'trending' ? '#fff' : colors.textSecondary }]}>
              Em alta
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {effectiveViewMode === 'grid' ? (
        <View style={[styles.filtersWrap, { borderBottomColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.collapsibleHeader, { backgroundColor: colors.surface }]}
            onPress={() => setFiltersExpanded((e) => !e)}
            activeOpacity={0.7}
          >
            <Text style={[styles.collapsibleHeaderText, { color: colors.textPrimary }]}>Filtros e busca</Text>
            <Ionicons name={filtersExpanded ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          {filtersExpanded && (
            <>
              <View style={[styles.feedSearchRow, { backgroundColor: colors.surface, borderColor: colors.textSecondary + '40' }]}>
                <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: spacing.xs }} />
                <TextInput
                  value={nameSearch}
                  onChangeText={setNameSearch}
                  placeholder="Buscar por nome"
                  placeholderTextColor={colors.textSecondary + '99'}
                  style={[styles.searchInput, { color: colors.textPrimary }]}
                  returnKeyType="search"
                />
                {nameSearch.length > 0 && (
                  <TouchableOpacity
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => setNameSearch('')}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={[styles.filterLabel, { color: colors.textSecondary, marginTop: spacing.xs }]}>Espécie</Text>
              <View style={[styles.chipsRow, styles.chipsRowFirst, { paddingBottom: spacing.sm }]}>
                {chips.map(({ value, label }) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.chip,
                      { borderColor: colors.textSecondary },
                      speciesFilter === value && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => {
                      setSpeciesFilter(value);
                      setCursor(null);
                      setAccumulatedItems(null);
                      setChangingFilter(true);
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: speciesFilter === value ? '#fff' : colors.textSecondary },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[
                    styles.chip,
                    styles.chipRow,
                    { borderColor: colors.textSecondary },
                    hasTriageFilters && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setShowTriageModal(true)}
                >
                  <Ionicons name="options-outline" size={16} color={hasTriageFilters ? '#fff' : colors.textSecondary} />
                  <Text
                    style={[
                      styles.chipText,
                      { color: hasTriageFilters ? '#fff' : colors.textSecondary, marginLeft: 4 },
                    ]}
                    numberOfLines={1}
                  >
                    Filtros
                    {hasTriageFilters ? ' •' : ''}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Parceria</Text>
              <View style={[styles.chipsRow, { paddingBottom: spacing.sm }]}>
                {partnerChips.map(({ value, label }) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.chip,
                      { borderColor: colors.textSecondary },
                      partnerFilter === value && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => {
                      setPartnerFilter(value);
                      setCursor(null);
                      setAccumulatedItems(null);
                      setChangingFilter(true);
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: partnerFilter === value ? '#fff' : colors.textSecondary },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      ) : (
        <>
          <View style={[styles.chipsRow, styles.chipsRowFirst, { paddingBottom: spacing.sm, paddingHorizontal: spacing.md }]}>
            {chips.map(({ value, label }) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.chip,
                  { borderColor: colors.textSecondary },
                  speciesFilter === value && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => {
                  setSpeciesFilter(value);
                  setCursor(null);
                  setAccumulatedItems(null);
                  setChangingFilter(true);
                }}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: speciesFilter === value ? '#fff' : colors.textSecondary },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[
                styles.chip,
                styles.chipRow,
                { borderColor: colors.textSecondary },
                hasTriageFilters && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setShowTriageModal(true)}
            >
              <Ionicons name="options-outline" size={16} color={hasTriageFilters ? '#fff' : colors.textSecondary} />
              <Text
                style={[
                  styles.chipText,
                  { color: hasTriageFilters ? '#fff' : colors.textSecondary, marginLeft: 4 },
                ]}
                numberOfLines={1}
              >
                Filtros
                {hasTriageFilters ? ' •' : ''}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.chipsRow, { paddingBottom: spacing.sm, paddingHorizontal: spacing.md }]}>
            <Text style={[styles.chipLabel, { color: colors.textSecondary }]}>Parceria: </Text>
            {partnerChips.map(({ value, label }) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.chip,
                  { borderColor: colors.textSecondary },
                  partnerFilter === value && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => {
                  setPartnerFilter(value);
                  setCursor(null);
                  setAccumulatedItems(null);
                  setChangingFilter(true);
                }}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: partnerFilter === value ? '#fff' : colors.textSecondary },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
      {showTriageModal && (
        <Modal visible transparent animationType="fade">
          <Pressable style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={() => setShowTriageModal(false)}>
            <Pressable style={[styles.triageModalContent, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
              <Text style={[styles.triageModalTitle, { color: colors.textPrimary }]}>Filtros do feed</Text>
              {userCoords ? (
                <>
                  <Text style={[styles.triageLabel, { color: colors.textSecondary }]}>Raio (km)</Text>
                  <View style={styles.triageRow}>
                    {FEED_RADIUS_OPTIONS.map((km) => (
                      <TouchableOpacity
                        key={km}
                        style={[styles.triageChip, { backgroundColor: triageModalRadiusKm === km ? colors.primary : colors.background }]}
                        onPress={() => setTriageModalRadiusKm(km)}
                      >
                        <Text style={{ color: triageModalRadiusKm === km ? '#fff' : colors.textPrimary, fontSize: 12 }}>{km}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : null}
              <Text style={[styles.triageLabel, { color: colors.textSecondary }]}>Sexo</Text>
              <View style={styles.triageRow}>
                {(['', 'male', 'female'] as const).map((v) => (
                  <TouchableOpacity
                    key={v || 'any'}
                    style={[styles.triageChip, { backgroundColor: (triageFilters.sex ?? '') === v ? colors.primary : colors.background }]}
                    onPress={() => setTriageFilters((f) => ({ ...f, sex: (f.sex ?? '') === v ? undefined : (v || undefined) }))}
                  >
                    <Text style={{ color: (triageFilters.sex ?? '') === v ? '#fff' : colors.textPrimary, fontSize: 12 }}>
                      {v ? { male: 'Macho', female: 'Fêmea' }[v] : 'Qualquer'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.triageLabel, { color: colors.textSecondary }]}>Porte</Text>
              <View style={styles.triageRow}>
                {(['', 'small', 'medium', 'large', 'xlarge'] as const).map((v) => (
                  <TouchableOpacity
                    key={v || 'any'}
                    style={[styles.triageChip, { backgroundColor: (triageFilters.size ?? '') === v ? colors.primary : colors.background }]}
                    onPress={() => setTriageFilters((f) => ({ ...f, size: (f.size ?? '') === v ? undefined : (v || undefined) }))}
                  >
                    <Text style={{ color: (triageFilters.size ?? '') === v ? '#fff' : colors.textPrimary, fontSize: 12 }}>
                      {v ? { small: 'Pequeno', medium: 'Médio', large: 'Grande', xlarge: 'Muito grande' }[v] : 'Qualquer'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.triageLabel, { color: colors.textSecondary }]}>Raça</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.triageBreedScroll} contentContainerStyle={styles.triageBreedScrollContent}>
                {BREED_FILTER_OPTIONS.map((opt, index) => {
                  const selectedBreeds = triageFilters.breed ?? [];
                  const selected = opt.value ? selectedBreeds.includes(opt.label) : selectedBreeds.length === 0;
                  return (
                    <TouchableOpacity
                      key={`breed-${index}`}
                      style={[styles.triageChip, { backgroundColor: selected ? colors.primary : colors.background }]}
                      onPress={() => {
                        if (!opt.value) {
                          setTriageFilters((f) => ({ ...f, breed: undefined }));
                          return;
                        }
                        setTriageFilters((f) => {
                          const current = f.breed ?? [];
                          const next = current.includes(opt.label)
                            ? current.filter((b) => b !== opt.label)
                            : [...current, opt.label];
                          return { ...f, breed: next.length ? next : undefined };
                        });
                      }}
                    >
                      <Text style={{ color: selected ? '#fff' : colors.textPrimary, fontSize: 12 }} numberOfLines={1}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Text style={[styles.triageLabel, { color: colors.textSecondary }]}>Energia</Text>
              <View style={styles.triageRow}>
                {['', 'LOW', 'MEDIUM', 'HIGH'].map((v) => {
                  const energySelected = (triageFilters.energyLevel ?? '') === v;
                  return (
                    <TouchableOpacity
                      key={v || 'any'}
                      style={[styles.triageChip, { backgroundColor: energySelected ? colors.primary : colors.background }]}
                      onPress={() => setTriageFilters((f) => ({ ...f, energyLevel: (f.energyLevel ?? '') === v ? undefined : (v || undefined) }))}
                    >
                      <Text style={{ color: energySelected ? '#fff' : colors.textPrimary, fontSize: 12 }}>{v ? { LOW: 'Calmo', MEDIUM: 'Moderado', HIGH: 'Agitado' }[v] : 'Qualquer'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.triageLabel, { color: colors.textSecondary }]}>Temperamento</Text>
              <View style={styles.triageRow}>
                {['', 'CALM', 'PLAYFUL', 'SHY', 'SOCIABLE', 'INDEPENDENT'].map((v) => {
                  const temperamentSelected = (triageFilters.temperament ?? '') === v;
                  return (
                    <TouchableOpacity
                      key={v || 'any'}
                      style={[styles.triageChip, { backgroundColor: temperamentSelected ? colors.primary : colors.background }]}
                      onPress={() => setTriageFilters((f) => ({ ...f, temperament: (f.temperament ?? '') === v ? undefined : (v || undefined) }))}
                    >
                      <Text style={{ color: temperamentSelected ? '#fff' : colors.textPrimary, fontSize: 12 }}>{v ? { CALM: 'Tranquilo', PLAYFUL: 'Brincalhão', SHY: 'Tímido', SOCIABLE: 'Sociável', INDEPENDENT: 'Independente' }[v] : 'Qualquer'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.triageLabel, { color: colors.textSecondary }]}>Dá bem com crianças</Text>
              <View style={styles.triageRow}>
                {['', 'YES', 'NO'].map((v) => {
                  const goodWithChildrenSelected = (triageFilters.goodWithChildren ?? '') === v;
                  return (
                    <TouchableOpacity
                      key={v || 'any'}
                      style={[styles.triageChip, { backgroundColor: goodWithChildrenSelected ? colors.primary : colors.background }]}
                      onPress={() => setTriageFilters((f) => ({ ...f, goodWithChildren: (f.goodWithChildren ?? '') === v ? undefined : (v || undefined) }))}
                    >
                      <Text style={{ color: goodWithChildrenSelected ? '#fff' : colors.textPrimary, fontSize: 12 }}>{v ? { YES: 'Sim', NO: 'Não' }[v] : 'Qualquer'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.triageLabel, { color: colors.textSecondary }]}>Necessidades especiais</Text>
              <View style={styles.triageRow}>
                <TouchableOpacity
                  style={[styles.triageChip, { backgroundColor: triageFilters.hasSpecialNeeds === undefined ? colors.primary : colors.background }]}
                  onPress={() => setTriageFilters((f) => ({ ...f, hasSpecialNeeds: undefined }))}
                >
                  <Text style={{ color: triageFilters.hasSpecialNeeds === undefined ? '#fff' : colors.textPrimary, fontSize: 12 }}>Qualquer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.triageChip, { backgroundColor: triageFilters.hasSpecialNeeds === true ? colors.primary : colors.background }]}
                  onPress={() => setTriageFilters((f) => ({ ...f, hasSpecialNeeds: f.hasSpecialNeeds === true ? undefined : true }))}
                >
                  <Text style={{ color: triageFilters.hasSpecialNeeds === true ? '#fff' : colors.textPrimary, fontSize: 12 }}>Sim</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.triageLabel, { color: colors.textSecondary }]}>Dócil</Text>
              <View style={styles.triageRow}>
                <TouchableOpacity
                  style={[styles.triageChip, { backgroundColor: triageFilters.isDocile === undefined ? colors.primary : colors.background }]}
                  onPress={() => setTriageFilters((f) => ({ ...f, isDocile: undefined }))}
                >
                  <Text style={{ color: triageFilters.isDocile === undefined ? '#fff' : colors.textPrimary, fontSize: 12 }}>Qualquer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.triageChip, { backgroundColor: triageFilters.isDocile === true ? colors.primary : colors.background }]}
                  onPress={() => setTriageFilters((f) => ({ ...f, isDocile: f.isDocile === true ? undefined : true }))}
                >
                  <Text style={{ color: triageFilters.isDocile === true ? '#fff' : colors.textPrimary, fontSize: 12 }}>Sim</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.triageLabel, { color: colors.textSecondary }]}>Adestrado</Text>
              <View style={styles.triageRow}>
                <TouchableOpacity
                  style={[styles.triageChip, { backgroundColor: triageFilters.isTrained === undefined ? colors.primary : colors.background }]}
                  onPress={() => setTriageFilters((f) => ({ ...f, isTrained: undefined }))}
                >
                  <Text style={{ color: triageFilters.isTrained === undefined ? '#fff' : colors.textPrimary, fontSize: 12 }}>Qualquer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.triageChip, { backgroundColor: triageFilters.isTrained === true ? colors.primary : colors.background }]}
                  onPress={() => setTriageFilters((f) => ({ ...f, isTrained: f.isTrained === true ? undefined : true }))}
                >
                  <Text style={{ color: triageFilters.isTrained === true ? '#fff' : colors.textPrimary, fontSize: 12 }}>Sim</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.triageModalActions}>
                <TouchableOpacity
                  style={[styles.triageModalBtn, { borderColor: colors.textSecondary }]}
                  onPress={() => {
                    setTriageFilters({});
                    setShowTriageModal(false);
                    setCursor(null);
                    setAccumulatedItems(null);
                    setChangingFilter(true);
                  }}
                >
                  <Text style={{ color: colors.textSecondary }}>Limpar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.triageModalBtn, { backgroundColor: colors.primary }]}
                  disabled={updateRadiusMutation.isPending}
                  onPress={() => {
                    const closeAndApplyFilters = () => {
                      setShowTriageModal(false);
                      setCursor(null);
                      setAccumulatedItems(null);
                      setChangingFilter(true);
                    };
                    if (userId) {
                      const currentRadius = prefs?.radiusKm ?? 300;
                      const radiusChanged = triageModalRadiusKm !== currentRadius;
                      if (radiusChanged) {
                        updateRadiusMutation.mutate(triageModalRadiusKm, {
                          onSuccess: closeAndApplyFilters,
                          onError: () => {
                            closeAndApplyFilters();
                            Alert.alert('Erro', 'Não foi possível salvar o raio. Tente novamente.');
                          },
                        });
                        return;
                      }
                    } else {
                      setGuestRadiusKm(triageModalRadiusKm);
                    }
                    closeAndApplyFilters();
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>
                    {updateRadiusMutation.isPending ? 'Salvando...' : 'Aplicar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );

  const guestSlidesFooter = isGuest ? (
    <View style={[styles.guestSlidesBlockFixed, { backgroundColor: guestSlidesOrange + '0C', borderTopColor: guestSlidesOrange + '25' }]}>
      <Text style={[styles.guestSlidesTitle, { color: colors.textPrimary }]}>Conheça o app</Text>
      <ScrollView
        ref={guestSlideListRef}
        horizontal
        pagingEnabled={false}
        snapToInterval={guestSlideStep}
        snapToAlignment="start"
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: spacing.lg }}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / guestSlideStep);
          setGuestSlideIndex(Math.min(Math.max(0, i), FEATURE_SLIDES.length - 1));
        }}
        style={styles.guestSlideList}
      >
        {FEATURE_SLIDES.map((item) => (
          <View key={item.title} style={[styles.guestSlideRow, { width: guestSlideWidth, backgroundColor: guestSlidesOrange + '18' }]}>
            <View style={[styles.guestSlideIconWrapSmall, { backgroundColor: guestSlidesOrange + '35' }]}>
              <Ionicons name={item.icon} size={22} color={guestSlidesOrange} />
            </View>
            <View style={styles.guestSlideTextWrap}>
              <Text style={[styles.guestSlideTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
              <Text style={[styles.guestSlideLine2, { color: colors.textSecondary }]} numberOfLines={2}>{item.line2}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.guestSlidesDots}>
        {FEATURE_SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.guestSlidesDot, { backgroundColor: i === guestSlideIndex ? guestSlidesOrange : colors.textSecondary + '50' }]}
          />
        ))}
      </View>
    </View>
  ) : null;

  const renderGuestCard = (item: FeedItem) => {
    const partner = item.partner as { isPaidPartner?: boolean } | undefined;
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.guestCarouselCard, { backgroundColor: colors.surface }]}
        onPress={() => router.push(`/pet/${item.id}`)}
        activeOpacity={0.85}
      >
        <View style={styles.guestCarouselCardImageWrap}>
          <ExpoImage
            source={{ uri: item.photos?.[0] ?? 'https://picsum.photos/seed/pet/400/500' }}
            style={[styles.guestCarouselCardImage, { width: GUEST_CARD_WIDTH, height: GUEST_CARD_IMAGE_SIZE }]}
            contentFit="cover"
          />
          <View style={styles.guestCarouselCardBadges}>
            {item.verified && (
              <View style={[styles.guestCarouselBadge, { backgroundColor: 'rgba(255,255,255,0.95)' }]}>
                <VerifiedBadge size={10} />
              </View>
            )}
            {partner && (
              <View
                style={[
                  styles.guestCarouselBadge,
                  { backgroundColor: partner.isPaidPartner ? 'rgba(251,191,36,0.9)' : 'rgba(217,119,6,0.92)' },
                ]}
              >
                <Ionicons name={partner.isPaidPartner ? 'star' : 'heart'} size={10} color="#fff" />
              </View>
            )}
            {viewedPetIds.has(item.id) && (
              <View style={[styles.viewedBadgeWrap, styles.guestViewedBadgeWrap, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <Ionicons name="eye-outline" size={10} color="#fff" />
                <Text style={styles.viewedBadgeText}>Visualizado</Text>
              </View>
            )}
          </View>
        </View>
        <View style={[styles.guestCarouselCardInfo, { backgroundColor: colors.surface }]}>
          <Text style={[styles.guestCarouselCardName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.guestCarouselCardMeta, { color: colors.textSecondary }]} numberOfLines={1}>
            {String(item.species).toUpperCase() === 'DOG' ? 'Cachorro' : 'Gato'} • {item.age} ano(s)
          </Text>
          {(item.city != null || formatDistanceKm(item.distanceKm) != null) && (
            <Text style={[styles.guestCarouselCardMeta, { color: colors.textSecondary, fontSize: 11 }]} numberOfLines={1}>
              {[item.city, formatDistanceKm(item.distanceKm)].filter(Boolean).join(' • ')}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isError && !data) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: spacing.lg }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} style={{ marginBottom: spacing.md }} />
        <Text style={[styles.feedErrorTitle, { color: colors.textPrimary }]}>Não foi possível carregar o feed</Text>
        <Text style={[styles.feedErrorSub, { color: colors.textSecondary }]}>Verifique sua conexão e tente novamente.</Text>
        <PrimaryButton title="Tentar de novo" onPress={handleRefresh} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {effectiveViewMode === 'grid' ? (
        isGuest ? (
          <ScrollView
            style={styles.guestCarouselScroll}
            contentContainerStyle={styles.guestCarouselScrollContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching && !isLoading}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {headerAndChips}
            {changingFilter && (isRefetching || isLoading) ? (
              <View style={styles.guestCarouselLoading}>
                <LoadingLogo size={100} />
              </View>
            ) : guestSections.length === 0 && data ? (
              <View style={[styles.emptyWrap, styles.guestEmptyWrap]}>
                <EmptyState
                  title="Nenhum pet no momento"
                  message="Volte mais tarde para novos pets na sua região."
                  icon={<Ionicons name="paw-outline" size={56} color={colors.textSecondary} />}
                />
              </View>
            ) : (
              guestSections.map((section) => (
                <View key={section.title} style={styles.guestSection}>
                  <View style={styles.guestSectionHeader}>
                    <Text style={[styles.guestSectionTitle, { color: colors.textPrimary }]}>{section.title}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        const q = new URLSearchParams();
                        q.set('title', section.title);
                        q.set('species', section.gridSpecies ?? 'BOTH');
                        if (section.gridSize) q.set('size', section.gridSize);
                        router.push(`/feed-grid?${q.toString()}`);
                      }}
                      style={styles.guestSectionArrow}
                      hitSlop={12}
                      accessibilityLabel={`Ver todos: ${section.title}`}
                      accessibilityRole="button"
                    >
                      <Ionicons name="chevron-forward" size={22} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.guestCarouselListContent}
                  >
                    {section.data.map((item) => renderGuestCard(item))}
                  </ScrollView>
                </View>
              ))
            )}
            {guestSlidesFooter}
          </ScrollView>
        ) : (
        <>
          {headerAndChips}
          <FlatList
            data={displayGridItems}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            numColumns={numColumns}
            key={`grid-${numColumns}`}
            style={styles.gridList}
            contentContainerStyle={[styles.gridListContent, { paddingHorizontal: GRID_SCREEN_PADDING + (insets.left + insets.right) / 2 }]}
            columnWrapperStyle={styles.gridRow}
            initialNumToRender={8}
            maxToRenderPerBatch={4}
            windowSize={5}
            renderItem={({ item }) => {
              const partner = item.partner as { isPaidPartner?: boolean } | undefined;
              const onLike = () => {
                swipeMutation.mutate(
                  { petId: item.id, action: 'LIKE' },
                  {
                    onSuccess: () => {
                      setAccumulatedItems((prev) => (prev ?? []).filter((p) => p.id !== item.id));
                      setShowMatchOverlay(true);
                      setToastMessage('Adicionado aos favoritos!');
                    },
                  },
                );
              };
              const onPass = () => {
                swipeMutation.mutate(
                  { petId: item.id, action: 'PASS' },
                  { onSuccess: () => setAccumulatedItems((prev) => (prev ?? []).filter((p) => p.id !== item.id)) },
                );
              };
              const onPressCard = () => {
                router.push(`/pet/${item.id}`);
              };
              return (
                <View style={[styles.gridCard, { backgroundColor: colors.surface, width: gridCellWidth }]}>
                  <TouchableOpacity
                    style={styles.gridCardTouchable}
                    onPress={onPressCard}
                    activeOpacity={0.85}
                  >
                    <View style={styles.gridCardImageWrap}>
                      <ExpoImage
                        source={{ uri: item.photos?.[0] ?? 'https://picsum.photos/seed/pet/400/500' }}
                        style={[styles.gridCardImage, { width: gridCellWidth, height: gridCellWidth / GRID_CELL_ASPECT }]}
                        contentFit="cover"
                      />
                      <View style={styles.gridCardBadges}>
                        {item.verified && (
                          <Pressable
                            style={[styles.gridBadgeIcon, { backgroundColor: 'rgba(255,255,255,0.95)' }]}
                            accessibilityLabel="Verificado"
                            accessibilityRole="image"
                          >
                            <VerifiedBadge size={12} />
                          </Pressable>
                        )}
                        {partner && (
                          <Pressable
                            style={[
                              styles.gridBadgeIcon,
                              { backgroundColor: partner.isPaidPartner ? 'rgba(251,191,36,0.9)' : 'rgba(217,119,6,0.92)' },
                            ]}
                            accessibilityLabel={partner.isPaidPartner ? 'Patrocinado' : 'Parceiro'}
                            accessibilityRole="image"
                          >
                            {partner.logoUrl ? (
                              <ExpoImage source={{ uri: partner.logoUrl }} style={styles.gridPartnerLogo} contentFit="contain" />
                            ) : (
                              <Ionicons name={partner.isPaidPartner ? 'star' : 'heart'} size={12} color="#fff" />
                            )}
                          </Pressable>
                        )}
                        {item.matchScore != null && (
                          <View
                            style={[styles.gridMatchBadge, { backgroundColor: getMatchScoreColor(item.matchScore) + 'e6' }]}
                            accessibilityLabel={`Match ${item.matchScore}%`}
                          >
                            <Ionicons name="speedometer-outline" size={12} color="#fff" />
                            <Text style={styles.gridMatchBadgeText}>{item.matchScore}%</Text>
                          </View>
                        )}
                      </View>
                      {viewedPetIds.has(item.id) && (
                        <View style={[styles.viewedBadgeWrap, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                          <Ionicons name="eye-outline" size={12} color="#fff" />
                          <Text style={styles.viewedBadgeText}>Visualizado</Text>
                        </View>
                      )}
                    </View>
                    <View style={[styles.gridCardInfo, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.gridCardName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
                      <Text style={[styles.gridCardMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                        {String(item.species).toUpperCase() === 'DOG' ? 'Cachorro' : String(item.species).toUpperCase() === 'CAT' ? 'Gato' : item.species} • {item.age} ano(s)
                      </Text>
                      {(item.energyLevel || item.temperament || item.goodWithChildren === 'YES' || item.isDocile || item.isTrained) ? (
                        <Text style={[styles.gridCardMeta, { color: colors.textSecondary, marginTop: 2, fontSize: 11 }]} numberOfLines={1}>
                          {[
                            item.energyLevel && { LOW: 'Calmo', MEDIUM: 'Moderado', HIGH: 'Agitado' }[item.energyLevel],
                            item.temperament && { CALM: 'Tranquilo', PLAYFUL: 'Brincalhão', SHY: 'Tímido', SOCIABLE: 'Sociável', INDEPENDENT: 'Independente' }[item.temperament],
                            item.goodWithChildren === 'YES' && 'Dá bem com crianças',
                            item.isDocile && 'Dócil',
                            item.isTrained && 'Adestrado',
                          ].filter(Boolean).join(' • ')}
                        </Text>
                      ) : null}
                      {(item.city != null || formatDistanceKm(item.distanceKm) != null) && (
                        <View style={styles.gridCardLocation}>
                          <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
                          <Text style={[styles.gridCardLocationText, { color: colors.textSecondary }]} numberOfLines={1}>
                            {[item.city, formatDistanceKm(item.distanceKm)].filter(Boolean).join(' • ')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                  {!isGuest && (
                    <View style={[styles.gridCardActions, { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border ?? colors.textSecondary + '20' }]}>
                      <TouchableOpacity
                        style={[styles.gridCardActionBtn, { backgroundColor: colors.surface }]}
                        onPress={onPass}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Passar"
                      >
                        <Ionicons name="close" size={24} color={colors.accent} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.gridCardActionBtn, { backgroundColor: colors.surface }]}
                        onPress={onLike}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Curtir"
                      >
                        <Ionicons name="heart" size={22} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            }}
            onEndReached={nextCursor ? loadMore : undefined}
            onEndReachedThreshold={0.4}
            ListEmptyComponent={
              changingFilter && (isRefetching || isLoading) ? (
                <View style={styles.gridLoading}>
                  <LoadingLogo size={120} />
                </View>
              ) : displayGridItems.length === 0 && data ? (
                <View style={styles.emptyWrap}>
                  <EmptyState
                    title="Você viu todos por enquanto"
                    message="Volte mais tarde para novos pets na sua região."
                    icon={<Ionicons name="heart-outline" size={56} color={colors.textSecondary} />}
                  />
                </View>
              ) : null
            }
            ListFooterComponent={
              nextCursor && displayGridItems.length > 0 && isRefetching ? (
                <View style={styles.gridFooter}>
                  <LoadingLogo size={48} />
                </View>
              ) : null
            }
            refreshControl={
              <RefreshControl
                refreshing={isRefetching && !isLoading}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
          />
          {guestSlidesFooter}
        </>
        )
      ) : (
        <ScrollView
          style={[styles.screen, { backgroundColor: colors.background }]}
          contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}
          scrollEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isLoading}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {headerAndChips}
          {showSwipeHint && (
            <View style={[styles.swipeHintWrap, { backgroundColor: colors.surface }]}>
              <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
              <Text style={[styles.swipeHint, { color: colors.textSecondary }]}>
                Deslize para ver mais pets
              </Text>
              <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} />
              <TouchableOpacity
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                onPress={() => {
                  const key = userId ? FEED_SWIPE_HINT_SEEN_KEY_PREFIX + userId : FEED_SWIPE_HINT_SEEN_KEY;
                  AsyncStorage.setItem(key, '1');
                  setShowSwipeHint(false);
                }}
                style={[styles.swipeHintDismiss, { borderColor: colors.primary }]}
              >
                <Text style={[styles.swipeHintDismissText, { color: colors.primary }]}>Entendi</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={[styles.deck, { position: 'relative' }]} onLayout={(e) => setDeckHeight(e.nativeEvent.layout.height)} pointerEvents="box-none">
            {changingFilter && (isRefetching || isLoading || items.length === 0) ? (
              <View style={styles.deckLoading}>
                <LoadingLogo size={160} />
              </View>
            ) : currentPet ? (
              <SwipeableCard
                key={currentPet.id}
                fullScreen
                cardHeight={deckHeight > 0 ? deckHeight : undefined}
                onSwipeRight={handleLike}
                onSwipeLeft={handlePass}
                onPress={() => router.push(`/pet/${currentPet.id}`)}
              >
                <View style={styles.swipeCardInner}>
                  <FeedCard
                    pet={currentPet}
                    height={deckHeight > 0 ? deckHeight : undefined}
                    wrapInTouchable={false}
                    showActions={false}
                    onPress={() => router.push(`/pet/${currentPet.id}`)}
                    onLike={handleLike}
                    onPass={handlePass}
                  />
                  {viewedPetIds.has(currentPet.id) && (
                    <View style={[styles.viewedBadgeWrap, styles.swipeViewedBadge, { backgroundColor: 'rgba(0,0,0,0.5)' }]} pointerEvents="none">
                      <Ionicons name="eye-outline" size={14} color="#fff" />
                      <Text style={styles.viewedBadgeText}>Visualizado</Text>
                    </View>
                  )}
                </View>
              </SwipeableCard>
            ) : null}
            {viewMode === 'swipe' && matchTooltipMessage && !showMatchOverlay && (
              <View
                style={[
                  styles.matchTooltipBubble,
                  { backgroundColor: colors.surface, top: insets.top + 12 + 26, right: 12 },
                ]}
                pointerEvents="none"
              >
                <View style={[styles.matchTooltipTail, { borderBottomColor: colors.surface }]} />
                <Text style={[styles.matchTooltipText, { color: colors.textPrimary }]}>{matchTooltipMessage}</Text>
              </View>
            )}
          </View>
          {!(changingFilter && (isRefetching || isLoading || items.length === 0)) && (
            <View style={[styles.feedActions, { backgroundColor: colors.background }]}>
              <TouchableOpacity
                style={[styles.feedActionBtn, styles.feedPassBtn, { backgroundColor: colors.surface }]}
                onPress={handlePass}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={36} color={colors.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.feedActionBtn, styles.feedLikeBtn, { backgroundColor: colors.surface }]}
                onPress={handleLike}
                activeOpacity={0.8}
              >
                <Ionicons name="heart" size={32} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
      <MatchOverlay
        visible={showMatchOverlay}
        onHide={() => {
          const idToRemove = likedPetIdRef.current;
          likedPetIdRef.current = null;
          matchOverlayShownForRef.current = null;
          if (idToRemove) {
            setAccumulatedItems((prev) => (prev ?? []).filter((p) => p.id !== idToRemove));
          }
          setShowMatchOverlay(false);
        }}
      />
      {showLogoutBanner && (
        <NotificationBanner
          visible
          title="Você saiu da sua conta"
          body="Faça login quando quiser para favoritar e anunciar pets. Navegue à vontade como visitante."
          onClose={() => setShowLogoutBanner(false)}
          autoHideAfterMs={4500}
        />
      )}
      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />
      {showUndo && (
        <TouchableOpacity
          style={[styles.undoBtn, { backgroundColor: colors.surface }]}
          onPress={handleUndo}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-undo" size={20} color={colors.primary} />
          <Text style={[styles.undoBtnText, { color: colors.primary }]}>Desfazer</Text>
        </TouchableOpacity>
      )}
      <Modal visible={showMatchScoreIntroModal} transparent animationType="fade">
        <Pressable
          style={[styles.matchScoreIntroOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Pressable
            style={[styles.matchScoreIntroCard, { backgroundColor: colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.matchScoreIntroScroll}
            >
              <View style={[styles.matchScoreIntroIconWrap, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="speedometer-outline" size={40} color={colors.primary} />
              </View>
              <Text style={[styles.matchScoreIntroTitle, { color: colors.textPrimary }]}>
                O que é o Match Score?
              </Text>
              <Text style={[styles.matchScoreIntroBody, { color: colors.textSecondary }]}>
                O match é a compatibilidade entre você e o pet, calculada com base no seu perfil e nas preferências do tutor (espécie, porte, experiência, etc.). Quanto maior o %, mais vocês combinam.
              </Text>
              <Text style={[styles.matchScoreIntroSubtitle, { color: colors.textPrimary }]}>
                As cores indicam a faixa:
              </Text>
              <View style={styles.matchScoreIntroBands}>
                {MATCH_SCORE_INTRO_BANDS.map((band) => (
                  <View key={band.label} style={styles.matchScoreIntroBandRow}>
                    <View
                      style={[
                        styles.matchScoreIntroBadge,
                        { backgroundColor: band.color + 'e6' },
                      ]}
                    >
                      <Ionicons name="speedometer-outline" size={14} color="#fff" />
                      <Text style={styles.matchScoreIntroBadgeText}>
                        {band.min}-{band.max}%
                      </Text>
                    </View>
                    <Text style={[styles.matchScoreIntroBandLabel, { color: colors.textSecondary }]}>
                      {band.label} compatibilidade
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.matchScoreIntroBody, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                Para ver os pontos que batem ou não com você, toque no badge do match na ficha do pet. Lá você vê o que combinou e o que o tutor considera importante.
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.matchScoreIntroCheckboxRow}
              onPress={() => setMatchScoreDontShowAgain((v) => !v)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.matchScoreIntroCheckbox,
                  { borderColor: colors.textSecondary + '60' },
                  matchScoreDontShowAgain && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
              >
                {matchScoreDontShowAgain && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <Text style={[styles.matchScoreIntroCheckboxLabel, { color: colors.textSecondary }]}>
                Não exibir novamente
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.matchScoreIntroBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                if (matchScoreDontShowAgain && userId) {
                  AsyncStorage.setItem(FEED_MATCH_SCORE_INTRO_SEEN_KEY_PREFIX + userId, '1');
                }
                setShowMatchScoreIntroModal(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.matchScoreIntroBtnText}>Entendi</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
      {isGuest && showOnboardingSlidesSheet && (
        <OnboardingSlidesSheet
          visible={showOnboardingSlidesSheet}
          onComplete={completeOnboardingSlides}
          onLogin={handleOnboardingLogin}
          onSignup={handleOnboardingSignup}
          onExplore={handleOnboardingExplore}
          onTrackEvent={trackEvent}
          onShowToast={setToastMessage}
        />
      )}
      {isGuest && !showOnboardingSlidesSheet && (
        <GuestWelcomeSheet
          visible={showGuestWelcomeSheet}
          onDismiss={dismissGuestWelcomeSheet}
          onLogin={() => { setShowGuestWelcomeSheet(false); router.push('/(auth)/login'); }}
          onSignup={() => { setShowGuestWelcomeSheet(false); router.push('/(auth)/signup'); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  brandHeader: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLogo: { height: 32, width: 120 },
  headerLogoPressable: {},
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  viewModeToggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewModeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { fontSize: 13 },
  feedDisclaimer: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 2,
    paddingBottom: spacing.sm,
    fontStyle: 'italic',
  },
  scrollContent: { flex: 1, minHeight: 0 },
  gridList: { flex: 1 },
  gridListContent: { paddingBottom: spacing.xl, paddingTop: spacing.xs, flexGrow: 1 },
  gridRow: { gap: GRID_GAP, marginBottom: GRID_GAP },
  gridCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gridCardTouchable: { flex: 1 },
  gridCardImageWrap: { position: 'relative' },
  gridCardImage: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  gridCardBadges: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gridMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 10,
  },
  gridMatchBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  gridBadgeIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridPartnerLogo: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  viewedBadgeWrap: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  viewedBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  swipeCardInner: { flex: 1, position: 'relative' },
  swipeViewedBadge: { bottom: 24, left: 'auto', right: 12, top: 'auto' },
  guestViewedBadgeWrap: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gridCardInfo: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
  gridCardName: { fontSize: 14, fontWeight: '700' },
  gridCardMeta: { fontSize: 12, marginTop: 2 },
  gridCardLocation: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  gridCardLocationText: { fontSize: 11 },
  gridCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  gridCardActionBtn: {
    padding: 6,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLoading: { flex: 1, minHeight: 280, justifyContent: 'center', alignItems: 'center' },
  gridFooter: { paddingVertical: spacing.lg, alignItems: 'center' },
  guestCarouselScroll: { flex: 1 },
  guestCarouselScrollContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  guestCarouselLoading: {
    minHeight: 220,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  guestSection: {
    marginBottom: spacing.xl,
  },
  guestSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  guestSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  guestSectionArrow: {
    padding: spacing.xs,
  },
  guestCarouselListContent: {
    paddingHorizontal: spacing.lg,
    paddingRight: spacing.xl,
  },
  guestCarouselCard: {
    width: GUEST_CARD_WIDTH,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: GUEST_CARD_GAP,
  },
  guestCarouselCardImageWrap: { position: 'relative' },
  guestCarouselCardImage: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  guestCarouselCardBadges: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  guestCarouselBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestCarouselCardInfo: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: GUEST_CARD_META_HEIGHT,
  },
  guestCarouselCardName: { fontSize: 14, fontWeight: '700' },
  guestCarouselCardMeta: { fontSize: 12, marginTop: 2 },
  guestSlidesBlock: { marginBottom: spacing.xl },
  guestSlidesBlockFixed: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
  },
  guestSlidesTitle: { fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: spacing.sm },
  guestSlideList: { height: 56, marginBottom: 0 },
  guestSlideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    gap: spacing.sm,
  },
  guestSlideIconWrapSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestSlideTextWrap: { flex: 1, minWidth: 0 },
  guestSlideTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  guestSlideLine2: { fontSize: 11, lineHeight: 14 },
  guestSlidesDots: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: spacing.sm, marginBottom: 0 },
  guestSlidesDot: { width: 5, height: 5, borderRadius: 2.5 },
  filtersWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
  },
  collapsibleHeaderText: { fontSize: 15, fontWeight: '600' },
  filterLabel: { fontSize: 12, fontWeight: '600', marginBottom: spacing.xs, marginTop: spacing.sm },
  feedSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 40,
    marginBottom: spacing.sm,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: 0, paddingBottom: spacing.sm, alignItems: 'center' },
  chipsRowFirst: { paddingBottom: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 20, borderWidth: 1 },
  chipRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  chipText: { fontSize: 14, fontWeight: '600' },
  chipLabel: { fontSize: 14, fontWeight: '500', marginRight: 4 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 4 },
  swipeHintDismiss: {
    marginLeft: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  swipeHintDismissText: { fontSize: 13, fontWeight: '600' },
  swipeHintWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  swipeHint: { fontSize: 13, textAlign: 'center' },
  deck: { flex: 1, minHeight: 0 },
  deckLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  matchTooltipBubble: {
    position: 'absolute',
    maxWidth: Dimensions.get('window').width * 0.72,
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingTop: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0.2,
    elevation: 6,
  },
  matchTooltipTail: {
    position: 'absolute',
    top: -8,
    right: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  matchTooltipText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  feedActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    minHeight: 88,
  },
  feedActionBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    shadowOpacity: 0.25,
    elevation: 6,
  },
  feedPassBtn: {},
  feedLikeBtn: {},
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg },
  guestEmptyWrap: { paddingVertical: spacing.xl, minHeight: 200 },
  feedErrorTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: spacing.xs },
  feedErrorSub: { fontSize: 15, textAlign: 'center' },
  emptyStateScrollContent: { flexGrow: 1, paddingBottom: spacing.xl },
  loadMoreBtn: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    alignSelf: 'center',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'center',
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '600' },
  loadMoreBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  undoBtn: {
    position: 'absolute',
    bottom: 100,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0.15,
    elevation: 4,
  },
  undoBtnText: { fontSize: 15, fontWeight: '600' },
  matchScoreIntroOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  matchScoreIntroCard: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
    borderRadius: 20,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  matchScoreIntroScroll: {
    paddingBottom: spacing.md,
  },
  matchScoreIntroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  matchScoreIntroTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  matchScoreIntroBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  matchScoreIntroSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  matchScoreIntroBands: {
    gap: spacing.xs,
  },
  matchScoreIntroBandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  matchScoreIntroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    minWidth: 72,
  },
  matchScoreIntroBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  matchScoreIntroBandLabel: {
    fontSize: 14,
  },
  matchScoreIntroCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  matchScoreIntroCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchScoreIntroCheckboxLabel: {
    fontSize: 14,
    flex: 1,
  },
  matchScoreIntroBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  matchScoreIntroBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  triageModalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing.lg,
    paddingBottom: spacing.xl + 24,
  },
  triageModalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  triageLabel: { fontSize: 13, marginTop: spacing.sm, marginBottom: 4 },
  triageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  triageBreedScroll: { maxHeight: 44, marginBottom: 4 },
  triageBreedScrollContent: { flexDirection: 'row', gap: 8, paddingRight: spacing.lg },
  triageChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  triageModalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: spacing.lg },
  triageModalBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
});
