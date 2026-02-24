import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, LoadingLogo, PartnerPanelLayout } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { getPartnerAnalytics } from '../src/api/partner';
import { spacing } from '../src/theme';

export default function PartnerAnalyticsScreen() {
  const { colors } = useTheme();
  const { data, isLoading } = useQuery({
    queryKey: ['me', 'partner', 'analytics'],
    queryFn: getPartnerAnalytics,
  });

  if (isLoading && !data) {
    return (
      <ScreenContainer>
        <LoadingLogo size={120} />
      </ScreenContainer>
    );
  }

  const analytics = data ?? {
    profileViews: 0,
    couponCopies: 0,
    byCoupon: [],
    marketplaceVisits: 0,
    marketplaceByService: [],
    marketplaceByCoupon: [],
  };

  return (
    <ScreenContainer scroll={false}>
      <PartnerPanelLayout>
        <ScrollView style={styles.scrollWrap} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Resumo (total acumulado)</Text>
      <View style={styles.cardsRow}>
        <View style={[styles.metricCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '35' }]}>
          <View style={[styles.metricIconWrap, { backgroundColor: colors.primary + '25' }]}>
            <Ionicons name="eye-outline" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{analytics.profileViews}</Text>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Visualizações da sua página</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '35' }]}>
          <View style={[styles.metricIconWrap, { backgroundColor: colors.primary + '25' }]}>
            <Ionicons name="pricetag-outline" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{analytics.couponCopies}</Text>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Cupons copiados</Text>
        </View>
      </View>
      <View style={[styles.cardsRow, { marginTop: 0 }]}>
        <View style={[styles.metricCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '35' }]}>
          <View style={[styles.metricIconWrap, { backgroundColor: colors.primary + '25' }]}>
            <Ionicons name="storefront-outline" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{analytics.marketplaceVisits}</Text>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Visitas pelo marketplace</Text>
        </View>
      </View>

      {analytics.byCoupon.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.lg }]}>Por cupom (cópias)</Text>
          <View style={styles.list}>
            {analytics.byCoupon.map((item) => (
              <View key={item.couponId} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.background }]}>
                <Text style={[styles.couponCode, { color: colors.primary }]}>{item.code}</Text>
                <Text style={[styles.couponCount, { color: colors.textPrimary }]}>{item.copies} cópia{item.copies !== 1 ? 's' : ''}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {analytics.marketplaceByService.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.lg }]}>Marketplace – por serviço</Text>
          <View style={styles.list}>
            {analytics.marketplaceByService.map((item) => (
              <View key={item.serviceId} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.background }]}>
                <Text style={[styles.couponCode, { color: colors.primary }]}>{item.name}</Text>
                <Text style={[styles.couponCount, { color: colors.textPrimary }]}>{item.visits} visita{item.visits !== 1 ? 's' : ''}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {analytics.marketplaceByCoupon.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.lg }]}>Marketplace – por cupom</Text>
          <View style={styles.list}>
            {analytics.marketplaceByCoupon.map((item) => (
              <View key={item.couponId} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.background }]}>
                <Text style={[styles.couponCode, { color: colors.primary }]}>{item.code}</Text>
                <Text style={[styles.couponCount, { color: colors.textPrimary }]}>{item.visits} visita{item.visits !== 1 ? 's' : ''}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <Text style={[styles.hint, { color: colors.textSecondary }]}>
          As visualizações são contabilizadas quando um usuário abre a sua página na aba Parceiros. Os cupons copiados são registrados quando alguém toca em "Copiar" no cupom. As visitas pelo marketplace são contabilizadas quando alguém abre sua página a partir de um serviço ou cupom no marketplace.
        </Text>
        </ScrollView>
      </PartnerPanelLayout>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollWrap: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xl },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  cardsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  metricCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
  },
  metricIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  metricValue: { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  metricLabel: { fontSize: 12, fontWeight: '600' },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  couponCode: { fontSize: 15, fontWeight: '700' },
  couponCount: { fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 13, lineHeight: 20, marginTop: spacing.xl, paddingHorizontal: spacing.xs },
});
