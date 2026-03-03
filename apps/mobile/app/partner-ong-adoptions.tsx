import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, EmptyState, LoadingLogo, PageIntro, StatusBadge, VerifiedBadge } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { getMyPartner } from '../src/api/partner';
import { getPartnerPets, type PartnerPetsPage } from '../src/api/partners';
import { getSpeciesLabel } from '../src/utils/petLabels';
import { spacing } from '../src/theme';

const formatDate = (dateStr: string | undefined) =>
  dateStr ? new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null;

type PetItem = PartnerPetsPage['items'][number];

export default function PartnerOngAdoptionsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const { data: partner, isLoading: loadingPartner } = useQuery({
    queryKey: ['me', 'partner'],
    queryFn: getMyPartner,
  });

  const partnerId = partner?.id ?? null;
  const partnerName = partner?.name ?? '';

  const {
    data,
    isLoading: loadingPets,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['partners', partnerId, 'pets', 'adoptions'],
    queryFn: ({ pageParam }) =>
      getPartnerPets(partnerId!, { cursor: pageParam, species: 'BOTH' }),
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
  const adoptedPets = allPets.filter((p) => p.status === 'ADOPTED');

  if (loadingPartner || (!partner && !loadingPartner)) {
    return (
      <ScreenContainer>
        {loadingPartner ? (
          <LoadingLogo size={120} />
        ) : (
          <EmptyState
            title="Nenhuma ONG vinculada"
            message="Sua conta não está vinculada a uma ONG como admin ou membro."
            icon={<Ionicons name="business-outline" size={56} color={colors.textSecondary} />}
          />
        )}
      </ScreenContainer>
    );
  }

  if (!partnerId) {
    return (
      <ScreenContainer>
        <EmptyState
          title="Nenhuma ONG vinculada"
          message="Sua conta não está vinculada a uma ONG como admin ou membro."
          icon={<Ionicons name="business-outline" size={56} color={colors.textSecondary} />}
        />
      </ScreenContainer>
    );
  }

  const isLoading = loadingPets && adoptedPets.length === 0;

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={[styles.headerWrap, { borderBottomColor: colors.surface }]}>
          <PageIntro
            title="Adoções pela ONG"
            subtitle={partnerName ? `Pets da ${partnerName} que encontraram lar` : 'Pets da ONG que encontraram lar'}
          />
        </View>
        <View style={styles.loadingWrap}>
          <LoadingLogo size={160} />
        </View>
      </ScreenContainer>
    );
  }

  if (adoptedPets.length === 0 && !isFetchingNextPage) {
    return (
      <ScreenContainer>
        <View style={[styles.headerWrap, { borderBottomColor: colors.surface }]}>
          <PageIntro
            title="Adoções pela ONG"
            subtitle={partnerName ? `Pets da ${partnerName} que encontraram lar` : 'Pets da ONG que encontraram lar'}
          />
        </View>
        <EmptyState
          title="Nenhuma adoção ainda"
          message="Pets da sua instituição que forem adotados aparecerão aqui."
          icon={<Ionicons name="heart-circle-outline" size={56} color={colors.textSecondary} />}
        />
      </ScreenContainer>
    );
  }

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  const renderItem = ({ item }: { item: PetItem }) => (
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
          {item.verified && <VerifiedBadge variant="pet" size={16} iconBackgroundColor={colors.primary} />}
        </View>
        <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
          {getSpeciesLabel(item.species)} • {item.age} anos
        </Text>
        {formatDate(item.createdAt) ? (
          <Text style={[styles.cardMeta, { color: colors.textSecondary, marginTop: 2 }]}>
            Publicado em {formatDate(item.createdAt)}
          </Text>
        ) : null}
        <View style={styles.badgesRow}>
          <StatusBadge label={item.vaccinated ? 'Vacinado' : 'Não vacinado'} variant={item.vaccinated ? 'success' : 'warning'} />
          {typeof item.neutered === 'boolean' && (
            <StatusBadge label={item.neutered ? 'Castrado' : 'Não castrado'} variant={item.neutered ? 'success' : 'warning'} />
          )}
        </View>
        <View style={[styles.adoptedBadge, { backgroundColor: '#0D9488' + '25' }]}>
          <Ionicons name="heart" size={14} color="#0D9488" />
          <Text style={[styles.adoptedText, { color: '#0D9488' }]}>Adotado</Text>
        </View>
      </View>
      <Text style={[styles.arrow, { color: colors.textSecondary }]}>›</Text>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer scroll={false}>
      <View style={[styles.headerWrap, { borderBottomColor: colors.surface }]}>
        <PageIntro
          title="Adoções pela ONG"
          subtitle={partnerName ? `Pets da ${partnerName} que encontraram lar` : 'Pets da ONG que encontraram lar'}
        />
      </View>
      <FlashList
        data={adoptedPets}
        keyExtractor={(p) => p.id}
        estimatedItemSize={100}
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
        renderItem={renderItem}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  list: { padding: spacing.lg, paddingBottom: spacing.xl },
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
  adoptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  adoptedText: { fontSize: 12, fontWeight: '600' },
  arrow: { fontSize: 24 },
});
