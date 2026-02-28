import { useCallback, useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, RefreshControl, Modal, Pressable, useWindowDimensions, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, EmptyState, LoadingLogo, PageIntro, VerifiedBadge, StatusBadge, MatchScoreBadge, Toast } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/authStore';
import { useListViewMode } from '../../src/hooks/useListViewMode';
import { getPassedPets, undoPass } from '../../src/api/swipes';
import { addFavorite } from '../../src/api/favorites';
import { getMatchScore } from '../../src/api/pets';
import { getFriendlyErrorMessage } from '../../src/utils/errorMessage';
import { getMatchScoreColor } from '../../src/utils/matchScoreColor';
import { getSpeciesLabel, getSizeLabel } from '../../src/utils/petLabels';
import { spacing } from '../../src/theme';
import { gridLayout } from '../../src/theme/grid';
import { Ionicons } from '@expo/vector-icons';

const { gap, padding: gridPadding, aspectRatio } = gridLayout;
const NUM_COLUMNS = 2;
const gridScreenPadding = spacing.sm;
const gridCellSafety = spacing.md;

const SPECIES_OPTIONS: { value: 'BOTH' | 'DOG' | 'CAT'; label: string }[] = [
  { value: 'BOTH', label: 'Todos' },
  { value: 'DOG', label: 'Cachorros' },
  { value: 'CAT', label: 'Gatos' },
];

