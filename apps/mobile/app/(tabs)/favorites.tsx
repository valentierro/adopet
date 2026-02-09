import { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, PetCard, EmptyState, LoadingLogo, PageIntro } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
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

export default function FavoritesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
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

  const removeMutation = useMutation({
    mutationFn: removeFavorite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const startChat = useCallback(
    async (item: FavoriteItem) => {
      try {
        const { id } = await createConversation(item.petId);
        router.push(`/chat/${id}`);
      } catch (e: unknown) {
        Alert.alert(
          'Conversar',
          getFriendlyErrorMessage(e, 'Adicione o pet aos favoritos para iniciar a conversa.'),
        );
      }
    },
    [router],
  );

  const safeItems = Array.isArray(items) ? items : EMPTY_ITEMS;
  const itemCount = safeItems.length;

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
        <EmptyState
          title="Nenhum favorito ainda"
          message="Pets que você curtir no feed aparecerão aqui. Depois você pode conversar com o tutor."
          icon={<Ionicons name="heart-outline" size={48} color={colors.textSecondary} />}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <FlatList
        data={safeItems}
        keyExtractor={(item) => item.id}
        onRefresh={() => refetch()}
        refreshing={isRefetching}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <PageIntro title="Favoritos" subtitle="Pets que você curtiu e pode conversar com o tutor." />
        }
        renderItem={({ item }) => {
          if (!item?.pet) return null;
          return (
          <View style={styles.cardWrap}>
            <PetCard
              pet={favoritePetToPet(item)}
              onPress={() => router.push(`/pet/${item.petId}`)}
            />
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.chatBtn, { backgroundColor: colors.primary }]}
                onPress={() => startChat(item)}
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
                      {
                        text: 'Remover',
                        style: 'destructive',
                        onPress: () => removeMutation.mutate(item.petId),
                      },
                    ],
                  );
                }}
              >
                <Text style={[styles.removeBtnText, { color: colors.textSecondary }]}>
                  Remover
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  skeletonWrap: { paddingTop: spacing.sm },
  skeletonCard: { marginBottom: spacing.lg },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 160 },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xl },
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
});
