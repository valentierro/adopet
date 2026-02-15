import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { ScreenContainer, PetCard, EmptyState, LoadingLogo, PageIntro, StatusBadge } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useListViewMode } from '../../src/hooks/useListViewMode';
import {
  getFavorites,
  removeFavorite,
  favoritePetToPet,
  type FavoriteItem,
} from '../../src/api/favorites';
import { createConversation } from '../../src/api/conversations';
import { getFriendlyErrorMessage } from '../../src/utils/errorMessage';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../../src/theme';
import { gridLayout } from '../../src/theme/grid';

const { cellWidth, gap, padding: gridPadding, aspectRatio } = gridLayout;
const GRID_ITEM_MARGIN = gap / 2;

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
};

const FavoriteRow = React.memo(function FavoriteRow({
  item,
  viewMode,
  colors,
  onPressPet,
  onChat,
  onRemove,
}: FavoriteRowProps) {
  if (!item?.pet) return null;
  if (viewMode === 'grid') {
    const pet = favoritePetToPet(item);
    return (
      <TouchableOpacity
        style={[styles.gridCard, { backgroundColor: colors.surface, marginHorizontal: GRID_ITEM_MARGIN, marginBottom: gap }]}
        onPress={() => onPressPet(item.petId)}
        activeOpacity={0.85}
      >
        <Image
          source={{ uri: pet.photos?.[0] ?? 'https://placedog.net/400/500' }}
          style={[styles.gridThumb, { width: cellWidth, height: cellWidth / aspectRatio }]}
          contentFit="cover"
        />
        <View style={styles.gridCardInfo}>
          <Text style={[styles.gridCardName, { color: colors.textPrimary }]} numberOfLines={1}>{pet.name}</Text>
          <View style={styles.gridBadgesRow}>
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
      <PetCard
        pet={favoritePetToPet(item)}
        onPress={() => onPressPet(item.petId)}
      />
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.chatBtn, { backgroundColor: colors.primary }]}
          onPress={() => onChat(item)}
        >
          <Ionicons name="chatbubble-outline" size={18} color="#fff" />
          <Text style={styles.chatBtnText}>Conversar</Text>
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
  const { colors } = useTheme();
  const { viewMode, setViewMode } = useListViewMode('favoritesViewMode', { persist: false });
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

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const removeMutation = useMutation({
    mutationFn: removeFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.refetchQueries({ queryKey: ['favorites'] });
    },
  });

  const startChat = useCallback(
    async (item: FavoriteItem) => {
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
    [router, queryClient],
  );

  const safeItems = Array.isArray(items) ? items : EMPTY_ITEMS;
  const itemCount = safeItems.length;
  const estimatedItemSize = viewMode === 'grid' ? FAVORITE_GRID_ITEM_HEIGHT : FAVORITE_LIST_ITEM_HEIGHT;
  const handlePressPet = useCallback((petId: string) => router.push(`/pet/${petId}`), [router]);
  const handleRemove = useCallback(
    (petId: string) => removeMutation.mutate(petId),
    [removeMutation],
  );

  if (isLoading && itemCount === 0) {
    return (
      <ScreenContainer scroll>
        <PageIntro title="Favoritos" subtitle="Pets que você curtiu e pode conversar com o tutor." />
        <View style={styles.loadingWrap}>
          <LoadingLogo size={160} />
        </View>
      </ScreenContainer>
    );
  }

  if (itemCount === 0) {
    return (
      <ScreenContainer>
        <PageIntro title="Favoritos" subtitle="Pets que você curtiu e pode conversar com o tutor." />
        <View style={[styles.motivoBox, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
          <Ionicons name="heart" size={18} color={colors.primary} style={styles.motivoIcon} />
          <Text style={[styles.motivoText, { color: colors.textPrimary }]}>
            Cada coração que você dá pode ser o início de uma nova história. Vale a pena dar o próximo passo.
          </Text>
        </View>
        <EmptyState
          title="Nenhum favorito ainda"
          message="Pets que você curtir no feed aparecerão aqui. Depois você pode conversar com o tutor."
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

  const renderItem = useCallback(
    ({ item }: { item: FavoriteItem }) => (
      <FavoriteRow
        item={item}
        viewMode={viewMode}
        colors={colors}
        onPressPet={handlePressPet}
        onChat={startChat}
        onRemove={handleRemove}
      />
    ),
    [viewMode, colors, handlePressPet, startChat, handleRemove],
  );

  return (
    <ScreenContainer scroll={false}>
      <FlashList
        data={safeItems}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        numColumns={viewMode === 'grid' ? 2 : 1}
        estimatedItemSize={estimatedItemSize}
        onRefresh={() => refetch()}
        refreshing={isRefetching}
        contentContainerStyle={[styles.listContent, viewMode === 'grid' && { paddingHorizontal: gridPadding }]}
        ListHeaderComponent={
          <>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }} />
              <ViewModeToggle />
            </View>
            <PageIntro title="Favoritos" subtitle="Pets que você curtiu e pode conversar com o tutor." />
            <View style={[styles.motivoBox, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
              <Ionicons name="heart" size={18} color={colors.primary} style={styles.motivoIcon} />
              <Text style={[styles.motivoText, { color: colors.textPrimary }]}>
                Cada coração que você dá pode ser o início de uma nova história. Vale a pena dar o próximo passo.
              </Text>
            </View>
          </>
        }
        renderItem={renderItem}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  skeletonWrap: { paddingTop: spacing.sm },
  skeletonCard: { marginBottom: spacing.lg },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 160 },
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
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  viewModeRow: { flexDirection: 'row', gap: 4 },
  viewModeBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  gridRow: { gap, marginBottom: gap },
  gridCard: { width: cellWidth, borderRadius: 12, overflow: 'hidden' },
  gridThumb: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  gridCardInfo: { padding: spacing.sm },
  gridCardName: { fontSize: 14, fontWeight: '700' },
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
  gridCardActions: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  gridMiniBtn: { padding: 6, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cardWrap: { marginBottom: spacing.lg },
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
});
