import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Linking, ScrollView, AppState } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenContainer, PrimaryButton, LoadingLogo, PartnerPanelLayout, ProfileMenuFooter } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { getMyPartner, createPartnerCheckoutSession, createPartnerBillingPortalSession, getPartnerSubscriptionDetails, getPartnerPaymentHistory } from '../src/api/partner';
import { useQueryClient } from '@tanstack/react-query';
import { spacing } from '../src/theme';

const LANDING_BASE = 'https://appadopet.com.br';

const PLAN_LABELS: Record<string, string> = {
  BASIC: 'Plano Parceiro - R$ 100/mês',
  DESTAQUE: 'Plano Parceiro - R$ 100/mês',
  PREMIUM: 'Plano Parceiro - R$ 100/mês',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativa',
  trialing: 'Período de teste',
  past_due: 'Pagamento pendente',
  canceled: 'Cancelada',
  cancelled: 'Cancelada',
  unpaid: 'Não pago',
  incomplete: 'Incompleta',
  incomplete_expired: 'Expirada',
  paused: 'Pausada',
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  paid: 'Pago',
  open: 'Aberto',
  draft: 'Rascunho',
  uncollectible: 'Inadimplente',
  void: 'Cancelado',
};

export default function PartnerSubscriptionScreen() {
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const { data: partner, isLoading } = useQuery({ queryKey: ['me', 'partner'], queryFn: getMyPartner });
  const { data: subscriptionDetails } = useQuery({
    queryKey: ['me', 'partner', 'subscription-details'],
    queryFn: getPartnerSubscriptionDetails,
    enabled: !!partner?.isPaidPartner,
  });
  const { data: paymentHistory } = useQuery({
    queryKey: ['me', 'partner', 'payment-history'],
    queryFn: getPartnerPaymentHistory,
    enabled: !!partner?.isPaidPartner,
  });
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);

  const refetchSubscriptionData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['me'] });
    queryClient.invalidateQueries({ queryKey: ['me', 'partner'] });
    queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'subscription-details'] });
    queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'payment-history'] });
  }, [queryClient]);

  useFocusEffect(useCallback(() => refetchSubscriptionData(), [refetchSubscriptionData]));

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refetchSubscriptionData();
    });
    return () => sub.remove();
  }, [refetchSubscriptionData]);

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return null;
    }
  };
  const lastPaymentLabel = formatDate(subscriptionDetails?.lastPaymentAt);
  const nextBillingLabel = formatDate(subscriptionDetails?.nextBillingAt);

  const handlePayOrReactivate = async () => {
    if (!partner) return;
    setLoadingCheckout(true);
    try {
      const { url } = await createPartnerCheckoutSession({
        planId: (partner.planId as 'BASIC' | 'DESTAQUE' | 'PREMIUM') || 'BASIC',
        successUrl: `${LANDING_BASE}/partner-success`,
        cancelUrl: `${LANDING_BASE}/partner-cancel`,
      });
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) Linking.openURL(url);
      else Alert.alert('Link de pagamento', 'Acesse pelo navegador ou computador para concluir o pagamento.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Erro', msg || 'Não foi possível abrir o pagamento.');
    } finally {
      setLoadingCheckout(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!partner) return;
    setLoadingPortal(true);
    try {
      const { url } = await createPartnerBillingPortalSession('adopet://partner-subscription');
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) Linking.openURL(url);
      else Alert.alert('Portal de assinatura', 'Acesse pelo navegador para gerenciar pagamento e cancelar.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('ASSINATURA_NAO_VINCULADA_STRIPE')) {
        Alert.alert(
          'Vincular assinatura ao Stripe',
          'Sua assinatura ainda não está vinculada ao pagamento. Use o botão "Ir para pagamento" e conclua o pagamento uma vez (em modo teste use o cartão 4242 4242 4242 4242) para poder gerenciar e cancelar pelo app.',
        );
      } else {
        Alert.alert('Erro', msg || 'Não foi possível abrir o portal.');
      }
    } finally {
      setLoadingPortal(false);
    }
  };

  if (isLoading && !partner) {
    return (
      <ScreenContainer>
        <LoadingLogo size={120} />
        <ProfileMenuFooter />
      </ScreenContainer>
    );
  }
  if (!partner) {
    return null;
  }

  const statusLabel = partner.subscriptionStatus ? STATUS_LABELS[partner.subscriptionStatus] ?? partner.subscriptionStatus : partner.isPaidPartner ? 'Ativa' : 'Sem assinatura';
  const planLabel = partner.planId ? PLAN_LABELS[partner.planId] ?? partner.planId : '—';

  const memberSinceLabel = formatDate(partner.approvedAt ?? partner.createdAt);

  return (
    <ScreenContainer scroll={false}>
      <PartnerPanelLayout showAppLogo={false} showFooter={false}>
        <ScrollView style={styles.scrollWrap} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Plano atual</Text>
            <Text style={[styles.plan, { color: colors.textPrimary }]}>{planLabel}</Text>
            <View style={[styles.badge, { backgroundColor: partner.isPaidPartner ? colors.primary + '20' : colors.textSecondary + '20' }]}>
              <Text style={[styles.badgeText, { color: partner.isPaidPartner ? colors.primary : colors.textSecondary }]}>{statusLabel}</Text>
            </View>
            {memberSinceLabel != null && (
              <Text style={[styles.billingLabel, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                Membro desde: <Text style={[styles.billingValue, { color: colors.textPrimary }]}>{memberSinceLabel}</Text>
              </Text>
            )}
            {partner.isPaidPartner && (
              <View style={[styles.billingRow, { borderTopColor: colors.textSecondary + '25' }]}>
                <Text style={[styles.billingLabel, { color: colors.textSecondary }]}>
                  Último pagamento: <Text style={[styles.billingValue, { color: colors.textPrimary }]}>{lastPaymentLabel ?? '—'}</Text>
                </Text>
                <Text style={[styles.billingLabel, { color: colors.textSecondary }]}>
                  Próximo vencimento: <Text style={[styles.billingValue, { color: colors.textPrimary }]}>{nextBillingLabel ?? '—'}</Text>
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.para, { color: colors.textSecondary }]}>
            {partner.isPaidPartner
              ? 'Sua assinatura está ativa. Use o botão abaixo para gerenciar forma de pagamento ou cancelar quando quiser.'
              : 'Conclua o pagamento para ativar seu portal de parceiro e publicar cupons de desconto para os usuários do app.'}
          </Text>
          {!partner.isPaidPartner && (
            <PrimaryButton title={loadingCheckout ? 'Abrindo...' : 'Ir para pagamento'} onPress={handlePayOrReactivate} disabled={loadingCheckout} />
          )}
          {partner.isPaidPartner && (
            <>
              {subscriptionDetails && (subscriptionDetails.lastPaymentAt != null || subscriptionDetails.nextBillingAt != null) ? (
                <PrimaryButton title={loadingPortal ? 'Abrindo...' : 'Gerenciar assinatura / cancelar'} onPress={handleManageSubscription} disabled={loadingPortal} />
              ) : (
                <>
                  <PrimaryButton title={loadingCheckout ? 'Abrindo...' : 'Ir para pagamento'} onPress={handlePayOrReactivate} disabled={loadingCheckout} />
                  <PrimaryButton title={loadingPortal ? 'Abrindo...' : 'Gerenciar assinatura / cancelar'} onPress={handleManageSubscription} disabled={loadingPortal} style={styles.secondButton} />
                </>
              )}
            </>
          )}

          {partner.isPaidPartner && (
            <View style={[styles.historyCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>Histórico de pagamentos</Text>
              {paymentHistory?.items && paymentHistory.items.length > 0 ? (
                paymentHistory.items.map((item, index) => (
                  <View key={`${item.paidAt}-${index}`} style={[styles.historyRow, { borderTopColor: colors.textSecondary + '20' }]}>
                    <View>
                      <Text style={[styles.historyDate, { color: colors.textSecondary }]}>{formatDate(item.paidAt) ?? '—'}</Text>
                      <Text style={[styles.historyStatus, { color: colors.textSecondary }]}>{INVOICE_STATUS_LABELS[item.status] ?? item.status}</Text>
                    </View>
                    <Text style={[styles.historyAmount, { color: colors.textPrimary }]}>{item.amountFormatted}</Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.historyEmpty, { color: colors.textSecondary }]}>Nenhum pagamento registrado no momento. Conclua o primeiro pagamento pelo botão "Ir para pagamento" para vincular sua assinatura e ver o histórico aqui.</Text>
              )}
            </View>
          )}
        </ScrollView>
      </PartnerPanelLayout>
      <ProfileMenuFooter />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollWrap: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xl },
  card: { padding: spacing.lg, borderRadius: 12, marginBottom: spacing.lg },
  label: { fontSize: 13, marginBottom: spacing.xs },
  plan: { fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  badge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 13, fontWeight: '600' },
  billingRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  billingLabel: { fontSize: 13, marginBottom: 2 },
  billingValue: { fontWeight: '600' },
  para: { fontSize: 15, lineHeight: 22, marginBottom: spacing.xl },
  secondButton: { marginTop: spacing.md },
  historyCard: {
    padding: spacing.lg,
    borderRadius: 12,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  historyTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.md },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  historyDate: { fontSize: 14 },
  historyStatus: { fontSize: 12, marginTop: 2 },
  historyAmount: { fontSize: 15, fontWeight: '600' },
  historyEmpty: { fontSize: 14, lineHeight: 20, fontStyle: 'italic' },
});
