import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ListRenderItem, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ScreenContainer, LoadingLogo, EmptyState } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { fetchFeed } from '../src/api/feed';
import { spacing } from '../src/theme';
import type { Pet } from '@adopet/shared';

export default function OwnerPetsScreen() {
  const { ownerId, ownerName } = useLocalSearchParams<{ ownerId: string; ownerName?: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const {
    data,
    isLoading,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['feed-by-owner', ownerId],
    queryFn: ({ pageParam }) =>
      fetchFeed({ ownerId: ownerId!, cursor: pageParam }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!ownerId,
  });

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  const renderItem: ListRenderItem<Pet> = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }]}
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
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
          {item.species === 'dog' ? 'Cachorro' : 'Gato'} · {item.age} ano(s)
        </Text>
        {item.city ? (
          <Text style={[styles.cardCity, { color: colors.textSecondary }]} numberOfLines={1}>{item.city}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

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
        <LoadingLogo size={160} />
      </ScreenContainer>
    );
  }

  const title = ownerName ? `Anúncios de ${ownerName}` : 'Anúncios do tutor';

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, items.length === 0 && styles.listContentEmpty]}
        ListEmptyComponent={
          <EmptyState
            title="Nenhum anúncio"
            message="Este tutor não possui anúncios disponíveis no momento."
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  cardImageWrap: {
    width: 100,
    height: 100,
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
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardMeta: {
    fontSize: 13,
    marginBottom: 2,
  },
  cardCity: {
    fontSize: 12,
  },
  error: {
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
