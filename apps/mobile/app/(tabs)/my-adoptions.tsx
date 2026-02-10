import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, EmptyState, LoadingLogo } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { getMyAdoptions, type MyAdoptionItem } from '../../src/api/me';
import { spacing } from '../../src/theme';

const SPECIES_OPTIONS: { value: 'BOTH' | 'DOG' | 'CAT'; label: string }[] = [
  { value: 'BOTH', label: 'Todos' },
  { value: 'DOG', label: 'Cachorros' },
  { value: 'CAT', label: 'Gatos' },
];

export default function MyAdoptionsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [speciesFilter, setSpeciesFilter] = useState<'BOTH' | 'DOG' | 'CAT'>('BOTH');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['me', 'adoptions', speciesFilter],
    queryFn: () => getMyAdoptions({ species: speciesFilter }),
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
      <FlatList
        data={items}
        keyExtractor={(item) => item.adoptionId}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
        }
        renderItem={({ item }) => (
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
              <Text style={[styles.cardName, { color: colors.textPrimary }]}>{item.petName}</Text>
              <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                {item.species === 'dog' ? 'Cachorro' : 'Gato'}
              </Text>
              <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                Ex-tutor: {item.tutorName}
              </Text>
              {item.confirmedByAdopet ? (
                <View style={[styles.badge, { backgroundColor: '#0D9488' + '25', marginTop: 6 }]}>
                  <Text style={[styles.badgeText, { color: '#0D9488' }]}>Confirmado pelo Adopet</Text>
                </View>
              ) : (
                <View style={[styles.badge, { backgroundColor: (colors.error || '#DC2626') + '25', marginTop: 6 }]}>
                  <Text style={[styles.badgeText, { color: colors.error || '#DC2626' }]}>Rejeitado pelo Adopet</Text>
                </View>
              )}
              <Text style={[styles.adoptedAt, { color: colors.primary }]}>
                Adotado em {adoptedDate(item.adoptedAt)}
              </Text>
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
  cardBody: { flex: 1, marginLeft: spacing.md },
  cardName: { fontSize: 16, fontWeight: '600' },
  cardMeta: { fontSize: 13, marginTop: 2 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  adoptedAt: { fontSize: 13, marginTop: 4, fontWeight: '600' },
  arrow: { fontSize: 24 },
});
