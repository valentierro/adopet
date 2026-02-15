import { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, EmptyState, LoadingLogo, VerifiedBadge, StatusBadge } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useListViewMode } from '../../src/hooks/useListViewMode';
import { getPassedPets, undoPass } from '../../src/api/swipes';
import { getFriendlyErrorMessage } from '../../src/utils/errorMessage';
import { spacing } from '../../src/theme';
import { gridLayout } from '../../src/theme/grid';
import { Ionicons } from '@expo/vector-icons';

const { cellWidth, gap, padding: gridPadding, aspectRatio } = gridLayout;
const GRID_ITEM_MARGIN = gap / 2;

export default function PassedPetsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [nameSearch, setNameSearch] = useState('');
  const { viewMode, setViewMode } = useListViewMode('passedPetsViewMode', { persist: false });
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
      queryClient.invalidateQueries({ queryKey: ['swipes', 'passed'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível desfazer.'));
    },
  });

  const allItems = data?.items ?? [];
  const nameQuery = nameSearch.trim().toLowerCase();
  const items = nameQuery
    ? allItems.filter((p) => (p.name || '').toLowerCase().includes(nameQuery))
    : allItems;

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
        <EmptyState
          title="Nenhum pet passado"
          message="Quando você passar em um pet no feed, ele aparecerá aqui para você reconsiderar."
          icon={<Ionicons name="arrow-undo-outline" size={48} color={colors.textSecondary} />}
        />
      </ScreenContainer>
    );
  }

  const listHeader = (
    <>
      <View style={[styles.motivoBox, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
        <Ionicons name="heart" size={18} color={colors.primary} style={styles.motivoIcon} />
        <Text style={[styles.motivoText, { color: colors.textPrimary }]}>
          Às vezes o amor está na segunda olhada. Vale a pena rever com carinho.
        </Text>
      </View>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Toque em "Mover para o feed" para o pet voltar ao feed.
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
    </>
  );

  return (
    <ScreenContainer scroll={false}>
      {items.length === 0 ? (
        <>
          {listHeader}
          <EmptyState
            title="Nenhum pet com esse nome"
            message="Tente outro nome ou limpe a busca."
            icon={<Ionicons name="search-outline" size={48} color={colors.textSecondary} />}
          />
        </>
      ) : (
        <FlashList
          data={items}
          keyExtractor={(p) => p.id}
          key={viewMode}
          numColumns={viewMode === 'grid' ? 2 : 1}
          estimatedItemSize={viewMode === 'grid' ? 220 : 120}
          contentContainerStyle={[styles.list, viewMode === 'grid' && styles.gridList]}
          ListHeaderComponent={listHeader}
          onRefresh={() => refetch()}
          refreshing={isRefetching}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
          }
          renderItem={({ item: pet }) =>
            viewMode === 'grid' ? (
              <TouchableOpacity
                style={[styles.gridCard, { backgroundColor: colors.surface, marginHorizontal: GRID_ITEM_MARGIN, marginBottom: gap }]}
                onPress={() => router.push({ pathname: `/pet/${pet.id}`, params: { from: 'passed-pets' } })}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: pet.photos?.[0] ?? 'https://placehold.co/80?text=Pet' }}
                  style={[styles.gridThumb, { width: cellWidth, height: cellWidth / aspectRatio }]}
                  contentFit="cover"
                />
                <View style={styles.gridCardInfo}>
                  <View style={styles.gridCardTitleRow}>
                    <Text style={[styles.gridCardName, { color: colors.textPrimary }]} numberOfLines={1}>{pet.name}</Text>
                    {pet.verified && <VerifiedBadge size={14} iconBackgroundColor={colors.primary} />}
                  </View>
                  <View style={styles.gridBadgesRow}>
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
                  <TouchableOpacity
                    style={[styles.gridUndoBtn, { backgroundColor: colors.primary }]}
                    onPress={(e) => { e?.stopPropagation?.(); undoMutation.mutate(pet.id); }}
                    disabled={undoMutation.isPending}
                  >
                    <Ionicons name="arrow-undo" size={14} color="#fff" />
                    <Text style={styles.gridUndoBtnText}>Mover para feed</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ) : (
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
                    {pet.species} • {pet.age} ano(s) • {pet.size}
                  </Text>
                  <View style={styles.badgesRow}>
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
                  <TouchableOpacity
                    style={[styles.undoBtn, { backgroundColor: colors.primary }]}
                    onPress={() => undoMutation.mutate(pet.id)}
                    disabled={undoMutation.isPending}
                  >
                    <Ionicons name="arrow-undo" size={18} color="#fff" />
                    <Text style={styles.undoBtnText}>Mover para o feed</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.detailLinkWrap}
                    onPress={() => router.push({ pathname: `/pet/${pet.id}`, params: { from: 'passed-pets' } })}
                  >
                    <Text style={[styles.detailLinkText, { color: colors.primary }]}>Ver detalhe do pet</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  skeletonWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 160 },
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
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  partnerBadgeText: { fontSize: 11, fontWeight: '600' },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
  },
  undoBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  detailLinkWrap: { marginTop: spacing.xs },
  detailLinkText: { fontSize: 14, fontWeight: '600' },
  viewModeRow: { flexDirection: 'row', gap: 4, marginTop: spacing.sm },
  viewModeBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.lg, paddingBottom: spacing.xl },
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
  gridUndoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  gridUndoBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
