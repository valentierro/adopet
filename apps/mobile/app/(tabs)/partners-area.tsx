import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, EmptyState, LoadingLogo, PageIntro } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { getPartners } from '../../src/api/partners';
import type { Partner } from '../../src/api/partners';
import { spacing } from '../../src/theme';

const CATEGORIES: { value: '' | 'ONG' | 'CLINIC' | 'STORE'; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'CLINIC', label: 'Clínicas veterinárias' },
  { value: 'STORE', label: 'Pet shops e Lojas' },
  { value: 'ONG', label: 'ONGs' },
];

export default function PartnersAreaScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [category, setCategory] = useState<'' | 'ONG' | 'CLINIC' | 'STORE'>('');
  const { data: partners = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['partners', 'area', category || 'all'],
    queryFn: () => getPartners(category || undefined),
    staleTime: 5 * 60_000,
  });

  const filteredByCity = useMemo(() => partners, [partners]);

  return (
    <ScreenContainer scroll={false}>
      <PageIntro
        title="Ofertas dos parceiros"
        subtitle="Serviços e cupons de desconto por estabelecimento. Escolha uma categoria e veja ofertas."
      />

      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.value || 'all'}
              style={[styles.chip, { backgroundColor: category === cat.value ? colors.primary : colors.surface }]}
              onPress={() => setCategory(cat.value)}
            >
              <Text style={[styles.chipText, { color: category === cat.value ? '#fff' : colors.textPrimary }]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading && partners.length === 0 ? (
        <View style={styles.loadingWrap}>
          <LoadingLogo size={120} />
        </View>
      ) : filteredByCity.length === 0 ? (
        <EmptyState
          title="Nenhum parceiro nesta categoria"
          message="Altere o filtro ou confira outras categorias."
          icon={<Ionicons name="pricetag-outline" size={48} color={colors.textSecondary} />}
        />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
          }
        >
          {filteredByCity.map((p) => (
            <PartnerOfferCard key={p.id} partner={p} colors={colors} onPress={() => router.push(`/partners/${p.id}`)} />
          ))}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

function PartnerOfferCard({
  partner,
  colors,
  onPress,
}: {
  partner: Partner;
  colors: { textPrimary: string; textSecondary: string; primary: string };
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardTop}>
        {partner.logoUrl ? (
          <Image source={{ uri: partner.logoUrl }} style={styles.cardLogo} resizeMode="contain" />
        ) : (
          <View style={[styles.cardLogoPlaceholder, { backgroundColor: colors.primary + '18' }]}>
            <Ionicons name="business" size={28} color={colors.primary} />
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>{partner.name}</Text>
          {partner.city ? (
            <Text style={[styles.cardCity, { color: colors.textSecondary }]} numberOfLines={1}>
              <Ionicons name="location-outline" size={12} /> {partner.city}
            </Text>
          ) : null}
          <View style={[styles.ctaRow, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name={partner.type === 'ONG' ? 'heart-outline' : 'pricetag-outline'} size={16} color={colors.primary} />
            <Text style={[styles.ctaText, { color: colors.primary }]}>
              {partner.type === 'ONG' ? 'Conheça a ONG' : 'Ver serviços e cupons'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </View>
        </View>
      </View>
      {partner.isPaidPartner && (
        <View style={[styles.badge, { backgroundColor: colors.primary + '25' }]}>
          <Ionicons name="star" size={12} color={colors.primary} />
          <Text style={[styles.badgeText, { color: colors.primary }]}>Destaque</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  filterRow: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  filterScroll: { flexDirection: 'row', gap: spacing.sm },
  chip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 20 },
  chipText: { fontSize: 14, fontWeight: '600' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  scroll: { flex: 1 },
  list: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  card: {
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.md,
    position: 'relative',
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  cardLogo: { width: 56, height: 56, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.06)' },
  cardLogoPlaceholder: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, marginLeft: spacing.md, minWidth: 0 },
  cardName: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  cardCity: { fontSize: 13, marginBottom: spacing.sm },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
    marginTop: 4,
  },
  ctaText: { fontSize: 13, fontWeight: '600' },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
