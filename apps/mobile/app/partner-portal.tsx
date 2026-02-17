import { useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, LoadingLogo, PartnerPanelLayout, ProfileMenuFooter } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { getMyPartner } from '../src/api/partner';
import { spacing } from '../src/theme';

export default function PartnerPortalScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data: partner, isLoading } = useQuery({
    queryKey: ['me', 'partner'],
    queryFn: getMyPartner,
  });

  if (isLoading && !partner) {
    return (
      <ScreenContainer>
        <LoadingLogo size={120} />
      </ScreenContainer>
    );
  }

  if (!partner) {
    return (
      <ScreenContainer>
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Nenhum estabelecimento</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Sua conta não está vinculada a um parceiro. Solicite uma parceria comercial para criar sua conta e acessar o portal.</Text>
        </View>
        <ProfileMenuFooter />
      </ScreenContainer>
    );
  }

  if (!partner.isPaidPartner && partner.type !== 'ONG') {
    return (
      <ScreenContainer>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {partner.logoUrl ? (
            <Image source={{ uri: partner.logoUrl }} style={styles.logo} contentFit="contain" />
          ) : null}
          <Text style={[styles.name, { color: colors.textPrimary }]}>{partner.name}</Text>
          <View style={[styles.badge, { backgroundColor: colors.textSecondary + '20' }]}>
            <Ionicons name="card-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.badgeText, { color: colors.textSecondary }]}>Assinatura inativa</Text>
          </View>
        </View>
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Portal indisponível</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Sua assinatura não está ativa. Renove para acessar o portal do parceiro novamente. Seu histórico será mantido.</Text>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: colors.primary }]}
            onPress={() => router.replace('/partner-subscription')}
          >
            <Text style={styles.ctaButtonText}>Renovar assinatura</Text>
          </TouchableOpacity>
        </View>
        <ProfileMenuFooter />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <PartnerPanelLayout showFooter={false}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {partner.logoUrl ? (
              <Image source={{ uri: partner.logoUrl }} style={styles.logo} contentFit="contain" />
            ) : null}
            <Text style={[styles.name, { color: colors.textPrimary }]}>{partner.name}</Text>
            <Text style={[styles.slug, { color: colors.textSecondary }]}>{partner.slug}</Text>
            <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name={partner.type === 'ONG' ? 'heart' : 'checkmark-circle'} size={18} color={colors.primary} />
              <Text style={[styles.badgeText, { color: colors.primary }]}>
                {partner.type === 'ONG' ? 'ONG' : 'Assinatura ativa'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.surface }]}
            onPress={() => router.push('/partner-edit')}
          >
            <Ionicons name="business-outline" size={22} color={colors.primary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Dados do estabelecimento</Text>
            <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
          </TouchableOpacity>
          {partner.type === 'ONG' ? (
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.surface }]}
              onPress={() => router.push('/partner-members')}
            >
              <Ionicons name="people-outline" size={22} color={colors.primary} />
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Membros da ONG</Text>
              <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
            </TouchableOpacity>
          ) : null}
          {partner.isPaidPartner ? (
            <>
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: colors.surface }]}
                onPress={() => router.push('/partner-coupons')}
              >
                <Ionicons name="pricetag-outline" size={22} color={colors.primary} />
                <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Cupons de desconto</Text>
                <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: colors.surface }]}
                onPress={() => router.push('/partner-services')}
              >
                <Ionicons name="construct-outline" size={22} color={colors.primary} />
                <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Serviços prestados</Text>
                <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: colors.surface }]}
                onPress={() => router.push('/partner-analytics')}
              >
                <Ionicons name="stats-chart-outline" size={22} color={colors.primary} />
                <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Analytics</Text>
                <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: colors.surface }]}
                onPress={() => router.push('/partner-subscription')}
              >
                <Ionicons name="card-outline" size={22} color={colors.primary} />
                <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Assinatura</Text>
                <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
              </TouchableOpacity>
            </>
          ) : null}

          <View style={[styles.thanksBox, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
            <Ionicons name="heart" size={22} color={colors.primary} style={styles.thanksIcon} />
            <Text style={[styles.thanksText, { color: colors.textPrimary }]}>
              Obrigado por fazer parte dessa rede. Sua parceria ajuda a conectar mais pets a um lar.
            </Text>
          </View>
        </ScrollView>
      </PartnerPanelLayout>
      <ProfileMenuFooter />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  logo: { width: 64, height: 64, borderRadius: 12, marginBottom: spacing.sm, backgroundColor: 'rgba(0,0,0,0.06)' },
  name: { fontSize: 18, fontWeight: '700', marginBottom: spacing.xs },
  slug: { fontSize: 14, marginBottom: spacing.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 13, fontWeight: '600' },
  empty: { padding: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  emptySub: { fontSize: 15, lineHeight: 22, marginBottom: spacing.lg },
  ctaButton: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: 12, alignSelf: 'flex-start' },
  ctaButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  menuLabel: { flex: 1, fontSize: 16 },
  menuArrow: { fontSize: 20 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xl },
  thanksBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
  },
  thanksIcon: { marginRight: spacing.sm, marginTop: 2 },
  thanksText: { flex: 1, fontSize: 15, lineHeight: 22, fontStyle: 'italic' },
});
