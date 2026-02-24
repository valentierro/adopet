import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, useWindowDimensions, FlatList, RefreshControl, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { ScreenContainer, PetCard, EmptyState, LoadingLogo, PageIntro, StatusBadge, PrimaryButton } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useListViewMode } from '../../src/hooks/useListViewMode';
import { getMe } from '../../src/api/me';
import {
  getFavorites,
  removeFavorite,
  favoritePetToPet,
  type FavoriteItem,
} from '../../src/api/favorites';
import { createConversation } from '../../src/api/conversations';
import { getFriendlyErrorMessage } from '../../src/utils/errorMessage';
import { getMatchScoreColor } from '../../src/utils/matchScoreColor';
import { getViewedPetIds } from '../../src/utils/viewedPets';
import { useAuthStore } from '../../src/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../../src/theme';
import { gridLayout } from '../../src/theme/grid';

const { gap, padding: gridPadding, aspectRatio } = gridLayout;
const NUM_COLUMNS = 2;
const gridScreenPadding = spacing.sm;
const gridCellSafety = spacing.md;

const SPECIES_OPTIONS: { value: 'BOTH' | 'DOG' | 'CAT'; label: string }[] = [
  { value: 'BOTH', label: 'Todos' },
  { value: 'DOG', label: 'Cachorros' },
  { value: 'CAT', label: 'Gatos' },
];

const EMPTY_ITEMS: FavoriteItem[] = [];

function safeFavoritesPage(result: unknown): { items: FavoriteItem[]; nextCursor: string | null } {
  if (result == null || typeof result !== 'object') return { items: EMPTY_ITEMS, nextCursor: null };
  const o = result as Record<string, unknown>;
  const items = Array.isArray(o.items) ? o.items : EMPTY_ITEMS;
  const nextCursor = o.nextCursor != null ? o.nextCursor : null;
  return { items: items as FavoriteItem[], nextCursor: nextCursor as string | null };
}

function safeFavoriteItem(x: unknown): x is FavoriteItem {
  return (
    x != null &&
    typeof x === 'object' &&
    typeof (x as FavoriteItem).id === 'string' &&
    typeof (x as FavoriteItem).petId === 'string' &&
    (x as FavoriteItem).pet != null &&
    typeof (x as FavoriteItem).pet === 'object'
  );
}

const FAVORITE_LIST_ITEM_HEIGHT = 320;
const FAVORITE_GRID_ITEM_HEIGHT = 220;

type FavoriteRowProps = {
  item: FavoriteItem;
  viewMode: 'list' | 'grid';
  colors: { primary: string; surface: string; textPrimary: string; textSecondary: string; warning?: string };
  onPressPet: (petId: string) => void;
  onChat: (item: FavoriteItem) => void;
  onRemove: (petId: string) => void;
  gridCellWidth?: number;
  gridIndex?: number;
  viewedPetIds?: Set<string>;
};

