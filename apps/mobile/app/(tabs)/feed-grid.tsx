import { useState, useEffect, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import * as Location from 'expo-location';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, LoadingLogo, EmptyState, VerifiedBadge } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useResponsiveGridColumns } from '../../src/hooks/useResponsiveGridColumns';
import { fetchFeed, type FeedResponse, type FeedSpeciesFilter } from '../../src/api/feed';
import { getPreferences } from '../../src/api/me';
import { spacing } from '../../src/theme';

const GRID_PADDING = spacing.md;
const GRID_GAP = spacing.sm;
const GRID_CELL_ASPECT = 4 / 5;

type FeedItem = FeedResponse['items'][number];

function GridCardPhotos({ photos, width, aspect }: { photos: string[]; width: number; aspect: number }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const uris = photos?.length ? photos : ['https://picsum.photos/seed/pet/400/500'];
  const height = width / aspect;

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / width);
    setActiveIndex(Math.min(idx, uris.length - 1));
  }, [width, uris.length]);

  if (uris.length <= 1) {
    return <ExpoImage source={{ uri: uris[0] }} style={[styles.cardImage, { width, height }]} contentFit="cover" />;
  }

  return (
    <View style={{ width, height, position: 'relative' }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
        style={{ width, height }}
        contentContainerStyle={{ width: width * uris.length }}
      >
        {uris.map((uri, i) => (
          <ExpoImage key={i} source={{ uri }} style={[styles.cardImage, { width, height }]} contentFit="cover" />
        ))}
      </ScrollView>
      <View style={styles.dotsWrap}>
        {uris.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

function formatDistanceKm(val: unknown): string | null {
  if (val == null) return null;
  const n = Number(val);
  return Number.isFinite(n) ? `${n.toFixed(1)} km` : null;
}

const VALID_SPECIES: FeedSpeciesFilter[] = ['BOTH', 'DOG', 'CAT'];

export default function FeedGridScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ title?: string; species?: string; size?: string }>();
  const title = params.title ?? 'Pets para adoção';
  const speciesParam = VALID_SPECIES.includes((params.species ?? '') as FeedSpeciesFilter)
    ? (params.species as FeedSpeciesFilter)
    : 'BOTH';
  const sizeParam = params.size ?? undefined;

  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const numColumns = useResponsiveGridColumns();
  const horizontalPadding = insets.left + insets.right + 2 * spacing.md + 2 * GRID_PADDING;
  const contentWidth = windowWidth - horizontalPadding;
  const gridCellWidth = contentWidth > 0 ? (contentWidth - GRID_GAP * (numColumns - 1)) / numColumns : 0;

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const { data: prefs } = useQuery({
    queryKey: ['me', 'preferences'],
    queryFn: getPreferences,
    staleTime: 5 * 60_000,
  });
  const radiusKm = prefs?.radiusKm ?? 300;

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({
            maxAge: 60_000,
            timeout: 15_000,
          });
          setUserCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        } catch {
          setUserCoords(null);
        }
      } else {
        setUserCoords(null);
      }
    })();
  }, []);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['feed', 'grid', speciesParam, sizeParam, userCoords?.lat, userCoords?.lng, radiusKm],
    queryFn: async ({ pageParam }) => {
      const res = await fetchFeed({
        lat: userCoords?.lat,
        lng: userCoords?.lng,
        radiusKm,
        cursor: pageParam ?? undefined,
        species: speciesParam,
        size: sizeParam,
      });
      return res;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null as string | null,
    enabled: true,
  });

  const items = data?.pages.flatMap((p) => p.items) ?? [];
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      title,
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/feed')}
          style={{ padding: 8, marginLeft: 4 }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      ),
    });
  }, [title, navigation, router, colors.textPrimary]);

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => {
      const partner = item.partner as { isPaidPartner?: boolean } | undefined;
      return (
        <View style={[styles.card, { backgroundColor: colors.surface, width: gridCellWidth }]}>
          <TouchableOpacity
            style={styles.cardTouchable}
            onPress={() => router.push(`/pet/${item.id}?from=feed`)}
            activeOpacity={0.85}
          >
            <View style={styles.cardImageWrap}>
              <GridCardPhotos
                photos={item.photos ?? []}
                width={gridCellWidth}
                aspect={GRID_CELL_ASPECT}
              />
              <View style={styles.badges}>
                {item.verified && (
                  <View style={[styles.badgeIcon, { backgroundColor: 'rgba(255,255,255,0.95)' }]}>
                    <VerifiedBadge variant="pet" size={12} iconBackgroundColor="rgba(255,255,255,0.95)" />
                  </View>
                )}
                {partner && (
                  <View
                    style={[
                      styles.badgeIcon,
                      {
                        backgroundColor: partner.isPaidPartner
                          ? 'rgba(251,191,36,0.9)'
                          : 'rgba(217,119,6,0.92)',
                      },
                    ]}
                  >
                    {(partner as { logoUrl?: string }).logoUrl ? (
                      <ExpoImage
                        source={{ uri: (partner as { logoUrl: string }).logoUrl }}
                        style={styles.partnerLogo}
                        contentFit="contain"
                      />
                    ) : (
                      <Ionicons
                        name={partner.isPaidPartner ? 'star' : 'heart'}
                        size={12}
                        color="#fff"
                      />
                    )}
                  </View>
                )}
              </View>
            </View>
            <View style={[styles.cardInfo, { backgroundColor: colors.surface }]}>
              <View style={styles.cardInfoHeader}>
                <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.name}
                </Text>
                {partner && (
                  <View
                    style={[
                      styles.partnerChip,
                      {
                        backgroundColor: partner.isPaidPartner ? (colors.warning ?? '#f59e0b') + '22' : colors.primary + '22',
                        borderColor: partner.isPaidPartner ? (colors.warning ?? '#f59e0b') + '66' : colors.primary + '66',
                      },
                    ]}
                  >
                    <Ionicons
                      name={partner.isPaidPartner ? 'star' : 'heart'}
                      size={10}
                      color={partner.isPaidPartner ? (colors.warning ?? '#f59e0b') : colors.primary}
                    />
                    <Text
                      style={[
                        styles.partnerChipText,
                        { color: partner.isPaidPartner ? (colors.warning ?? '#f59e0b') : colors.primary },
                      ]}
                      numberOfLines={1}
                    >
                      Parceria
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.cardMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                {String(item.species).toUpperCase() === 'DOG'
                  ? 'Cachorro'
                  : String(item.species).toUpperCase() === 'CAT'
                    ? 'Gato'
                    : item.species}{' '}
                • {item.age} ano(s)
              </Text>
              {(item.city != null || formatDistanceKm(item.distanceKm) != null) && (
                <View style={styles.cardLocation}>
                  <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
                  <Text style={[styles.cardLocationText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {[item.city, formatDistanceKm(item.distanceKm)].filter(Boolean).join(' • ')}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      );
    },
    [colors, router, gridCellWidth]
  );

  if (isLoading && items.length === 0) {
    return (
      <ScreenContainer>
        <View style={styles.loadingWrap}>
          <LoadingLogo size={80} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Carregando pets...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={`grid-${numColumns}`}
        style={[styles.list, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.listContent,
          items.length === 0 && styles.listContentEmpty,
          { paddingHorizontal: GRID_PADDING },
        ]}
        columnWrapperStyle={styles.row}
        renderItem={renderItem}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          !isLoading && items.length === 0 ? (
            <View style={styles.emptyWrap}>
              <EmptyState
                title="Nenhum pet no momento"
                message="Não há pets com esse filtro na sua região. Tente alterar o raio na aba Mapa."
                icon={<Ionicons name="paw-outline" size={56} color={colors.textSecondary} />}
              />
            </View>
          ) : null
        }
        ListHeaderComponent={
          items.length > 0 ? (
            <Text style={[styles.countHint, { color: colors.textSecondary }]}>
              {items.length}
              {totalCount > 0 ? ` de ${totalCount} ` : ' '}
              pets
            </Text>
          ) : null
        }
        ListFooterComponent={
          isFetchingNextPage && items.length > 0 ? (
            <View style={styles.footer}>
              <LoadingLogo size={64} />
              <Text style={[styles.footerLoadingText, { color: colors.textSecondary }]}>
                Carregando mais...
              </Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isLoading}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}


const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: { fontSize: 15 },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  listContentEmpty: { flex: 1 },
  row: { gap: GRID_GAP, marginBottom: GRID_GAP },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardTouchable: { flex: 1 },
  cardImageWrap: { position: 'relative' },
  cardImage: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  dotsWrap: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: 'rgba(255,255,255,0.95)', width: 6, height: 6, borderRadius: 3 },
  badges: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerLogo: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  cardInfo: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
  cardInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
    minHeight: 20,
  },
  cardName: { fontSize: 14, fontWeight: '700', flex: 1 },
  partnerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  partnerChipText: { fontSize: 10, fontWeight: '600' },
  cardMeta: { fontSize: 12, marginTop: 2 },
  cardLocation: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  cardLocationText: { fontSize: 11 },
  countHint: {
    fontSize: 13,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  emptyWrap: { flex: 1, justifyContent: 'center', paddingVertical: spacing.xl },
  footer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  footerLoadingText: {
    fontSize: 14,
  },
});
