import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { SwipeableCard, FeedCard, MatchOverlay, Toast, EmptyState, LoadingLogo } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { fetchFeed, type FeedResponse, type FeedSpeciesFilter } from '../../src/api/feed';
import { createSwipe } from '../../src/api/swipes';
import { addFavorite } from '../../src/api/favorites';
import { trackEvent } from '../../src/analytics';
import { getPreferences } from '../../src/api/me';
import { useUpdateCityFromLocation } from '../../src/hooks/useUpdateCityFromLocation';
import { spacing } from '../../src/theme';

type FeedItem = FeedResponse['items'][number];

const FEED_QUERY_KEY = ['feed'];

const LogoLight = require('../../assets/brand/logo/logo_horizontal_light.png');
const LogoDark = require('../../assets/brand/logo/logo_dark.png');

export default function FeedScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const queryClient = useQueryClient();
  const [cursor, setCursor] = useState<string | null>(null);
  const [accumulatedItems, setAccumulatedItems] = useState<FeedResponse['items'] | null>(null);
  const [localItems, setLocalItems] = useState<FeedResponse['items'] | null>(null);
  const [showMatchOverlay, setShowMatchOverlay] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const likedPetIdRef = useRef<string | null>(null);
  const matchOverlayShownForRef = useRef<string | null>(null);
  const lastLikedPetRef = useRef<FeedItem | null>(null);
  const lastPassedPetRef = useRef<FeedItem | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [speciesFilter, setSpeciesFilter] = useState<FeedSpeciesFilter>('BOTH');
  const [deckHeight, setDeckHeight] = useState<number>(0);
  const [changingFilter, setChangingFilter] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!isLoading && !isRefetching) setChangingFilter(false);
  }, [isLoading, isRefetching]);

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

  useUpdateCityFromLocation(userCoords);

  const { data: prefs } = useQuery({
    queryKey: ['me', 'preferences'],
    queryFn: getPreferences,
    staleTime: 5 * 60_000,
  });

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: [...FEED_QUERY_KEY, cursor, prefs?.radiusKm, speciesFilter, userCoords?.lat, userCoords?.lng],
    queryFn: () =>
      fetchFeed({
        ...(userCoords && { lat: userCoords.lat, lng: userCoords.lng }),
        radiusKm: prefs?.radiusKm ?? 50,
        cursor: cursor ?? undefined,
        species: speciesFilter,
      }),
    staleTime: 60_000,
    enabled: true,
  });

  const nextCursor = data?.nextCursor ?? null;

  // Primeira carga: acumula; ao carregar mais: mostra os próximos 20 no deck
  useEffect(() => {
    if (!data?.items?.length) return;
    if (cursor === null) {
      setAccumulatedItems(data.items);
    } else {
      setLocalItems(data.items);
    }
  }, [data?.items, cursor]);

  const items = localItems ?? accumulatedItems ?? data?.items ?? [];

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

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
        setLocalItems((prev) => {
          const list = prev ?? data?.items ?? [];
          return list.filter((p) => p.id !== petId);
        });
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
      trackEvent({ name: 'swipe', properties: { petId: variables.petId, action: variables.action } });
      if (variables.action === 'LIKE') {
        trackEvent({ name: 'like', properties: { petId: variables.petId } });
        lastLikedPetRef.current = null;
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
          setLocalItems((prev) => {
            const list = prev ?? data?.items ?? [];
            return [pet, ...list];
          });
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
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
      setLocalItems((prev) => {
        const list = prev ?? data?.items ?? [];
        return [pet, ...list];
      });
    }
  }, [data?.items]);

  const loadMore = useCallback(() => {
    if (nextCursor) setCursor(nextCursor);
  }, [nextCursor]);

  const handleRefresh = useCallback(() => {
    setCursor(null);
    setAccumulatedItems(null);
    setLocalItems(null);
    refetch();
  }, [refetch]);

  const currentPet = items[0];
  const insets = useSafeAreaInsets();

  if (isLoading && items.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={[styles.brandHeader, { paddingTop: insets.top + 8 }]}>
          <Image source={isDark ? LogoDark : LogoLight} style={styles.headerLogo} resizeMode="contain" />
        </View>
        <View style={[styles.deck, styles.deckLoading]}>
          <LoadingLogo size={160} />
        </View>
      </View>
    );
  }

  if (items.length === 0 && !data) {
    const radiusKm = prefs?.radiusKm ?? 50;
    const emptyMessage = userCoords
      ? `Nenhum pet no raio de ${radiusKm} km. Aumente o raio em Preferências ou tente outro filtro.`
      : 'Não há anúncios no feed. Ative sua localização ou tente outro filtro.';
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={[styles.brandHeader, { paddingTop: insets.top + 8 }]}>
          <Image source={isDark ? LogoDark : LogoLight} style={styles.headerLogo} resizeMode="contain" />
        </View>
        <View style={styles.emptyWrap}>
          <EmptyState
            title="Nenhum pet no momento"
            message={emptyMessage}
            icon={<Ionicons name="paw-outline" size={56} color={colors.textSecondary} />}
          />
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
        </View>
      </View>
    );
  }

  if (!currentPet && !(changingFilter && (isRefetching || isLoading))) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={[styles.brandHeader, { paddingTop: insets.top + 8 }]}>
          <Image source={isDark ? LogoDark : LogoLight} style={styles.headerLogo} resizeMode="contain" />
        </View>
        <View style={styles.emptyWrap}>
          <EmptyState
            title="Você viu todos por enquanto"
            message="Volte mais tarde para novos pets na sua região."
            icon={<Ionicons name="heart-outline" size={56} color={colors.textSecondary} />}
          />
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

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
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
        <View style={[styles.brandHeader, { paddingTop: Math.max(insets.top, 8), paddingBottom: 4 }]}>
          <Image source={isDark ? LogoDark : LogoLight} style={styles.headerLogo} resizeMode="contain" />
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {items.length} restante{items.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={[styles.chipsRow, { paddingBottom: spacing.xs }]}>
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
                setLocalItems(null);
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
        </View>
        <View style={styles.swipeHintWrap}>
          <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
          <Text style={[styles.swipeHint, { color: colors.textSecondary }]}>
            Arraste o card para os lados para curtir ou passar
          </Text>
          <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} />
        </View>
        <View style={styles.deck} onLayout={(e) => setDeckHeight(e.nativeEvent.layout.height)}>
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
              <FeedCard
                pet={currentPet}
                height={deckHeight > 0 ? deckHeight : undefined}
                wrapInTouchable={false}
                showActions={false}
                onPress={() => router.push(`/pet/${currentPet.id}`)}
                onLike={handleLike}
                onPass={handlePass}
              />
            </SwipeableCard>
          ) : null}
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
      <MatchOverlay
        visible={showMatchOverlay}
        onHide={() => {
          const idToRemove = likedPetIdRef.current;
          likedPetIdRef.current = null;
          matchOverlayShownForRef.current = null;
          if (idToRemove) {
            setLocalItems((prev) => {
              const list = prev ?? data?.items ?? [];
              return list.filter((p) => p.id !== idToRemove);
            });
          }
          setShowMatchOverlay(false);
        }}
      />
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
  hint: { fontSize: 13 },
  scrollContent: { flex: 1, minHeight: 0 },
  chipsRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 14, fontWeight: '600' },
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
});
