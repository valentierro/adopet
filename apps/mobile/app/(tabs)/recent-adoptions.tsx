import { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, FlatList, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, EmptyState, LoadingLogo } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { getRecentAdoptions, type RecentAdoptionItem } from '../../src/api/public';
import { getSpeciesLabel } from '../../src/utils/petLabels';
import { spacing } from '../../src/theme';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function AdoptionRow({
  item,
  colors,
  onPress,
}: {
  item: RecentAdoptionItem;
  colors: { textPrimary: string; textSecondary: string; primary: string };
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[rowStyles.row, { backgroundColor: colors.primary + '08' }]} onPress={onPress} activeOpacity={0.8}>
      {item.photoUrl ? (
        <Image source={{ uri: item.photoUrl }} style={rowStyles.thumb} />
      ) : (
        <View style={[rowStyles.thumbPlaceholder, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="heart" size={28} color={colors.primary} />
        </View>
      )}
      <View style={rowStyles.body}>
        <Text style={[rowStyles.name, { color: colors.textPrimary }]} numberOfLines={1}>{item.petName}</Text>
        <Text style={[rowStyles.meta, { color: colors.textSecondary }]}>
          {getSpeciesLabel(item.species)}
          {item.city ? ` • ${item.city}` : ''}
        </Text>
        <Text style={[rowStyles.date, { color: colors.textSecondary }]}>Adotado em {formatDate(item.adoptedAt)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 12,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: spacing.md,
  },
  thumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  name: { fontSize: 17, fontWeight: '600', marginBottom: 2 },
  meta: { fontSize: 14, marginBottom: 2 },
  date: { fontSize: 13, opacity: 0.9 },
});

export default function RecentAdoptionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['public', 'recent-adoptions'],
    queryFn: () => getRecentAdoptions(50),
    staleTime: 60_000,
  });

  const items = data?.items ?? [];
  const onRefresh = useCallback(() => refetch(), [refetch]);

  const renderItem = useCallback(
    ({ item }: { item: RecentAdoptionItem }) => (
      <AdoptionRow
        item={item}
        colors={colors}
        onPress={() => router.push(`/pet/${item.petId}`)}
      />
    ),
    [colors, router],
  );

  if (isLoading && items.length === 0) {
    return (
      <ScreenContainer>
        <LoadingLogo />
      </ScreenContainer>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingBottom: spacing.md }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Últimas adoções</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Estes pets já encontraram lar. Que tal encontrar o seu? Veja anúncios disponíveis e adote com responsabilidade.
        </Text>
        <TouchableOpacity
          style={styles.cta}
          onPress={() => router.push('/feed')}
          activeOpacity={0.85}
        >
          <Ionicons name="paw" size={20} color="#fff" style={styles.ctaIcon} />
          <Text style={styles.ctaText}>Ver pets para adoção</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.petId}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, items.length === 0 && styles.listEmpty]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="heart-outline" size={48} color={colors.textSecondary} />}
            title="Nenhuma adoção recente"
            message="As adoções confirmadas aparecerão aqui."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: '#d97706',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
  },
  ctaIcon: {
    marginRight: spacing.sm,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    paddingVertical: spacing.md,
  },
  listEmpty: {
    flex: 1,
  },
});
