import { useState, useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, EmptyState, LoadingLogo, PageIntro, StatusBadge, VerifiedBadge } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { useListViewMode } from '../src/hooks/useListViewMode';
import { getPartnerPets, type PartnerPetsPage } from '../src/api/partners';
import { getSpeciesLabel } from '../src/utils/petLabels';
import { getMatchScoreColor } from '../src/utils/matchScoreColor';
import { spacing } from '../src/theme';
import { gridLayout } from '../src/theme/grid';

const { cellWidth, gap, padding: gridPadding, aspectRatio } = gridLayout;

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: 'Disponível',
  IN_PROCESS: 'Em processo',
  ADOPTED: 'Adotado',
};

const STATUS_COLOR: Record<string, string> = {
  AVAILABLE: '#0D9488',
  IN_PROCESS: '#D97706',
  ADOPTED: '#57534E',
};

const SPECIES_OPTIONS: { value: 'BOTH' | 'DOG' | 'CAT'; label: string }[] = [
  { value: 'BOTH', label: 'Todos' },
  { value: 'DOG', label: 'Cachorros' },
  { value: 'CAT', label: 'Gatos' },
];

const formatPublicationDate = (dateStr: string | undefined) =>
  dateStr ? new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null;

type PetItem = PartnerPetsPage['items'][number];