const FavoriteRow = React.memo(function FavoriteRow({
  item,
  viewMode,
  colors,
  onPressPet,
  onChat,
  onRemove,
  gridCellWidth = 0,
  gridIndex = 0,
  viewedPetIds = new Set(),
}: FavoriteRowProps) {
  if (!item?.pet) return null;
  const isViewed = viewedPetIds.has(item.petId);
  if (viewMode === 'grid') {
    const pet = favoritePetToPet(item);
    const w = gridCellWidth > 0 ? gridCellWidth : 160;
    return (
      <TouchableOpacity
        style={[styles.gridCard, { backgroundColor: colors.surface, width: w }]}
        onPress={() => onPressPet(item.petId)}
        activeOpacity={0.85}
      >
        <View style={styles.gridThumbWrap}>
          <Image
            source={{ uri: pet.photos?.[0] ?? 'https://picsum.photos/seed/pet/400/500' }}
            style={[styles.gridThumb, { width: w, height: w / aspectRatio }]}
            contentFit="cover"
          />
          {isViewed && (
            <View style={[styles.viewedBadgeWrap, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
              <Ionicons name="eye-outline" size={12} color="#fff" />
              <Text style={styles.viewedBadgeText}>Visualizado</Text>
            </View>
          )}
        </View>
        <View style={styles.gridCardInfo}>
          <Text style={[styles.gridCardName, { color: colors.textPrimary }]} numberOfLines={1}>{pet.name}</Text>
          <View style={styles.gridBadgesRow}>
            {typeof item.pet?.matchScore === 'number' && (
              <View style={[styles.gridMatchBadge, { backgroundColor: getMatchScoreColor(item.pet.matchScore) + 'e6' }]}>
                <Ionicons name="speedometer-outline" size={10} color="#fff" />
                <Text style={styles.gridMatchBadgeText}>{item.pet.matchScore}%</Text>
              </View>
            )}
            {pet.partner != null && (
              <View style={[styles.gridPartnerBadge, { backgroundColor: (pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? (colors.warning || '#d97706') + '30' : (colors.primary + '25') }]}>
                <Ionicons name={(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? 'star' : 'heart'} size={9} color={(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? (colors.warning || '#d97706') : colors.primary} />
                <Text style={[styles.gridPartnerBadgeText, { color: (pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? (colors.warning || '#d97706') : colors.primary }]} numberOfLines={1}>
                  {(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? 'Patrocinado' : 'Parceiro'}
                </Text>
              </View>
            )}
            <StatusBadge label={pet.vaccinated ? 'Vacinado' : 'Não vacinado'} variant={pet.vaccinated ? 'success' : 'warning'} />
            {typeof pet.neutered === 'boolean' && (
              <StatusBadge label={pet.neutered ? 'Castrado' : 'Não castrado'} variant={pet.neutered ? 'success' : 'warning'} />
            )}
          </View>
          {pet.viewCountLast24h != null && pet.viewCountLast24h >= 1 && (
            <Text style={[styles.gridCardMeta, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
              {pet.viewCountLast24h} {pet.viewCountLast24h === 1 ? 'pessoa viu' : 'pessoas viram'} nas últimas 24h
            </Text>
          )}
          <View style={styles.gridCardActions}>
            <TouchableOpacity
              style={[styles.gridMiniBtn, { backgroundColor: colors.primary }]}
              onPress={(e) => { e?.stopPropagation?.(); onChat(item); }}
            >
              <Ionicons name="chatbubble-outline" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.gridMiniBtn, { borderColor: colors.textSecondary, borderWidth: 1 }]}
              onPress={(e) => {
                e?.stopPropagation?.();
                Alert.alert('Remover dos favoritos?', undefined, [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Remover', style: 'destructive', onPress: () => onRemove(item.petId) },
                ]);
              }}
            >
              <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
  return (
    <View style={styles.cardWrap}>
      <View style={styles.listCardInner}>
        <PetCard
          pet={favoritePetToPet(item)}
          onPress={() => onPressPet(item.petId)}
        />
        {isViewed && (
          <View style={[styles.viewedBadgeWrap, styles.viewedBadgeList, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <Ionicons name="eye-outline" size={12} color="#fff" />
            <Text style={styles.viewedBadgeText}>Visualizado</Text>
          </View>
        )}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.chatBtn, { backgroundColor: colors.primary }]}
          onPress={() => onChat(item)}
        >
          <Ionicons name="chatbubble-outline" size={18} color="#fff" />
          <Text style={styles.chatBtnText}>Quero adotar / Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.removeBtn, { borderColor: colors.textSecondary }]}
          onPress={() => {
            Alert.alert(
              'Remover dos favoritos?',
              undefined,
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Remover', style: 'destructive', onPress: () => onRemove(item.petId) },
              ],
            );
          }}
        >
          <Text style={[styles.removeBtnText, { color: colors.textSecondary }]}>Remover</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function FavoritesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { colors } = useTheme();
  const [speciesFilter, setSpeciesFilter] = useState<'BOTH' | 'DOG' | 'CAT'>('BOTH');
  const { viewMode, setViewMode } = useListViewMode('favoritesViewMode', { persist: false });
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: getMe });

  const gridContentWidth = screenWidth - insets.left - insets.right - 2 * gridScreenPadding;
  const gridCellWidth = gridContentWidth > 0 ? (gridContentWidth - gap - gridCellSafety) / NUM_COLUMNS : 0;
  const gridPaddingHorizontal = useMemo(
    () => ({ paddingHorizontal: gridScreenPadding + (insets.left + insets.right) / 2 }),
    [insets.left, insets.right],
  );

  useFocusEffect(
    useCallback(() => {
      if (!userId) router.replace('/(auth)/welcome');
    }, [userId, router]),
  );
  const profileComplete = !!(user?.avatarUrl && user?.phone);
  const { data: pageData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      try {
        const result = await getFavorites(undefined);
        return safeFavoritesPage(result);
      } catch {
        return { items: [...EMPTY_ITEMS], nextCursor: null };
      }
    },
    staleTime: 0,
  });

  const items: FavoriteItem[] = useMemo(() => {
    const page = pageData != null ? safeFavoritesPage(pageData) : null;
    const list = page?.items != null && Array.isArray(page.items) ? page.items : EMPTY_ITEMS;
    const out: FavoriteItem[] = [];
    for (let j = 0; j < list.length; j++) {
      const x = list[j];
      if (safeFavoriteItem(x)) out.push(x);
    }
    return out;
  }, [pageData]);

  const filteredAndSortedItems = useMemo(() => {
    const filtered =
      speciesFilter === 'BOTH'
        ? items
        : items.filter((item) => String(item.pet?.species ?? '').toUpperCase() === speciesFilter);
    return [...filtered].sort((a, b) => {
      const scoreA = a.pet?.matchScore ?? -1;
      const scoreB = b.pet?.matchScore ?? -1;
      return scoreB - scoreA;
    });
  }, [items, speciesFilter]);

  const [viewedPetIds, setViewedPetIds] = useState<Set<string>>(new Set());
  useFocusEffect(
    useCallback(() => {
      refetch();
      getViewedPetIds(userId ?? 'guest').then(setViewedPetIds);
    }, [refetch, userId]),
  );

  const removeMutation = useMutation({
    mutationFn: removeFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.refetchQueries({ queryKey: ['favorites'] });
    },
  });

  const [showCompleteProfileModal, setShowCompleteProfileModal] = useState(false);

  const startChat = useCallback(
    async (item: FavoriteItem) => {
      if (!profileComplete) {
        setShowCompleteProfileModal(true);
        return;
      }
      try {
        const { id } = await createConversation(item.petId);
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        queryClient.refetchQueries({ queryKey: ['conversations'] });
        router.push(`/chat/${id}`);
      } catch (e: unknown) {
        Alert.alert(
          'Conversar',
          getFriendlyErrorMessage(e, 'Adicione o pet aos favoritos para iniciar a conversa.'),
        );
      }
    },
    [router, queryClient, profileComplete],
  );

  const safeItems = Array.isArray(filteredAndSortedItems) ? filteredAndSortedItems : EMPTY_ITEMS;
  const itemCount = safeItems.length;
  const hasSpeciesFilter = speciesFilter !== 'BOTH';
  const estimatedItemSize = viewMode === 'grid' ? FAVORITE_GRID_ITEM_HEIGHT : FAVORITE_LIST_ITEM_HEIGHT;
  const handlePressPet = useCallback((petId: string) => router.push(`/pet/${petId}`), [router]);
  const handleRemove = useCallback(
    (petId: string) => removeMutation.mutate(petId),
    [removeMutation],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: FavoriteItem; index: number }) => (
      <FavoriteRow
        item={item}
        viewMode={viewMode}
        colors={colors}
        onPressPet={handlePressPet}
        onChat={startChat}
        onRemove={handleRemove}
        gridCellWidth={gridCellWidth}
        gridIndex={index}
        viewedPetIds={viewedPetIds}
      />
    ),
    [viewMode, colors, handlePressPet, startChat, handleRemove, gridCellWidth, viewedPetIds],
  );

  const rawItemCount = items.length;
  if (isLoading && rawItemCount === 0) {
    return (
      <ScreenContainer scroll>
        <PageIntro title="Favoritos" subtitle="Pets que você curtiu e pode conversar com o tutor." />
        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Espécie</Text>
        <View style={styles.chipRow}>
          {SPECIES_OPTIONS.map((opt) => (
            <TouchableOpacity key={opt.value} style={[styles.chip, { backgroundColor: colors.surface }]}>
              <Text style={[styles.chipText, { color: colors.textSecondary }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.loadingWrap}>
          <LoadingLogo size={160} />
        </View>
      </ScreenContainer>
    );
  }

  if (itemCount === 0) {
    const emptyTitle = hasSpeciesFilter ? 'Nenhum favorito com esse filtro' : 'Nenhum favorito ainda';
    const emptyMessage = hasSpeciesFilter
      ? 'Tente alterar o filtro de espécie.'
      : 'Pets que você curtir no feed aparecerão aqui. Depois você pode conversar com o tutor.';
    return (
      <ScreenContainer>
        <View style={[styles.filtersWrap, { borderBottomColor: colors.surface }]}>
          <PageIntro title="Favoritos" subtitle="Pets que você curtiu e pode conversar com o tutor." />
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
        </View>
        <EmptyState
          title={emptyTitle}
          message={emptyMessage}
          icon={<Ionicons name="heart-outline" size={48} color={colors.textSecondary} />}
        />
        <TouchableOpacity
          style={[styles.emptyCta, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/feed')}
          activeOpacity={0.8}
        >
          <Ionicons name="paw" size={20} color="#fff" />
          <Text style={styles.emptyCtaText}>Descobrir pets</Text>
        </TouchableOpacity>
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
      <PageIntro title="Favoritos" subtitle="Pets que você curtiu e pode conversar com o tutor." />
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
    </View>
  );

  return (
    <ScreenContainer scroll={false}>
      {listHeader}
      {viewMode === 'grid' ? (
        <FlatList
          data={safeItems}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          numColumns={NUM_COLUMNS}
          key="grid"
          style={styles.listScroll}
          contentContainerStyle={[styles.gridListContent, gridPaddingHorizontal]}
          columnWrapperStyle={styles.gridRow}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
          }
          renderItem={renderItem}
        />
      ) : (
        <FlashList
          data={safeItems}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          numColumns={1}
          estimatedItemSize={FAVORITE_LIST_ITEM_HEIGHT}
          style={styles.listScroll}
          onRefresh={() => refetch()}
          refreshing={isRefetching}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
        />
      )}
      <Modal visible={showCompleteProfileModal} transparent animationType="fade">
        <Pressable style={styles.completeProfileModalOverlay} onPress={() => setShowCompleteProfileModal(false)}>
          <Pressable style={[styles.completeProfileModalCard, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.completeProfileModalTitle, { color: colors.textPrimary }]}>Complete seu perfil</Text>
            <Text style={[styles.completeProfileModalMessage, { color: colors.textSecondary }]}>
              Para conversar com o tutor é preciso ter foto e telefone no perfil. Assim o tutor sabe com quem está falando. Você será levado à página de edição para completar.
            </Text>
            <TouchableOpacity
              onPress={() => setShowCompleteProfileModal(false)}
              activeOpacity={0.8}
              style={styles.completeProfileModalLinkWrap}
            >
              <Text style={[styles.completeProfileModalLink, { color: colors.primary }]}>Completar depois</Text>
            </TouchableOpacity>
            <PrimaryButton
              title="Completar perfil"
              onPress={() => {
                setShowCompleteProfileModal(false);
                router.push('/profile-edit');
              }}
              style={styles.completeProfileModalBtn}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  skeletonWrap: { paddingTop: spacing.sm },
  skeletonCard: { marginBottom: spacing.lg },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 160 },
  listScroll: { flex: 1 },
  filtersWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1 },
  filterLabel: { fontSize: 12, fontWeight: '600', marginBottom: spacing.xs, marginTop: spacing.sm },
  chipRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20 },
  chipText: { fontSize: 14, fontWeight: '500' },
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
  listContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  gridListContent: { paddingBottom: spacing.xl, paddingTop: spacing.xs, flexGrow: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  viewModeRow: { flexDirection: 'row', gap: 4 },
  viewModeBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  gridRow: { gap, marginBottom: gap },
  gridCard: { borderRadius: 12, overflow: 'hidden' },
  gridThumbWrap: { position: 'relative' },
  gridThumb: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
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
  viewedBadgeList: { bottom: 'auto', top: 6, right: 6, left: 'auto' },
  gridCardInfo: { padding: spacing.sm },
  gridCardName: { fontSize: 14, fontWeight: '700' },
  gridCardMeta: { fontSize: 12 },
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
  gridPartnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  gridPartnerBadgeText: { fontSize: 9, fontWeight: '600' },
  gridCardActions: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  gridMiniBtn: { padding: 6, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  listCardInner: { position: 'relative' },
  cardWrap: { marginBottom: spacing.lg },
  listCardInner: { position: 'relative' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  chatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: 10,
  },
  chatBtnText: { color: '#fff', fontWeight: '600' },
  removeBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 10, borderWidth: 1 },
  removeBtnText: { fontSize: 14 },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
  },
  emptyCtaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  completeProfileModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  completeProfileModalCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
  },
  completeProfileModalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.lg },
  completeProfileModalMessage: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: spacing.md },
  completeProfileModalLinkWrap: { marginBottom: spacing.lg },
  completeProfileModalLink: { fontSize: 15, fontWeight: '600', textDecorationLine: 'underline' },
  completeProfileModalBtn: { alignSelf: 'stretch' },
});
