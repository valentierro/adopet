import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, EmptyState, LoadingLogo, StatusBadge, VerifiedBadge } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useListViewMode } from '../../src/hooks/useListViewMode';
import { getMyAdoptions, type MyAdoptionItem } from '../../src/api/me';
import { spacing } from '../../src/theme';
import { gridLayout } from '../../src/theme/grid';

const { cellWidth, gap, padding: gridPadding, aspectRatio } = gridLayout;
const GRID_ITEM_MARGIN = gap / 2;

const SPECIES_OPTIONS: { value: 'BOTH' | 'DOG' | 'CAT'; label: string }[] = [
  { value: 'BOTH', label: 'Todos' },
  { value: 'DOG', label: 'Cachorros' },
  { value: 'CAT', label: 'Gatos' },
];

export default function MyAdoptionsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [speciesFilter, setSpeciesFilter] = useState<'BOTH' | 'DOG' | 'CAT'>('BOTH');
  const { viewMode, setViewMode } = useListViewMode('myAdoptionsViewMode', { persist: false });

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['me', 'adoptions', speciesFilter],
    queryFn: () => getMyAdoptions({ species: speciesFilter }),
    staleTime: 0,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const items: MyAdoptionItem[] = data?.items ?? [];
  const hasFilters = speciesFilter !== 'BOTH';

  if (isLoading && items.length === 0) {
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
        </View>
        <View style={styles.loadingWrap}>
          <LoadingLogo size={160} />
        </View>
      </ScreenContainer>
    );
  }

  const emptyTitle = items.length === 0
    ? (hasFilters ? 'Nenhuma adoção com esse filtro' : 'Nenhuma adoção')
    : '';
  const emptyMessage = items.length === 0
    ? (hasFilters ? 'Tente alterar o filtro de espécie.' : 'Os pets que você adotar por aqui aparecerão nesta lista.')
    : '';

  if (items.length === 0) {
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
        </View>
        <EmptyState
          title={emptyTitle}
          message={emptyMessage}
          icon={<Ionicons name="heart-circle-outline" size={56} color={colors.textSecondary} />}
        />
      </ScreenContainer>
    );
  }

  const adoptedDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <ScreenContainer scroll={false}>
      <View style={[styles.filtersWrap, { borderBottomColor: colors.surface }]}>
        <View style={styles.filterHeaderRow}>
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Espécie</Text>
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
        </View>
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
        data={items}
        keyExtractor={(item) => item.adoptionId}
        key={viewMode}
        numColumns={viewMode === 'grid' ? 2 : 1}
        estimatedItemSize={viewMode === 'grid' ? 220 : 100}
        contentContainerStyle={[styles.list, viewMode === 'grid' && styles.gridList]}
        onRefresh={() => refetch()}
        refreshing={isRefetching}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
        }
        renderItem={({ item }) =>
          viewMode === 'grid' ? (
            <TouchableOpacity
              style={[styles.gridCard, { backgroundColor: colors.surface, marginHorizontal: GRID_ITEM_MARGIN, marginBottom: gap }]}
              onPress={() => router.push(`/pet/${item.petId}`)}
              activeOpacity={0.7}
            >
              <Image
                source={{ uri: item.photos?.[0] ?? 'https://placehold.co/80?text=Pet' }}
                style={[styles.gridThumb, { width: cellWidth, height: cellWidth / aspectRatio }]}
                contentFit="cover"
              />
              <View style={styles.gridCardInfo}>
                <View style={styles.gridCardTitleRow}>
                  <Text style={[styles.gridCardName, { color: colors.textPrimary }]} numberOfLines={1}>{item.petName}</Text>
                  {item.verified && <VerifiedBadge size={14} iconBackgroundColor={colors.primary} />}
                </View>
                <View style={styles.gridBadgesRow}>
                  {item.partner != null && (
                    <View style={[styles.gridPartnerBadge, { backgroundColor: item.partner?.isPaidPartner ? (colors.warning || '#d97706') + '30' : (colors.primary + '25') }]}>
                      <Ionicons name={item.partner?.isPaidPartner ? 'star' : 'heart'} size={9} color={item.partner?.isPaidPartner ? (colors.warning || '#d97706') : colors.primary} />
                      <Text style={[styles.gridPartnerBadgeText, { color: item.partner?.isPaidPartner ? (colors.warning || '#d97706') : colors.primary }]} numberOfLines={1}>
                        {item.partner?.isPaidPartner ? 'Patrocinado' : 'Parceiro'}
                      </Text>
                    </View>
                  )}
                  {item.vaccinated !== undefined && (
                    <StatusBadge label={item.vaccinated ? 'Vacinado' : 'Não vacinado'} variant={item.vaccinated ? 'success' : 'warning'} />
                  )}
                  {typeof item.neutered === 'boolean' && (
                    <StatusBadge label={item.neutered ? 'Castrado' : 'Não castrado'} variant={item.neutered ? 'success' : 'warning'} />
                  )}
                  {item.adoptionRejectedAt ? (
                    <View style={[styles.gridStatusBadge, { backgroundColor: (colors.error || '#DC2626') + '25' }]}>
                      <Text style={[styles.gridStatusText, { color: colors.error || '#DC2626' }]} numberOfLines={1}>Rejeitado</Text>
                    </View>
                  ) : item.confirmedByAdopet ? (
                    <View style={[styles.gridStatusBadge, { backgroundColor: '#0D9488' + '25' }]}>
                      <Text style={[styles.gridStatusText, { color: '#0D9488' }]} numberOfLines={1}>Confirmado</Text>
                    </View>
                  ) : (
                    <View style={[styles.gridStatusBadge, { backgroundColor: (colors.textSecondary || '#78716c') + '20' }]}>
                      <Text style={[styles.gridStatusText, { color: colors.textSecondary || '#78716c' }]} numberOfLines={1}>Aguardando</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.gridCardMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                  Ex-tutor: {item.tutorName}
                </Text>
                <Text style={[styles.gridAdoptedAt, { color: colors.primary }]}>
                  {adoptedDate(item.adoptedAt)}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.surface }]}
              onPress={() => router.push(`/pet/${item.petId}`)}
              activeOpacity={0.7}
            >
              <Image
                source={{ uri: item.photos?.[0] ?? 'https://placehold.co/80?text=Pet' }}
                style={styles.thumb}
              />
              <View style={styles.cardBody}>
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>{item.petName}</Text>
                  {item.verified && <VerifiedBadge size={16} iconBackgroundColor={colors.primary} />}
                </View>
                <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                  {item.species === 'dog' ? 'Cachorro' : 'Gato'}
                </Text>
                <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                  Ex-tutor: {item.tutorName}
                </Text>
                {(item.partner != null || item.vaccinated !== undefined || typeof item.neutered === 'boolean') && (
                  <View style={styles.badgesRow}>
                    {item.partner != null && (
                      <View style={[styles.partnerBadge, { backgroundColor: item.partner?.isPaidPartner ? (colors.warning || '#d97706') + '30' : (colors.primary + '25') }]}>
                        <Ionicons name={item.partner?.isPaidPartner ? 'star' : 'heart'} size={10} color={item.partner?.isPaidPartner ? (colors.warning || '#d97706') : colors.primary} />
                        <Text style={[styles.partnerBadgeText, { color: item.partner?.isPaidPartner ? (colors.warning || '#d97706') : colors.primary }]}>
                          {item.partner?.isPaidPartner ? 'Patrocinado' : 'Parceiro'}
                        </Text>
                      </View>
                    )}
                    {item.vaccinated !== undefined && (
                      <StatusBadge label={item.vaccinated ? 'Vacinado' : 'Não vacinado'} variant={item.vaccinated ? 'success' : 'warning'} />
                    )}
                    {typeof item.neutered === 'boolean' && (
                      <StatusBadge label={item.neutered ? 'Castrado' : 'Não castrado'} variant={item.neutered ? 'success' : 'warning'} />
                    )}
                  </View>
                )}
                {item.adoptionRejectedAt ? (
                  <View style={[styles.badge, { backgroundColor: (colors.error || '#DC2626') + '25', marginTop: 8 }]}>
                    <Text style={[styles.badgeText, { color: colors.error || '#DC2626' }]}>Rejeitado pelo Adopet</Text>
                  </View>
                ) : item.confirmedByAdopet ? (
                  <View style={[styles.badge, { backgroundColor: '#0D9488' + '25', marginTop: 8 }]}>
                    <Text style={[styles.badgeText, { color: '#0D9488' }]}>Confirmado pelo Adopet</Text>
                  </View>
                ) : (
                  <View style={[styles.badge, { backgroundColor: (colors.textSecondary || '#78716c') + '20', marginTop: 8 }]}>
                    <Text style={[styles.badgeText, { color: colors.textSecondary || '#78716c' }]}>Aguardando confirmação Adopet</Text>
                  </View>
                )}
                <Text style={[styles.adoptedAt, { color: colors.primary }]}>
                  Adotado em {adoptedDate(item.adoptedAt)}
                </Text>
              </View>
              <Text style={[styles.arrow, { color: colors.textSecondary }]}>›</Text>
            </TouchableOpacity>
          )
        }
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
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 160 },
  list: { padding: spacing.lg, paddingBottom: spacing.xl },
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
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  adoptedAt: { fontSize: 13, marginTop: 4, fontWeight: '600' },
  arrow: { fontSize: 24 },
  filterHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  viewModeRow: { flexDirection: 'row', gap: 4 },
  viewModeBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  gridList: { paddingHorizontal: gridPadding, gap },
  gridRow: { gap, marginBottom: gap },
  gridCard: { width: cellWidth, borderRadius: 12, overflow: 'hidden' },
  gridThumb: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  gridCardInfo: { padding: spacing.sm },
  gridCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gridCardName: { fontSize: 14, fontWeight: '700', flex: 1 },
  gridBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  gridPartnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  gridPartnerBadgeText: { fontSize: 9, fontWeight: '600' },
  gridStatusBadge: { paddingHorizontal: 4, paddingVertical: 2, borderRadius: 6 },
  gridStatusText: { fontSize: 9, fontWeight: '600' },
  gridCardMeta: { fontSize: 12, marginTop: 2 },
  gridAdoptedAt: { fontSize: 12, marginTop: 4, fontWeight: '600' },
});
