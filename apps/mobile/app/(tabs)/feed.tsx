import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, FlatList, Dimensions, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { SwipeableCard, FeedCard, MatchOverlay, Toast, EmptyState, LoadingLogo, VerifiedBadge } from '../../src/components';
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
const GRID_GAP = spacing.sm;
const GRID_PADDING = spacing.md;
const NUM_COLUMNS = 2;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_CELL_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / NUM_COLUMNS;
const GRID_CELL_ASPECT = 4 / 5;
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
  type ViewMode = 'swipe' | 'grid';
  const [viewMode, setViewModeState] = useState<ViewMode>('swipe');
  const [gridItems, setGridItems] = useState<FeedResponse['items']>([]);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
  }, []);

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

  // Primeira carga: acumula; ao carregar mais: mostra os próximos 20 no deck (grid sem duplicar por id)
  useEffect(() => {
    if (!data?.items?.length) return;
    if (cursor === null) {
      setAccumulatedItems(data.items);
      if (viewMode === 'grid') setGridItems(data.items);
    } else {
      setLocalItems(data.items);
      if (viewMode === 'grid') {
        setGridItems((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          const newItems = data.items.filter((p) => !ids.has(p.id));
          return newItems.length ? [...prev, ...newItems] : prev;
        });
      }
    }
  }, [data?.items, cursor, viewMode]);

  const items = localItems ?? accumulatedItems ?? data?.items ?? [];
  const displayGridItems = viewMode === 'grid' ? gridItems : [];

  // Ao alternar para grid com dados já carregados, preenche gridItems
  useEffect(() => {
    if (viewMode === 'grid' && gridItems.length === 0 && (accumulatedItems?.length ?? 0) > 0) {
      setGridItems(accumulatedItems ?? []);
    }
  }, [viewMode, gridItems.length, accumulatedItems]);

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
    setGridItems([]);
    refetch();
  }, [refetch]);

  const currentPet = items[0];
  const insets = useSafeAreaInsets();

  if (isLoading && items.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={[styles.brandHeader, { paddingTop: insets.top + 8 }]}>
          <ExpoImage source={isDark ? LogoDark : LogoLight} style={styles.headerLogo} contentFit="contain" />
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
          <ExpoImage source={isDark ? LogoDark : LogoLight} style={styles.headerLogo} contentFit="contain" />
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

  if (!currentPet && viewMode === 'swipe' && !(changingFilter && (isRefetching || isLoading))) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={[styles.brandHeader, { paddingTop: insets.top + 8 }]}>
          <ExpoImage source={isDark ? LogoDark : LogoLight} style={styles.headerLogo} contentFit="contain" />
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

  const headerAndChips = (
    <>
      <View style={[styles.brandHeader, { paddingTop: Math.max(insets.top, 8), paddingBottom: 4 }]}>
        <ExpoImage source={isDark ? LogoDark : LogoLight} style={styles.headerLogo} contentFit="contain" />
        <View style={styles.headerRight}>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {viewMode === 'grid' ? displayGridItems.length : items.length} {viewMode === 'grid' ? 'pet' : 'restante'}{(viewMode === 'grid' ? displayGridItems.length : items.length) !== 1 ? 's' : ''}
          </Text>
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
        </View>
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
              setGridItems([]);
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
    </>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {viewMode === 'grid' ? (
        <>
          {headerAndChips}
          <FlatList
            data={displayGridItems}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            numColumns={NUM_COLUMNS}
            key="grid"
            style={styles.gridList}
            contentContainerStyle={[styles.gridListContent, { paddingHorizontal: GRID_PADDING }]}
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
                      setGridItems((prev) => prev.filter((p) => p.id !== item.id));
                      setShowMatchOverlay(true);
                      setToastMessage('Adicionado aos favoritos!');
                    },
                  },
                );
              };
              const onPass = () => {
                swipeMutation.mutate(
                  { petId: item.id, action: 'PASS' },
                  { onSuccess: () => setGridItems((prev) => prev.filter((p) => p.id !== item.id)) },
                );
              };
              return (
                <View style={[styles.gridCard, { backgroundColor: colors.surface }]}>
                  <TouchableOpacity
                    style={styles.gridCardTouchable}
                    onPress={() => router.push(`/pet/${item.id}`)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.gridCardImageWrap}>
                      <ExpoImage
                        source={{ uri: item.photos?.[0] ?? 'https://placedog.net/400/500' }}
                        style={[styles.gridCardImage, { width: GRID_CELL_WIDTH, height: GRID_CELL_WIDTH / GRID_CELL_ASPECT }]}
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
                            <Ionicons name={partner.isPaidPartner ? 'star' : 'heart'} size={12} color="#fff" />
                          </Pressable>
                        )}
                      </View>
                    </View>
                    <View style={[styles.gridCardInfo, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.gridCardName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
                      <Text style={[styles.gridCardMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.species === 'DOG' ? 'Cachorro' : item.species === 'CAT' ? 'Gato' : item.species} • {item.age} ano(s)
                      </Text>
                      {(item.city != null || item.distanceKm != null) && (
                        <View style={styles.gridCardLocation}>
                          <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
                          <Text style={[styles.gridCardLocationText, { color: colors.textSecondary }]} numberOfLines={1}>
                            {[item.city, item.distanceKm != null ? `${item.distanceKm.toFixed(1)} km` : null].filter(Boolean).join(' • ')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
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
        </>
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
      )}
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
  scrollContent: { flex: 1, minHeight: 0 },
  gridList: { flex: 1 },
  gridListContent: { paddingBottom: spacing.xl, paddingTop: spacing.xs, flexGrow: 1 },
  gridRow: { gap: GRID_GAP, marginBottom: GRID_GAP },
  gridCard: {
    width: GRID_CELL_WIDTH,
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
  gridBadgeIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
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
