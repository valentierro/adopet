import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView, RefreshControl, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, EmptyState, LoadingLogo, PageIntro } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { getPartners } from '../../src/api/partners';
import { spacing } from '../../src/theme';

export default function PartnersScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [selectedCity, setSelectedCity] = useState('');
  const { data: partners = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['partners'],
    queryFn: () => getPartners(),
    staleTime: 5 * 60_000,
  });

  const cities = useMemo(() => {
    const set = new Set<string>();
    partners.forEach((p) => p.city && set.add(p.city));
    return Array.from(set).sort();
  }, [partners]);

  const filteredPartners = useMemo(() => {
    if (!selectedCity) return partners;
    return partners.filter((p) => p.city === selectedCity);
  }, [partners, selectedCity]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  if (isLoading && partners.length === 0) {
    return (
      <ScreenContainer>
        <PageIntro
          title="Parceiros Adopet"
          subtitle="ONGs e instituições que apoiam a adoção responsável."
        />
        <View style={styles.loadingWrap}>
          <LoadingLogo size={120} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      scroll
      refreshControl={
        <RefreshControl refreshing={isRefetching && partners.length > 0} onRefresh={() => refetch()} tintColor={colors.primary} />
      }
    >
      <PageIntro
        title="Parceiros Adopet"
        subtitle="ONGs, clínicas e lojas parceiras. Veja cupons de desconto e contato. Parceiros com destaque têm selo no feed."
      />
      {partners.length === 0 ? (
        <EmptyState
          title="Nenhum parceiro no momento"
          message="Em breve teremos ONGs parceiras listadas aqui."
          icon={<Ionicons name="heart-outline" size={48} color={colors.textSecondary} />}
        />
      ) : (
        <>
          {cities.length > 0 && (
            <View style={styles.filterRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                <TouchableOpacity
                  style={[styles.chip, { backgroundColor: !selectedCity ? colors.primary : colors.surface }]}
                  onPress={() => setSelectedCity('')}
                >
                  <Text style={[styles.chipText, { color: !selectedCity ? '#fff' : colors.textPrimary }]}>Todos</Text>
                </TouchableOpacity>
                {cities.map((city) => (
                  <TouchableOpacity
                    key={city}
                    style={[styles.chip, { backgroundColor: selectedCity === city ? colors.primary : colors.surface }]}
                    onPress={() => setSelectedCity(city)}
                  >
                    <Text style={[styles.chipText, { color: selectedCity === city ? '#fff' : colors.textPrimary }]}>{city}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          {filteredPartners.length === 0 ? (
            <View style={[styles.emptyFilter, { backgroundColor: colors.surface }]}>
              <Text style={[styles.emptyFilterText, { color: colors.textSecondary }]}>
                Nenhum parceiro em {selectedCity}. Tente outra cidade ou "Todos".
              </Text>
            </View>
          ) : (
        <View style={styles.list}>
          {filteredPartners.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.card, { backgroundColor: colors.surface }]}
              onPress={() => router.push(`/partners/${p.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.cardNameRow}>
                {p.logoUrl ? (
                  <Image source={{ uri: p.logoUrl }} style={styles.cardLogo} resizeMode="contain" />
                ) : null}
                <View style={styles.cardNameWrap}>
                <Text style={[styles.cardName, { color: colors.textPrimary }]}>{p.name}</Text>
                {p.isPaidPartner ? (
                  <View style={[styles.paidBadge, { backgroundColor: colors.primary + '25' }]}>
                    <Ionicons name="star" size={12} color={colors.primary} />
                    <Text style={[styles.paidBadgeText, { color: colors.primary }]}>Destaque</Text>
                  </View>
                ) : null}
                </View>
              </View>
              {p.city ? (
                <Text style={[styles.cardCity, { color: colors.textSecondary }]}>
                  <Ionicons name="location-outline" size={14} /> {p.city}
                </Text>
              ) : null}
              {p.description ? (
                <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={4}>
                  {p.description}
                </Text>
              ) : null}
              <View style={styles.cardFooter}>
                {p.website ? (
                  <TouchableOpacity
                    style={[styles.linkBtn, { borderColor: colors.primary }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      Linking.openURL(p.website!.startsWith('http') ? p.website! : `https://${p.website}`);
                    }}
                  >
                    <Ionicons name="open-outline" size={16} color={colors.primary} />
                    <Text style={[styles.linkText, { color: colors.primary }]}>Abrir site</Text>
                  </TouchableOpacity>
                ) : null}
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={styles.chevron} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  filterRow: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  filterScroll: { flexDirection: 'row', gap: spacing.sm },
  chip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 20 },
  chipText: { fontSize: 14, fontWeight: '600' },
  emptyFilter: { marginHorizontal: spacing.lg, padding: spacing.lg, borderRadius: 12 },
  emptyFilterText: { fontSize: 14, textAlign: 'center' },
  list: { padding: spacing.lg, paddingBottom: spacing.xl },
  card: {
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs },
  cardLogo: { width: 48, height: 48, borderRadius: 10, marginRight: spacing.sm, backgroundColor: 'rgba(0,0,0,0.06)' },
  cardNameWrap: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 17, fontWeight: '700' },
  paidBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  paidBadgeText: { fontSize: 11, fontWeight: '700' },
  cardCity: { fontSize: 13, marginBottom: spacing.sm },
  cardDesc: { fontSize: 14, lineHeight: 20, marginBottom: spacing.sm },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chevron: { marginLeft: spacing.sm },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  linkText: { fontSize: 14, fontWeight: '600' },
});
