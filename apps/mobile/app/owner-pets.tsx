import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ListRenderItem, RefreshControl, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ScreenContainer, LoadingLogo, EmptyState, PageIntro, StatusBadge, VerifiedBadge } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { useListViewMode } from '../src/hooks/useListViewMode';
import { useAuthStore } from '../src/stores/authStore';
import { fetchFeed } from '../src/api/feed';
import { getFavorites } from '../src/api/favorites';
import { getSpeciesLabel } from '../src/utils/petLabels';
import { getMatchScoreColor } from '../src/utils/matchScoreColor';
import { spacing } from '../src/theme';
import { gridLayout } from '../src/theme/grid';
import type { Pet } from '@adopet/shared';

const { gap, padding: gridPadding, aspectRatio } = gridLayout;
const NUM_COLUMNS = 2;
const gridScreenPadding = spacing.sm;
const gridCellSafety = spacing.md;

const SPECIES_OPTIONS: { value: 'BOTH' | 'DOG' | 'CAT'; label: string }[] = [
  { value: 'BOTH', label: 'Ambos' },
  { value: 'DOG', label: 'Cachorros' },
  { value: 'CAT', label: 'Gatos' },
];

export default function OwnerPetsScreen() {
  const { ownerId, ownerName } = useLocalSearchParams<{ ownerId: string; ownerName?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { colors } = useTheme();
  const userId = useAuthStore((s) => s.user?.id);
  const [speciesFilter, setSpeciesFilter] = useState<'BOTH' | 'DOG' | 'CAT'>('BOTH');
  const { viewMode, setViewMode } = useListViewMode('ownerPetsViewMode', { persist: false });

  const gridContentWidth = screenWidth - insets.left - insets.right - 2 * gridScreenPadding;
  const gridCellWidth = gridContentWidth > 0 ? (gridContentWidth - gap - gridCellSafety) / NUM_COLUMNS : 0;
  const gridPaddingHorizontal = useMemo(
    () => ({ paddingHorizontal: gridScreenPadding + (insets.left + insets.right) / 2 }),
    [insets.left, insets.right],
  );

  const { data: favoritesData } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => getFavorites(),
    enabled: !!userId,
  });
  const favoritePetIds = useMemo(
    () => new Set((favoritesData?.items ?? []).map((f) => f.petId)),
    [favoritesData?.items],
  );

  const {
    data,
    isLoading,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['feed-by-owner', ownerId, speciesFilter],
    queryFn: ({ pageParam }) =>
      fetchFeed({ ownerId: ownerId!, cursor: pageParam, species: speciesFilter }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!ownerId,
  });

  const rawItems = data?.pages.flatMap((p) => p.items) ?? [];
  const items = useMemo(
    () =>
      [...rawItems].sort((a, b) => {
        const sa = a.matchScore ?? -1;
        const sb = b.matchScore ?? -1;
        return sb - sa;
      }),
    [rawItems],
  );
  const title = ownerName ? `Anúncios de ${ownerName}` : 'Anúncios do tutor';
  const subtitle = 'Anúncios disponíveis deste tutor.';

  const ViewModeToggle = () => (
    <View style={styles.viewModeRow}>
      <TouchableOpacity
        style={[styles.viewModeBtn, viewMode === 'list' && { backgroundColor: colors.primary }]}
        onPress={() => setViewMode('list')}
      >
        <Ionicons name="list" size={22} color={viewMode === 'list' ? '#fff' : colors.textSecondary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.viewModeBtn, viewMode === 'grid' && { backgroundColor: colors.primary }]}
        onPress={() => setViewMode('grid')}
      >
        <Ionicons name="grid-outline" size={22} color={viewMode === 'grid' ? '#fff' : colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  const renderItem: ListRenderItem<Pet> = ({ item }) => {
    const isInFavorites = !!userId && favoritePetIds.has(item.id);
    if (viewMode === 'grid') {
      return (
        <TouchableOpacity
          style={[styles.gridCard, { backgroundColor: colors.surface, width: gridCellWidth }]}
          onPress={() => router.push(`/(tabs)/pet/${item.id}`)}
          activeOpacity={0.7}
        >
          <View style={styles.gridImageWrap}>
              {item.photos?.[0] ? (
                <Image
                  source={{ uri: item.photos[0] }}
                  style={[styles.gridThumb, { width: gridCellWidth, height: gridCellWidth / aspectRatio }]}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.gridImagePlaceholder, { width: gridCellWidth, height: gridCellWidth / aspectRatio, backgroundColor: colors.background }]}>
                  <Text style={[styles.cardImagePlaceholderText, { color: colors.textSecondary }]}>Sem foto</Text>
                </View>
              )}
              {isInFavorites && (
                <View style={[styles.favoriteBadge, { backgroundColor: (colors.primary || '#6366f1') + 'e6' }]}>
                  <Ionicons name="heart" size={12} color="#fff" />
                  <Text style={styles.favoriteBadgeText}>Favorito</Text>
                </View>
              )}
            </View>
            <View style={styles.gridCardInfo}>
              <View style={styles.gridCardTitleRow}>
                <Text style={[styles.gridCardName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
                {item.verified && <VerifiedBadge size={14} iconBackgroundColor={colors.primary} />}
              </View>
              <Text style={[styles.gridCardMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                {getSpeciesLabel(item.species)} · {item.age} ano(s)
              </Text>
              <View style={styles.gridBadgesRow}>
                {item.matchScore != null && (
                  <View style={[styles.gridMatchBadge, { backgroundColor: getMatchScoreColor(item.matchScore) + 'e6' }]}>
                    <Ionicons name="speedometer-outline" size={10} color="#fff" />
                    <Text style={styles.gridMatchBadgeText}>{item.matchScore}%</Text>
                  </View>
                )}
                <StatusBadge label={item.vaccinated ? 'Vacinado' : 'Não vacinado'} variant={item.vaccinated ? 'success' : 'warning'} />
                {typeof item.neutered === 'boolean' && (
                  <StatusBadge label={item.neutered ? 'Castrado' : 'Não castrado'} variant={item.neutered ? 'success' : 'warning'} />
                )}
              </View>
            </View>
        </TouchableOpacity>
      );
    }
    return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <TouchableOpacity
        style={styles.cardTouchable}
        onPress={() => router.push(`/(tabs)/pet/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardImageWrap}>
          {item.photos?.[0] ? (
            <Image source={{ uri: item.photos[0] }} style={styles.cardImage} contentFit="cover" />
          ) : (
            <View style={[styles.cardImagePlaceholder, { backgroundColor: colors.background }]}>
              <Text style={[styles.cardImagePlaceholderText, { color: colors.textSecondary }]}>Sem foto</Text>
            </View>
          )}
          {isInFavorites && (
            <View style={[styles.favoriteBadge, { backgroundColor: (colors.primary || '#6366f1') + 'e6' }]}>
              <Ionicons name="heart" size={14} color="#fff" />
              <Text style={styles.favoriteBadgeText}>Nos favoritos</Text>
            </View>
          )}
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
            {item.verified && <VerifiedBadge size={16} iconBackgroundColor={colors.primary} />}
          </View>
          <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
            {getSpeciesLabel(item.species)} · {item.age} ano(s)
          </Text>
          {item.city ? (
            <Text style={[styles.cardCity, { color: colors.textSecondary }]} numberOfLines={1}>{item.city}</Text>
          ) : null}
          <View style={styles.badgesRow}>
            {item.matchScore != null && (
              <View style={[styles.matchBadge, { backgroundColor: getMatchScoreColor(item.matchScore) + '25' }]}>
                <Text style={[styles.matchBadgeText, { color: getMatchScoreColor(item.matchScore) }]}>{item.matchScore}% match</Text>
              </View>
            )}
            {(item as { partner?: { isPaidPartner?: boolean } }).partner != null && (
              <View style={[styles.partnerBadge, { backgroundColor: ((item as { partner?: { isPaidPartner?: boolean } }).partner?.isPaidPartner ? (colors.warning || '#d97706') : colors.primary) + '25' }]}>
                <Ionicons name={(item as { partner?: { isPaidPartner?: boolean } }).partner?.isPaidPartner ? 'star' : 'heart'} size={10} color={(item as { partner?: { isPaidPartner?: boolean } }).partner?.isPaidPartner ? (colors.warning || '#d97706') : colors.primary} />
                <Text style={[styles.partnerBadgeText, { color: (item as { partner?: { isPaidPartner?: boolean } }).partner?.isPaidPartner ? (colors.warning || '#d97706') : colors.primary }]} numberOfLines={1}>
                  {(item as { partner?: { isPaidPartner?: boolean } }).partner?.isPaidPartner ? 'Patrocinado' : 'Parceiro'}
                </Text>
              </View>
            )}
            <StatusBadge label={item.vaccinated ? 'Vacinado' : 'Não vacinado'} variant={item.vaccinated ? 'success' : 'warning'} />
            {typeof item.neutered === 'boolean' && (
              <StatusBadge label={item.neutered ? 'Castrado' : 'Não castrado'} variant={item.neutered ? 'success' : 'warning'} />
            )}
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.verAnuncioBtn, { backgroundColor: colors.primary }]}
        onPress={() => router.push(`/(tabs)/pet/${item.id}`)}
        activeOpacity={0.8}
      >
        <Ionicons name="open-outline" size={18} color="#fff" />
        <Text style={styles.verAnuncioBtnText}>Ver anúncio</Text>
      </TouchableOpacity>
    </View>
    );
  };

  if (!ownerId) {
    return (
      <ScreenContainer>
        <Text style={[styles.error, { color: colors.textSecondary }]}>Dono não informado.</Text>
      </ScreenContainer>
    );
  }

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={[styles.filtersWrap, { borderBottomColor: colors.surface }]}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }} />
            <ViewModeToggle />
          </View>
          <PageIntro title={title} subtitle={subtitle} />
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Espécie</Text>
          <View style={styles.chipRow}>
            {SPECIES_OPTIONS.map((opt) => (
              <TouchableOpacity key={opt.value} style={[styles.chip, { backgroundColor: colors.surface }]}>
                <Text style={[styles.chipText, { color: colors.textSecondary }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.loadingWrap}>
          <LoadingLogo size={160} />
        </View>
      </ScreenContainer>
    );
  }

  const listHeader = (
    <>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }} />
        <ViewModeToggle />
      </View>
      <PageIntro title={title} subtitle={subtitle} />
      <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Espécie</Text>
      <View style={styles.chipRow}>
        {SPECIES_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, { backgroundColor: speciesFilter === opt.value ? colors.primary : colors.surface }]}
            onPress={() => setSpeciesFilter(opt.value)}
          >
            <Text style={[styles.chipText, { color: speciesFilter === opt.value ? '#fff' : colors.textPrimary }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  return (
    <ScreenContainer>
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        numColumns={viewMode === 'grid' ? 2 : 1}
        columnWrapperStyle={viewMode === 'grid' ? styles.gridColumnWrapper : undefined}
        key={viewMode}
        contentContainerStyle={[
          styles.listContent,
          viewMode === 'grid' && styles.gridListContent,
          viewMode === 'grid' && gridPaddingHorizontal,
          items.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={
          <EmptyState
            title={speciesFilter !== 'BOTH' ? 'Nenhum anúncio com esse filtro' : 'Nenhum anúncio'}
            message={speciesFilter !== 'BOTH' ? 'Tente alterar o filtro de espécie.' : 'Este tutor não possui anúncios disponíveis no momento.'}
          />
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.3}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  filtersWrap: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  viewModeRow: {
    flexDirection: 'row',
    gap: 4,
  },
  viewModeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  chipText: { fontSize: 14, fontWeight: '500' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 160 },
  listContent: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xl,
  },
  gridList: {
    paddingHorizontal: gridPadding,
    paddingBottom: spacing.xl,
  },
  gridListContent: {
    paddingBottom: spacing.xl,
    paddingTop: spacing.xs,
    flexGrow: 1,
  },
  gridColumnWrapper: {
    gap,
    marginBottom: gap,
  },
  gridItemWrapper: {
    marginBottom: 0,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  gridCard: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  gridImageWrap: {
    position: 'relative',
  },
  gridThumb: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  gridImagePlaceholder: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCardInfo: {
    padding: spacing.sm,
  },
  gridCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  gridCardName: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  gridCardMeta: {
    fontSize: 12,
    marginBottom: 4,
  },
  gridBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
  },
  gridMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
  },
  gridMatchBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  cardTouchable: {
    flexDirection: 'row',
  },
  cardImageWrap: {
    width: 100,
    height: 100,
    position: 'relative',
  },
  favoriteBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  favoriteBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImagePlaceholderText: {
    fontSize: 12,
  },
  cardBody: {
    flex: 1,
    padding: spacing.sm,
    justifyContent: 'center',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  cardMeta: {
    fontSize: 13,
    marginBottom: 2,
  },
  cardCity: {
    fontSize: 12,
    marginBottom: 6,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  matchBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  matchBadgeText: { fontSize: 11, fontWeight: '700' },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  partnerBadgeText: { fontSize: 11, fontWeight: '600' },
  verAnuncioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: 10,
  },
  verAnuncioBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  error: {
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
