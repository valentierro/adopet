import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, Linking, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenContainer, PrimaryButton, LoadingLogo, PartnerPanelLayout } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { getMyPartner, createPartnerCheckoutSession, createPartnerBillingPortalSession } from '../src/api/partner';
import { useQueryClient } from '@tanstack/react-query';
import { spacing } from '../src/theme';

const PLAN_LABELS: Record<string, string> = {
  BASIC: 'Plano Parceiro - R$ 50/mês',
  DESTAQUE: 'Plano Parceiro - R$ 50/mês',
  PREMIUM: 'Plano Parceiro - R$ 50/mês',
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

export default function PartnerSubscriptionScreen() {
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const { data: partner, isLoading } = useQuery({ queryKey: ['me', 'partner'], queryFn: getMyPartner });
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'partner'] });
    }, [queryClient]),
  );

  const handlePayOrReactivate = async () => {
    if (!partner) return;
    setLoadingCheckout(true);
    try {
      const { url } = await createPartnerCheckoutSession({
        planId: (partner.planId as 'BASIC' | 'DESTAQUE' | 'PREMIUM') || 'BASIC',
        successUrl: 'adopet://partner-success',
        cancelUrl: 'adopet://partner-cancel',
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
      </ScreenContainer>
    );
  }
  if (!partner) {
    return null;
  }

  const statusLabel = partner.subscriptionStatus ? STATUS_LABELS[partner.subscriptionStatus] ?? partner.subscriptionStatus : partner.isPaidPartner ? 'Ativa' : 'Sem assinatura';
  const planLabel = partner.planId ? PLAN_LABELS[partner.planId] ?? partner.planId : '—';

  return (
    <ScreenContainer scroll={false}>
      <PartnerPanelLayout>
        <ScrollView style={styles.scrollWrap} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Plano atual</Text>
            <Text style={[styles.plan, { color: colors.textPrimary }]}>{planLabel}</Text>
            <View style={[styles.badge, { backgroundColor: partner.isPaidPartner ? colors.primary + '20' : colors.textSecondary + '20' }]}>
              <Text style={[styles.badgeText, { color: partner.isPaidPartner ? colors.primary : colors.textSecondary }]}>{statusLabel}</Text>
            </View>
          </View>
          <Text style={[styles.para, { color: colors.textSecondary }]}>
            {partner.isPaidPartner
              ? 'Sua assinatura está ativa. Use o botão abaixo para gerenciar forma de pagamento ou cancelar quando quiser.'
              : 'Conclua o pagamento para ativar seu portal de parceiro e publicar cupons de desconto para os usuários do app.'}
          </Text>
          {partner.isPaidPartner ? (
            <PrimaryButton title={loadingPortal ? 'Abrindo...' : 'Gerenciar assinatura / cancelar'} onPress={handleManageSubscription} disabled={loadingPortal} />
          ) : (
            <PrimaryButton title={loadingCheckout ? 'Abrindo...' : 'Ir para pagamento'} onPress={handlePayOrReactivate} disabled={loadingCheckout} />
          )}
        </ScrollView>
      </PartnerPanelLayout>
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
  para: { fontSize: 15, lineHeight: 22, marginBottom: spacing.xl },
});
