import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl, ActivityIndicator, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, EmptyState, LoadingLogo, StatusBadge, VerifiedBadge } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { getMinePets, type PetStatus } from '../../src/api/pets';
import { spacing } from '../../src/theme';

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

/** Status de moderação: exibido quando o anúncio está em análise */
const PUBLICATION_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Em análise',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
};
const PUBLICATION_STATUS_COLOR: Record<string, string> = {
  PENDING: '#D97706',
  APPROVED: '#0D9488',
  REJECTED: '#DC2626',
};

const SPECIES_OPTIONS: { value: 'BOTH' | 'DOG' | 'CAT'; label: string }[] = [
  { value: 'BOTH', label: 'Todos' },
  { value: 'DOG', label: 'Cachorros' },
  { value: 'CAT', label: 'Gatos' },
];

const STATUS_OPTIONS: { value: '' | PetStatus; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'AVAILABLE', label: 'Disponível' },
  { value: 'IN_PROCESS', label: 'Em processo' },
  { value: 'ADOPTED', label: 'Adotado' },
];

export default function MyPetsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [speciesFilter, setSpeciesFilter] = useState<'BOTH' | 'DOG' | 'CAT'>('BOTH');
  const [statusFilter, setStatusFilter] = useState<'' | PetStatus>('');

  const {
    data,
    isLoading,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['pets', 'mine', speciesFilter, statusFilter],
    queryFn: ({ pageParam }) =>
      getMinePets({
        cursor: pageParam,
        species: speciesFilter,
        status: statusFilter || undefined,
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    staleTime: 0,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );
  const pets = data?.pages.flatMap((p) => p.items) ?? [];

  if ((isLoading || isRefetching) && pets.length === 0) {
    return (
      <ScreenContainer>
        <View style={[styles.filtersWrap, { borderBottomColor: colors.surface }]}>
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Espécie</Text>
          <View style={styles.chipRow}>
            {SPECIES_OPTIONS.map((opt) => (
              <TouchableOpacity key={opt.value} style={[styles.chip, { backgroundColor: colors.surface }]}>
                <Text style={[styles.chipText, { color: colors.textSecondary }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Status</Text>
          <View style={styles.chipRow}>
            {STATUS_OPTIONS.map((opt) => (
              <TouchableOpacity key={opt.value || 'all'} style={[styles.chip, { backgroundColor: colors.surface }]}>
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

  const hasFilters = speciesFilter !== 'BOTH' || statusFilter !== '';
  const emptyTitle = pets.length === 0 && hasFilters
    ? 'Nenhum anúncio com esses filtros'
    : 'Nenhum anúncio ainda';
  const emptyMessage = pets.length === 0 && hasFilters
    ? 'Tente alterar os filtros ou anuncie um pet.'
    : 'Anuncie um pet para encontrar um novo lar para ele.';

  if (pets.length === 0 && !isFetchingNextPage) {
    return (
      <ScreenContainer>
        <View style={[styles.filtersWrap, { borderBottomColor: colors.surface }]}>
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
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {STATUS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value || 'all'}
                style={[
                  styles.chip,
                  { backgroundColor: statusFilter === opt.value ? colors.primary : colors.surface },
                ]}
                onPress={() => setStatusFilter(opt.value)}
              >
                <Text style={[styles.chipText, { color: statusFilter === opt.value ? '#fff' : colors.textPrimary }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <EmptyState
          title={emptyTitle}
          message={emptyMessage}
          icon={<Ionicons name="paw-outline" size={56} color={colors.textSecondary} />}
        />
        {!hasFilters && (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.replace('/(tabs)/add-pet')}
          >
            <Text style={styles.addBtnText}>Anunciar pet</Text>
          </TouchableOpacity>
        )}
      </ScreenContainer>
    );
  }

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  return (
    <ScreenContainer scroll={false}>
      <View style={[styles.filtersWrap, { borderBottomColor: colors.surface }]}>
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
        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {STATUS_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value || 'all'}
              style={[
                styles.chip,
                { backgroundColor: statusFilter === opt.value ? colors.primary : colors.surface },
              ]}
              onPress={() => setStatusFilter(opt.value)}
            >
              <Text style={[styles.chipText, { color: statusFilter === opt.value ? '#fff' : colors.textPrimary }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={pets}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
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
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.surface }]}
            onPress={() => router.push(`/pet-edit/${item.id}`)}
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
                {item.species === 'dog' ? 'Cachorro' : 'Gato'} • {item.age} anos
              </Text>
              <View style={styles.badgesRow}>
                {item.partner && (
                  <View style={[styles.partnerBadge, { backgroundColor: (item.partner as { isPaidPartner?: boolean }).isPaidPartner ? (colors.warning || '#d97706') + '30' : (colors.primary + '25') }]}>
                    <Ionicons name={(item.partner as { isPaidPartner?: boolean }).isPaidPartner ? 'star' : 'heart'} size={10} color={(item.partner as { isPaidPartner?: boolean }).isPaidPartner ? (colors.warning || '#d97706') : colors.primary} />
                    <Text style={[styles.partnerBadgeText, { color: (item.partner as { isPaidPartner?: boolean }).isPaidPartner ? (colors.warning || '#d97706') : colors.primary }]}>
                      {(item.partner as { isPaidPartner?: boolean }).isPaidPartner ? 'Patrocinado' : 'Parceiro'}
                    </Text>
                  </View>
                )}
                <StatusBadge label={item.vaccinated ? 'Vacinado' : 'Não vacinado'} variant={item.vaccinated ? 'success' : 'warning'} />
                {typeof item.neutered === 'boolean' && (
                  <StatusBadge label={item.neutered ? 'Castrado' : 'Não castrado'} variant={item.neutered ? 'success' : 'warning'} />
                )}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: (item.publicationStatus === 'PENDING' ? PUBLICATION_STATUS_COLOR.PENDING : STATUS_COLOR[item.status as string] ?? colors.background) + '25' }]}>
                <View style={[styles.statusDot, { backgroundColor: item.publicationStatus === 'PENDING' ? PUBLICATION_STATUS_COLOR.PENDING : STATUS_COLOR[item.status as string] ?? colors.textSecondary }]} />
                <Text style={[styles.statusText, { color: item.publicationStatus === 'PENDING' ? PUBLICATION_STATUS_COLOR.PENDING : STATUS_COLOR[item.status as string] ?? colors.textSecondary }]}>
                  {item.publicationStatus === 'PENDING'
                    ? PUBLICATION_STATUS_LABEL.PENDING
                    : (STATUS_LABEL[item.status as string] ?? item.status)}
                </Text>
              </View>
              {item.status === 'ADOPTED' && item.adoptedAt ? (
                <View style={[styles.adminBadge, { backgroundColor: '#0D9488' + '25', marginTop: 6 }]}>
                  <Text style={[styles.adminBadgeText, { color: '#0D9488' }]}>Confirmado pelo Adopet</Text>
                </View>
              ) : null}
              {item.adoptionRejectedAt ? (
                <View style={[styles.adminBadge, { backgroundColor: (colors.error || '#DC2626') + '25', marginTop: 6 }]}>
                  <Text style={[styles.adminBadgeText, { color: colors.error || '#DC2626' }]}>Não Confirmado pelo Adopet</Text>
                </View>
              ) : null}
              {item.status === 'ADOPTED' && item.adoptedAt ? (
                <Text style={[styles.cardMeta, { color: colors.textSecondary, marginTop: 2 }]}>
                  Adotado em {new Date(item.adoptedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  {item.adopterUsername ? ` • @${item.adopterUsername}` : ''}
                </Text>
              ) : null}
            </View>
            <Text style={[styles.arrow, { color: colors.textSecondary }]}>›</Text>
          </TouchableOpacity>
        )}
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
  list: { padding: spacing.lg, paddingBottom: spacing.xl },
  footerLoader: { padding: spacing.md, alignItems: 'center' },
  skeletonWrap: { padding: spacing.lg, paddingTop: spacing.xl },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 160 },
  addBtn: { marginHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.xl, padding: spacing.md, borderRadius: 10, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '600' },
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
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  partnerBadgeText: { fontSize: 10, fontWeight: '600' },
  statusBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },
  adminBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  adminBadgeText: { fontSize: 11, fontWeight: '600' },
  arrow: { fontSize: 24 },
});