export default function PassedPetsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { colors } = useTheme();
  const userId = useAuthStore((s) => s.user?.id);
  const [nameSearch, setNameSearch] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState<'BOTH' | 'DOG' | 'CAT'>('BOTH');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [matchModalPetId, setMatchModalPetId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { viewMode, setViewMode } = useListViewMode('passedPetsViewMode', { persist: false });

  const gridContentWidth = screenWidth - insets.left - insets.right - 2 * gridScreenPadding;
  const gridCellWidth = gridContentWidth > 0 ? (gridContentWidth - gap - gridCellSafety) / NUM_COLUMNS : 0;
  const gridPaddingHorizontal = useMemo(
    () => ({ paddingHorizontal: gridScreenPadding + (insets.left + insets.right) / 2 }),
    [insets.left, insets.right],
  );
  const { data: matchScoreData, isFetched: matchScoreFetched } = useQuery({
    queryKey: ['match-score', matchModalPetId, userId],
    queryFn: () => getMatchScore(matchModalPetId!, userId!),
    enabled: !!matchModalPetId && !!userId,
  });
  useEffect(() => {
    if (matchModalPetId && matchScoreFetched && matchScoreData && (matchScoreData.score == null || matchScoreData.criteriaCount === 0)) {
      setMatchModalPetId(null);
    }
  }, [matchModalPetId, matchScoreFetched, matchScoreData]);
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['swipes', 'passed'],
    queryFn: getPassedPets,
    staleTime: 0,
  });
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const undoMutation = useMutation({
    mutationFn: undoPass,
    onSuccess: () => {
      setToastMessage('Pet movido de volta ao feed!');
      queryClient.invalidateQueries({ queryKey: ['swipes', 'passed'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível desfazer.'));
    },
  });

  const addToFavoritesMutation = useMutation({
    mutationFn: async (petId: string) => {
      await addFavorite(petId);
      await undoPass(petId);
    },
    onSuccess: () => {
      setToastMessage('Adicionado aos favoritos!');
      queryClient.invalidateQueries({ queryKey: ['swipes', 'passed'] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível adicionar aos favoritos.'));
    },
  });

  const allItems = data?.items ?? [];
  const nameQuery = nameSearch.trim().toLowerCase();
  const items = useMemo(() => {
    const bySpecies =
      speciesFilter === 'BOTH'
        ? allItems
        : allItems.filter((p) => String(p.species ?? '').toUpperCase() === speciesFilter);
    const byName = nameQuery ? bySpecies.filter((p) => (p.name || '').toLowerCase().includes(nameQuery)) : bySpecies;
    return [...byName].sort((a, b) => {
      const scoreA = typeof a.matchScore === 'number' ? a.matchScore : -1;
      const scoreB = typeof b.matchScore === 'number' ? b.matchScore : -1;
      return scoreB - scoreA;
    });
  }, [allItems, speciesFilter, nameQuery]);

  if (isLoading && allItems.length === 0) {
    return (
      <ScreenContainer>
        <View style={styles.loadingWrap}>
          <LoadingLogo size={160} />
        </View>
      </ScreenContainer>
    );
  }

  if (allItems.length === 0) {
    return (
      <ScreenContainer>
        <PageIntro title="Pets que passou" subtitle="Reveja os pets que você passou no feed." />
        <EmptyState
          title="Nenhum pet passado"
          message="Quando você passar em um pet no feed, ele aparecerá aqui para você reconsiderar."
          icon={<Ionicons name="arrow-undo-outline" size={48} color={colors.textSecondary} />}
        />
      </ScreenContainer>
    );
  }

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

  const listHeader = (
    <View style={[styles.filtersWrap, { borderBottomColor: colors.surface }]}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }} />
        <ViewModeToggle />
      </View>
      <PageIntro title="Pets que passou" subtitle="Reveja os pets que você passou no feed." />
      <TouchableOpacity
        style={[styles.collapsibleHeader, { backgroundColor: colors.surface }]}
        onPress={() => setFiltersExpanded((e) => !e)}
        activeOpacity={0.7}
      >
        <Text style={[styles.collapsibleHeaderText, { color: colors.textPrimary }]}>Busca e filtros</Text>
        <Ionicons name={filtersExpanded ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textSecondary} />
      </TouchableOpacity>
      {filtersExpanded && (
        <>
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
          <View style={[styles.motivoBox, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
            <Ionicons name="heart" size={18} color={colors.primary} style={styles.motivoIcon} />
            <Text style={[styles.motivoText, { color: colors.textPrimary }]}>
              Às vezes o amor está na segunda olhada. Vale a pena rever com carinho.
            </Text>
          </View>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Toque em "Mover para o feed" para o pet voltar ao feed, ou em "Adicionar aos favoritos" para curtir e remover da lista.
          </Text>
          <View style={[styles.searchWrap, { borderBottomColor: colors.surface }]}>
            <View style={[styles.searchRow, { backgroundColor: colors.surface }]}>
              <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary, backgroundColor: colors.surface }]}
                placeholder="Buscar por nome do pet"
                placeholderTextColor={colors.textSecondary}
                value={nameSearch}
                onChangeText={setNameSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {nameSearch.length > 0 && (
                <TouchableOpacity
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => setNameSearch('')}
                  style={styles.searchClear}
                >
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </>
      )}
    </View>
  );

  return (
    <ScreenContainer scroll={false}>
      {items.length === 0 ? (
        <>
          {listHeader}
          <EmptyState
            title={speciesFilter !== 'BOTH' ? 'Nenhum pet com esse filtro' : nameQuery ? 'Nenhum pet com esse nome' : 'Nenhum pet passado'}
            message={speciesFilter !== 'BOTH' ? 'Tente alterar o filtro de espécie.' : nameQuery ? 'Tente outro nome ou limpe a busca.' : 'Quando você passar em um pet no feed, ele aparecerá aqui.'}
            icon={<Ionicons name="search-outline" size={48} color={colors.textSecondary} />}
          />
        </>
      ) : viewMode === 'grid' ? (
        <>
          {listHeader}
          <FlatList
            data={items}
            keyExtractor={(p) => p.id}
            numColumns={NUM_COLUMNS}
            key="grid"
            style={styles.gridList}
            contentContainerStyle={[styles.gridListContent, gridPaddingHorizontal]}
            columnWrapperStyle={styles.gridRow}
            refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
          }
          renderItem={({ item: pet }) => (
            <TouchableOpacity
              style={[styles.gridCard, { backgroundColor: colors.surface, width: gridCellWidth }]}
              onPress={() => router.push({ pathname: `/pet/${pet.id}`, params: { from: 'passed-pets' } })}
              activeOpacity={0.85}
            >
              <Image
                source={{ uri: pet.photos?.[0] ?? 'https://placehold.co/80?text=Pet' }}
                style={[styles.gridThumb, { width: gridCellWidth, height: gridCellWidth / aspectRatio }]}
                contentFit="cover"
              />
              <View style={styles.gridCardInfo}>
                  <View style={styles.gridCardTitleRow}>
                    <Text style={[styles.gridCardName, { color: colors.textPrimary }]} numberOfLines={1}>{pet.name}</Text>
                    {pet.verified && <VerifiedBadge size={14} iconBackgroundColor={colors.primary} />}
                  </View>
                  <View style={styles.gridBadgesRow}>
                    {typeof pet.matchScore === 'number' && (
                      <TouchableOpacity
                        style={[styles.gridMatchBadge, { backgroundColor: getMatchScoreColor(pet.matchScore) + 'e6' }]}
                        onPress={(e) => { e?.stopPropagation?.(); setMatchModalPetId(pet.id); }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="speedometer-outline" size={10} color="#fff" />
                        <Text style={styles.gridMatchBadgeText}>{pet.matchScore}%</Text>
                        <Ionicons name="chevron-down" size={10} color="#fff" style={styles.gridMatchBadgeChevron} />
                      </TouchableOpacity>
                    )}
                    {pet.partner && (
                      <View style={[styles.gridPartnerBadge, { backgroundColor: (pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? (colors.warning || '#d97706') + '30' : (colors.primary + '25') }]}>
                        <Ionicons name={(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? 'star' : 'heart'} size={9} color={(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? (colors.warning || '#d97706') : colors.primary} />
                        <Text style={[styles.gridPartnerBadgeText, { color: (pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? (colors.warning || '#d97706') : colors.primary }]} numberOfLines={1}>
                          {(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? 'Patrocinado' : 'Parceiro'}
                        </Text>
                      </View>
                    )}
                    <StatusBadge label={pet.vaccinated ? 'Vacinado' : 'Não vacinado'} variant={pet.vaccinated ? 'success' : 'warning'} />
                    {pet.distanceKm != null && (
                      <StatusBadge label={`${pet.distanceKm.toFixed(1)} km`} variant="neutral" />
                    )}
                  </View>
                  <View style={styles.gridActionsRow}>
                    <TouchableOpacity
                      style={[styles.gridFavBtn, { backgroundColor: colors.primary + '30', borderColor: colors.primary }]}
                      onPress={(e) => { e?.stopPropagation?.(); addToFavoritesMutation.mutate(pet.id); }}
                      disabled={addToFavoritesMutation.isPending}
                    >
                      <Ionicons name="heart" size={14} color={colors.primary} />
                      <Text style={[styles.gridFavBtnText, { color: colors.primary }]}>Favoritar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.gridUndoBtn, { backgroundColor: colors.primary }]}
                      onPress={(e) => { e?.stopPropagation?.(); undoMutation.mutate(pet.id); }}
                      disabled={undoMutation.isPending}
                    >
                      <Ionicons name="arrow-undo" size={14} color="#fff" />
                      <Text style={styles.gridUndoBtnText}>Mover para feed</Text>
                    </TouchableOpacity>
                  </View>
                </View>
            </TouchableOpacity>
          )}
          />
        </>
      ) : (
        <>
          {listHeader}
          <FlashList
            data={items}
            keyExtractor={(p) => p.id}
            numColumns={1}
            estimatedItemSize={120}
            style={styles.listScroll}
            contentContainerStyle={styles.list}
            key="list"
            refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
          }
          renderItem={({ item: pet }) => (
            <View style={[styles.row, { backgroundColor: colors.surface }]}>
              <TouchableOpacity
                style={styles.thumbWrap}
                onPress={() => router.push({ pathname: `/pet/${pet.id}`, params: { from: 'passed-pets' } })}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: pet.photos?.[0] ?? 'https://placehold.co/80?text=Pet' }}
                    style={styles.thumb}
                  />
                </TouchableOpacity>
                <View style={styles.body}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>{pet.name}</Text>
                    {pet.verified && <VerifiedBadge size={16} iconBackgroundColor={colors.primary} />}
                  </View>
                  <Text style={[styles.rowSub, { color: colors.textSecondary }]} numberOfLines={2}>
                    {[getSpeciesLabel(pet.species), `${pet.age} ano(s)`, getSizeLabel(pet.size)].filter(Boolean).join(' • ')}
                  </Text>
                  <View style={styles.badgesRow}>
                    {typeof pet.matchScore === 'number' && (
                      <TouchableOpacity
                        style={[styles.listMatchBadge, { backgroundColor: getMatchScoreColor(pet.matchScore) + 'e6' }]}
                        onPress={() => setMatchModalPetId(pet.id)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="speedometer-outline" size={12} color="#fff" />
                        <Text style={styles.listMatchBadgeText}>{pet.matchScore}%</Text>
                        <Ionicons name="chevron-down" size={12} color="#fff" style={styles.listMatchBadgeChevron} />
                      </TouchableOpacity>
                    )}
                    {pet.partner && (
                      <View style={[styles.partnerBadge, { backgroundColor: (pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? (colors.warning || '#d97706') + '30' : (colors.primary + '25') }]}>
                        <Ionicons name={(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? 'star' : 'heart'} size={12} color={(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? (colors.warning || '#d97706') : colors.primary} />
                        <Text style={[styles.partnerBadgeText, { color: (pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? (colors.warning || '#d97706') : colors.primary }]}>
                          {(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? 'Patrocinado' : 'Parceiro'}
                        </Text>
                      </View>
                    )}
                    <StatusBadge
                      label={pet.vaccinated ? 'Vacinado' : 'Não vacinado'}
                      variant={pet.vaccinated ? 'success' : 'warning'}
                    />
                    {pet.distanceKm != null && (
                      <StatusBadge label={`${pet.distanceKm.toFixed(1)} km`} variant="neutral" />
                    )}
                  </View>
                  <View style={styles.listActionsRow}>
                    <TouchableOpacity
                      style={[styles.favBtn, { backgroundColor: colors.primary + '25', borderColor: colors.primary }]}
                      onPress={() => addToFavoritesMutation.mutate(pet.id)}
                      disabled={addToFavoritesMutation.isPending}
                    >
                      <Ionicons name="heart" size={18} color={colors.primary} />
                      <Text style={[styles.favBtnText, { color: colors.primary }]}>Adicionar aos favoritos</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.undoBtn, { backgroundColor: colors.primary }]}
                      onPress={() => undoMutation.mutate(pet.id)}
                      disabled={undoMutation.isPending}
                    >
                      <Ionicons name="arrow-undo" size={18} color="#fff" />
                      <Text style={styles.undoBtnText}>Mover para o feed</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.detailLinkWrap}
                    onPress={() => router.push({ pathname: `/pet/${pet.id}`, params: { from: 'passed-pets' } })}
                  >
                    <Text style={[styles.detailLinkText, { color: colors.primary }]}>Ver detalhe do pet</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </>
      )}

      {matchModalPetId && !matchScoreData && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setMatchModalPetId(null)}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }]} onPress={() => setMatchModalPetId(null)}>
            <LoadingLogo size={100} />
          </Pressable>
        </Modal>
      )}
      {matchModalPetId && matchScoreData && matchScoreData.score != null && matchScoreData.criteriaCount > 0 && (
        <MatchScoreBadge
          data={matchScoreData}
          contextLabel="com você"
          forceModalOpen
          onClose={() => setMatchModalPetId(null)}
        />
      )}
      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  skeletonWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 160 },
  filtersWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
    marginTop: spacing.sm,
  },
  collapsibleHeaderText: { fontSize: 15, fontWeight: '600' },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: spacing.sm,
  },
  searchIcon: { marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
  },
  searchClear: { padding: spacing.xs },
  motivoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  motivoIcon: { marginRight: spacing.sm, marginTop: 2 },
  motivoText: { flex: 1, fontSize: 14, lineHeight: 20, fontStyle: 'italic' },
  hint: {
    fontSize: 13,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  thumbWrap: { marginRight: spacing.md },
  thumb: { width: 72, height: 72, borderRadius: 12 },
  body: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowTitle: { fontSize: 17, fontWeight: '600', flex: 1 },
  rowSub: { fontSize: 13, marginTop: 4 },
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
  listMatchBadgeChevron: { marginLeft: 2 },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  partnerBadgeText: { fontSize: 11, fontWeight: '600' },
  listActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  favBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
  },
  favBtnText: { fontSize: 14, fontWeight: '600' },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
  },
  undoBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  detailLinkWrap: { marginTop: spacing.xs },
  detailLinkText: { fontSize: 14, fontWeight: '600' },
  viewModeRow: { flexDirection: 'row', gap: 4, marginTop: spacing.sm },
  viewModeBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  listScroll: { flex: 1 },
  list: { padding: spacing.lg, paddingBottom: spacing.xl },
  gridList: { flex: 1, paddingBottom: spacing.xl },
  gridListContent: { paddingBottom: spacing.xl, paddingTop: spacing.xs, flexGrow: 1 },
  gridRow: { gap, marginBottom: gap },
  gridCard: { borderRadius: 12, overflow: 'hidden' },
  gridThumb: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  gridCardInfo: { padding: spacing.sm },
  gridCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gridCardName: { fontSize: 14, fontWeight: '700', flex: 1 },
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
  gridMatchBadgeChevron: { marginLeft: 2 },
  gridPartnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  gridPartnerBadgeText: { fontSize: 9, fontWeight: '600' },
  gridActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  gridFavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  gridFavBtnText: { fontSize: 12, fontWeight: '600' },
  gridUndoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  gridUndoBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