export default function PartnerPetsScreen() {
  const router = useRouter();
  const { id: partnerId, partnerName } = useLocalSearchParams<{ id: string; partnerName?: string }>();
  const { colors } = useTheme();
  const [speciesFilter, setSpeciesFilter] = useState<'BOTH' | 'DOG' | 'CAT'>('BOTH');
  const { viewMode, setViewMode } = useListViewMode('partnerPetsViewMode', { persist: false });

  const {
    data,
    isLoading,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['partners', partnerId, 'pets', speciesFilter],
    queryFn: ({ pageParam }) =>
      getPartnerPets(partnerId!, {
        cursor: pageParam,
        species: speciesFilter,
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!partnerId,
  });

  useFocusEffect(
    useCallback(() => {
      if (partnerId) refetch();
    }, [partnerId, refetch]),
  );

  const allPets = data?.pages.flatMap((p) => p.items) ?? [];
  const statusOrder: Record<string, number> = { AVAILABLE: 0, IN_PROCESS: 1, ADOPTED: 2 };
  const pets = allPets
    .slice()
    .sort((a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99));

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

  if (!partnerId) {
    return (
      <ScreenContainer>
        <EmptyState
          title="Parceiro não informado"
          message="Volte e abra os anúncios a partir da página do parceiro."
          icon={<Ionicons name="paw-outline" size={56} color={colors.textSecondary} />}
        />
      </ScreenContainer>
    );
  }

  if (isLoading && allPets.length === 0) {
    return (
      <ScreenContainer>
        <View style={[styles.filtersWrap, { borderBottomColor: colors.surface }]}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }} />
            <ViewModeToggle />
          </View>
          <PageIntro
            title="Anúncios vinculados"
            subtitle={partnerName ? `Pets anunciados com ${partnerName}` : 'Pets anunciados por este parceiro.'}
          />
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

  const emptyTitle = 'Nenhum anúncio vinculado';
  const emptyMessage = speciesFilter !== 'BOTH'
    ? 'Não há anúncios com esse filtro para este parceiro.'
    : 'Este parceiro ainda não tem anúncios vinculados.';

  if (pets.length === 0 && !isFetchingNextPage) {
    return (
      <ScreenContainer>
        <View style={[styles.filtersWrap, { borderBottomColor: colors.surface }]}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }} />
            <ViewModeToggle />
          </View>
          <PageIntro
            title="Anúncios vinculados"
            subtitle={partnerName ? `Pets anunciados com ${partnerName}` : 'Pets anunciados por este parceiro.'}
          />
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Espécie</Text>
          <View style={styles.chipRow}>
            {SPECIES_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.chip,
                  { backgroundColor: speciesFilter === opt.value ? colors.primary : colors.surface },
                ]}
                onPress={() => setSpeciesFilter(opt.value)}
              >
                <Text style={[styles.chipText, { color: speciesFilter === opt.value ? '#fff' : colors.textPrimary }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <EmptyState
          title={emptyTitle}
          message={emptyMessage}
          icon={<Ionicons name="paw-outline" size={56} color={colors.textSecondary} />}
        />
      </ScreenContainer>
    );
  }

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  const renderItem = ({ item }: { item: PetItem }) => {
    if (viewMode === 'grid') {
      return (
        <TouchableOpacity
          style={[styles.gridCard, { backgroundColor: colors.surface, marginHorizontal: gap / 2, marginBottom: gap }]}
          onPress={() => router.push(`/pet/${item.id}`)}
          activeOpacity={0.7}
        >
          <Image
            source={{ uri: item.photos?.[0] ?? 'https://placehold.co/80?text=Pet' }}
            style={[styles.gridThumb, { width: cellWidth, height: cellWidth / aspectRatio }]}
            contentFit="cover"
          />
          <View style={styles.gridCardInfo}>
            <View style={styles.gridCardTitleRow}>
              <Text style={[styles.gridCardName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
              {item.verified && <VerifiedBadge size={14} iconBackgroundColor={colors.primary} />}
            </View>
            <View style={styles.gridBadgesRow}>
              {typeof item.matchScore === 'number' && (
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
            <View style={[styles.gridStatusBadge, { backgroundColor: (STATUS_COLOR[item.status] ?? colors.background) + '25' }]}>
              <Text style={[styles.gridStatusText, { color: STATUS_COLOR[item.status] ?? colors.textSecondary }]} numberOfLines={1}>
                {STATUS_LABEL[item.status] ?? item.status}
              </Text>
            </View>
            {formatPublicationDate(item.createdAt) ? (
              <Text style={[styles.gridCardMeta, { color: colors.textSecondary }]}>
                Publicado em {formatPublicationDate(item.createdAt)}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface }]}
        onPress={() => router.push(`/pet/${item.id}`)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.photos?.[0] ?? 'https://placehold.co/80?text=Pet' }}
          style={styles.thumb}
        />
        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
            {item.verified && <VerifiedBadge size={16} iconBackgroundColor={colors.primary} />}
          </View>
          <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
            {getSpeciesLabel(item.species)} • {item.age} anos
          </Text>
          {formatPublicationDate(item.createdAt) ? (
            <Text style={[styles.cardMeta, { color: colors.textSecondary, marginTop: 0 }]}>
              Publicado em {formatPublicationDate(item.createdAt)}
            </Text>
          ) : null}
          <View style={styles.badgesRow}>
            {typeof item.matchScore === 'number' && (
              <View style={[styles.listMatchBadge, { backgroundColor: getMatchScoreColor(item.matchScore) + 'e6' }]}>
                <Ionicons name="speedometer-outline" size={12} color="#fff" />
                <Text style={styles.listMatchBadgeText}>{item.matchScore}%</Text>
              </View>
            )}
            <StatusBadge label={item.vaccinated ? 'Vacinado' : 'Não vacinado'} variant={item.vaccinated ? 'success' : 'warning'} />
            {typeof item.neutered === 'boolean' && (
              <StatusBadge label={item.neutered ? 'Castrado' : 'Não castrado'} variant={item.neutered ? 'success' : 'warning'} />
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[item.status] ?? colors.background) + '25' }]}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[item.status] ?? colors.textSecondary }]} />
            <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] ?? colors.textSecondary }]}>
              {STATUS_LABEL[item.status] ?? item.status}
            </Text>
          </View>
        </View>
        <Text style={[styles.arrow, { color: colors.textSecondary }]}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer scroll={false}>
      <View style={[styles.filtersWrap, { borderBottomColor: colors.surface }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }} />
          <ViewModeToggle />
        </View>
        <PageIntro
          title="Anúncios vinculados"
          subtitle={partnerName ? `Pets anunciados com ${partnerName}` : 'Pets anunciados por este parceiro.'}
        />
        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Espécie</Text>
        <View style={styles.chipRow}>
          {SPECIES_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.chip,
                { backgroundColor: speciesFilter === opt.value ? colors.primary : colors.surface },
              ]}
              onPress={() => setSpeciesFilter(opt.value)}
            >
              <Text style={[styles.chipText, { color: speciesFilter === opt.value ? '#fff' : colors.textPrimary }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <FlashList
        data={pets}
        keyExtractor={(p) => p.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        estimatedItemSize={viewMode === 'grid' ? 220 : 100}
        contentContainerStyle={[styles.list, viewMode === 'grid' && styles.gridList]}
        key={viewMode}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        renderItem={renderItem}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  filtersWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  viewModeRow: { flexDirection: 'row', gap: 4 },
  viewModeBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  chipRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20 },
  chipText: { fontSize: 14, fontWeight: '500' },
  list: { padding: spacing.lg, paddingBottom: spacing.xl },
  gridList: { paddingHorizontal: gridPadding, gap },
  footerLoader: { padding: spacing.md, alignItems: 'center' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 160 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  thumb: { width: 56, height: 56, borderRadius: 8 },
  cardBody: { flex: 1, marginLeft: spacing.md, minWidth: 0 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardName: { fontSize: 16, fontWeight: '600', flex: 1 },
  cardMeta: { fontSize: 13, marginTop: 2 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  listMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },
  listMatchBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  statusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },
  arrow: { fontSize: 24 },
  gridCard: { borderRadius: 12, overflow: 'hidden' },
  gridThumb: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  gridCardInfo: { padding: spacing.sm },
  gridCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gridCardName: { fontSize: 14, fontWeight: '700', flex: 1 },
  gridCardMeta: { fontSize: 11, marginTop: 2 },
  gridBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  gridMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
  },
  gridMatchBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  gridStatusBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  gridStatusText: { fontSize: 11, fontWeight: '600' },
});
