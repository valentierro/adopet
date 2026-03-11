import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Modal, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, LoadingLogo, PartnerPanelLayout, ProfileMenuFooter, Toast } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { useToastWithDedupe } from '../src/hooks/useToastWithDedupe';
import { useClientConfig } from '../src/hooks/useClientConfig';
import {
  getMyPartner,
  leavePartner,
  leavePartnerAndRemoveMembers,
  getMyPartnerPetPartnershipRequests,
  getMyPartnerPetPartnerships,
  confirmPetPartnershipRequest,
  rejectPetPartnershipRequest,
  cancelPetPartnership,
} from '../src/api/partner';
import { getFriendlyErrorMessage } from '../src/utils/errorMessage';
import { spacing } from '../src/theme';

export default function PartnerPortalScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const { config: clientConfig } = useClientConfig();
  const { toastMessage, setToastMessage, showToast } = useToastWithDedupe();
  const [leaveAndRemoveConfirmVisible, setLeaveAndRemoveConfirmVisible] = useState(false);
  const { data: partner, isLoading } = useQuery({
    queryKey: ['me', 'partner'],
    queryFn: getMyPartner,
  });
  const { data: partnershipRequests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ['me', 'partner', 'pet-partnership-requests'],
    queryFn: getMyPartnerPetPartnershipRequests,
    enabled: !!partner,
  });
  const { data: partnerships = [], isLoading: loadingPartnerships } = useQuery({
    queryKey: ['me', 'partner', 'pet-partnerships'],
    queryFn: getMyPartnerPetPartnerships,
    enabled: !!partner,
  });
  const confirmRequestMutation = useMutation({
    mutationFn: confirmPetPartnershipRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'pet-partnership-requests'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'pet-partnerships'] });
    },
  });
  const rejectRequestMutation = useMutation({
    mutationFn: rejectPetPartnershipRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'pet-partnership-requests'] });
    },
  });
  const cancelPartnershipMutation = useMutation({
    mutationFn: cancelPetPartnership,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'pet-partnerships'] });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: leavePartner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'partner'] });
      router.replace('/partner-portal');
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível desvincular.'));
    },
  });

  const leaveAndRemoveMutation = useMutation({
    mutationFn: leavePartnerAndRemoveMembers,
    onSuccess: () => {
      setLeaveAndRemoveConfirmVisible(false);
      showToast('Desvinculado. Membros foram removidos.');
      queryClient.invalidateQueries({ queryKey: ['me', 'partner'] });
      router.replace('/partner-portal');
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível desvincular e remover membros.'));
    },
  });

  const handleLeavePartnership = () => {
    Alert.alert(
      'Desvincular minha ONG',
      'Ao desvincular, a ONG sairá da lista de parceiros e você perderá o acesso ao portal. Os membros da ONG continuarão no app (vinculados à ONG inativa). Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: () => leaveMutation.mutate(),
        },
      ],
    );
  };

  const handleLeaveAndRemoveMembers = () => setLeaveAndRemoveConfirmVisible(true);

  const handleConfirmLeaveAndRemove = () => leaveAndRemoveMutation.mutate();

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

  if (partner.type === 'ONG' && !partner.isOngAdmin) {
    return (
      <ScreenContainer>
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Acesso restrito</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Apenas o administrador da ONG pode acessar o portal do parceiro. Entre em contato com o admin da {partner.name} para gerenciar anúncios, formulários e solicitações.
          </Text>
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
      <PartnerPanelLayout showFooter={false} showAppLogo={false}>
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
            {(partner.approvedAt || partner.createdAt) && (
              <Text style={[styles.partnerSince, { color: colors.textSecondary }]}>
                Parceria desde {new Date(partner.approvedAt || partner.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </Text>
            )}
            <TouchableOpacity
              style={[styles.publicPageBtn, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
              onPress={() => router.push(`/partners/${partner.id}`)}
              activeOpacity={0.8}
            >
              <Ionicons name="open-outline" size={20} color={colors.primary} />
              <Text style={[styles.publicPageBtnText, { color: colors.primary }]}>Ver página pública</Text>
            </TouchableOpacity>
          </View>

          {(partnershipRequests.length > 0 || loadingRequests) && (
            <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Solicitações de parceria
                {partnershipRequests.length > 0 ? ` (${partnershipRequests.length})` : ''}
              </Text>
              {loadingRequests ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.md }} />
              ) : (
                partnershipRequests.map((req) => (
                  <View key={req.id} style={[styles.partnershipRow, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push(`/pet/${req.petId}`)}>
                      <View style={styles.partnershipRowContent}>
                        {req.petPhotoUrl ? (
                          <Image source={{ uri: req.petPhotoUrl }} style={styles.petThumb} contentFit="cover" />
                        ) : (
                          <View style={[styles.petThumb, { backgroundColor: colors.border }]} />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.petName, { color: colors.textPrimary }]} numberOfLines={1}>{req.petName}</Text>
                          <Text style={[styles.partnershipMeta, { color: colors.textSecondary }]}>
                            Solicitado por {req.requestedByName}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                    <View style={styles.partnershipActions}>
                      <TouchableOpacity
                        style={[styles.partnershipBtn, { backgroundColor: colors.primary }]}
                        onPress={() => {
                          Alert.alert('Aprovar parceria', `Aprovar exibição do selo da ${partner.name} no anúncio de ${req.petName}?`, [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Aprovar', onPress: () => confirmRequestMutation.mutate(req.id) },
                          ]);
                        }}
                        disabled={confirmRequestMutation.isPending}
                      >
                        <Text style={styles.partnershipBtnText}>Aprovar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.partnershipBtn, { backgroundColor: colors.error || '#DC2626' }]}
                        onPress={() => {
                          Alert.alert('Rejeitar', `Rejeitar parceria no anúncio de ${req.petName}?`, [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Rejeitar', style: 'destructive', onPress: () => rejectRequestMutation.mutate(req.id) },
                          ]);
                        }}
                        disabled={rejectRequestMutation.isPending}
                      >
                        <Text style={styles.partnershipBtnText}>Rejeitar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {(partnerships.length > 0 || loadingPartnerships) && (
            <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Anúncios em parceria</Text>
              {loadingPartnerships ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.md }} />
              ) : (
                partnerships.map((pp) => (
                  <View key={pp.id} style={[styles.partnershipRow, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push(`/pet/${pp.petId}`)}>
                      <View style={styles.partnershipRowContent}>
                        {pp.petPhotoUrl ? (
                          <Image source={{ uri: pp.petPhotoUrl }} style={styles.petThumb} contentFit="cover" />
                        ) : (
                          <View style={[styles.petThumb, { backgroundColor: colors.border }]} />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.petName, { color: colors.textPrimary }]} numberOfLines={1}>{pp.petName}</Text>
                          <Text style={[styles.partnershipMeta, { color: colors.textSecondary }]}>
                            Parceria desde {new Date(pp.confirmedAt).toLocaleDateString('pt-BR')}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.partnershipBtn, { backgroundColor: colors.error || '#DC2626', marginLeft: spacing.sm }]}
                      onPress={() => {
                        Alert.alert('Encerrar parceria', `Remover o selo da ${partner.name} do anúncio de ${pp.petName}? O tutor será notificado.`, [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Encerrar', style: 'destructive', onPress: () => cancelPartnershipMutation.mutate(pp.id) },
                        ]);
                      }}
                      disabled={cancelPartnershipMutation.isPending}
                    >
                      <Text style={styles.partnershipBtnText}>Encerrar</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.surface }]}
            onPress={() => router.push('/partner-edit')}
          >
            <Ionicons name="business-outline" size={22} color={colors.primary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Dados do estabelecimento</Text>
            <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
          </TouchableOpacity>
          {partner.type === 'ONG' ? (
            <>
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: colors.surface }]}
                onPress={() => router.push('/partner-adoption-forms')}
              >
                <Ionicons name="document-text-outline" size={22} color={colors.primary} />
                <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Formulários de adoção</Text>
                <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: colors.surface }]}
                onPress={() => router.push('/partner-my-pets')}
              >
                <Ionicons name="paw-outline" size={22} color={colors.primary} />
                <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Anúncios da ONG</Text>
                <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: colors.surface }]}
                onPress={() => router.push('/partner-adoption-requests')}
              >
                <Ionicons name="list-outline" size={22} color={colors.primary} />
                <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Solicitações de adoção</Text>
                <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: colors.surface }]}
                onPress={() => router.push('/partner-members')}
              >
                <Ionicons name="people-outline" size={22} color={colors.primary} />
                <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Membros da ONG</Text>
                <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: colors.surface }]}
                onPress={() => router.push({ pathname: '/partner-services', params: { ong: '1' } })}
              >
                <Ionicons name="heart-outline" size={22} color={colors.primary} />
                <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Serviços voluntários</Text>
                <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
              </TouchableOpacity>
            </>
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
              {partner.type !== 'ONG' ? (
                <TouchableOpacity
                  style={[styles.menuItem, { borderBottomColor: colors.surface }]}
                  onPress={() => router.push('/partner-services')}
                >
                  <Ionicons name="construct-outline" size={22} color={colors.primary} />
                  <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Serviços prestados</Text>
                  <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
                </TouchableOpacity>
              ) : null}
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

          {partner.type === 'ONG' && (
            <>
              <TouchableOpacity
                style={[styles.leaveItem, { borderColor: colors.error || '#DC2626', marginTop: spacing.xl }]}
                onPress={handleLeavePartnership}
                disabled={leaveMutation.isPending || leaveAndRemoveMutation.isPending}
              >
                <Ionicons name="exit-outline" size={22} color={colors.error || '#DC2626'} />
                <Text style={[styles.leaveLabel, { color: colors.error || '#DC2626' }]}>Desvincular minha ONG da parceria</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.leaveItem, { borderColor: colors.error || '#DC2626', marginTop: spacing.sm }]}
                onPress={handleLeaveAndRemoveMembers}
                disabled={leaveMutation.isPending || leaveAndRemoveMutation.isPending}
              >
                <Ionicons name="people-outline" size={22} color={colors.error || '#DC2626'} />
                <Text style={[styles.leaveLabel, { color: colors.error || '#DC2626' }]}>Desvincular e remover todos os membros</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </PartnerPanelLayout>
      <Modal visible={leaveAndRemoveConfirmVisible} transparent animationType="fade">
        <Pressable style={styles.deleteModalOverlay} onPress={() => !leaveAndRemoveMutation.isPending && setLeaveAndRemoveConfirmVisible(false)}>
          <Pressable style={[styles.deleteModalCard, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.deleteModalTitle, { color: colors.textPrimary }]}>Desvincular e remover todos os membros?</Text>
            <Text style={[styles.deleteModalMessage, { color: colors.textSecondary }]}>
              Você e todos os membros da ONG serão desvinculados. A ONG sairá da lista de parceiros. Os ex-membros continuarão no app como usuários comuns (sem vínculo com a ONG). Esta ação não pode ser desfeita.
            </Text>
            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={[styles.deleteModalBtn, { borderColor: colors.textSecondary, backgroundColor: 'transparent', marginRight: spacing.sm }]}
                onPress={() => !leaveAndRemoveMutation.isPending && setLeaveAndRemoveConfirmVisible(false)}
                disabled={leaveAndRemoveMutation.isPending}
              >
                <Text style={[styles.deleteModalBtnText, { color: colors.textPrimary, fontWeight: '600' }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalBtn, { borderColor: colors.error || '#B91C1C', backgroundColor: (colors.error || '#B91C1C') + '18', flex: 1 }]}
                onPress={handleConfirmLeaveAndRemove}
                disabled={leaveAndRemoveMutation.isPending}
              >
                {leaveAndRemoveMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.error || '#B91C1C'} />
                ) : (
                  <Text style={[styles.deleteModalBtnText, { color: colors.error || '#B91C1C', fontWeight: '600' }]}>Desvincular e remover</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      {toastMessage != null && <Toast message={toastMessage} onHide={() => setToastMessage(null)} />}
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
  partnerSince: { fontSize: 13, marginTop: spacing.sm },
  publicPageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
  },
  publicPageBtnText: { fontSize: 15, fontWeight: '600' },
  sectionCard: { padding: spacing.md, borderRadius: 12, marginBottom: spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.sm },
  partnershipRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1 },
  partnershipRowContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  petThumb: { width: 44, height: 44, borderRadius: 8, marginRight: spacing.sm },
  petName: { fontSize: 15, fontWeight: '600' },
  partnershipMeta: { fontSize: 12, marginTop: 2 },
  partnershipActions: { flexDirection: 'row', gap: spacing.xs },
  partnershipBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: 8 },
  partnershipBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
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
  leaveItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
  },
  leaveLabel: { fontSize: 16, fontWeight: '600' },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  deleteModalCard: { width: '100%', maxWidth: 400, borderRadius: 16, padding: spacing.lg },
  deleteModalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  deleteModalMessage: { fontSize: 14, lineHeight: 20, marginBottom: spacing.lg },
  deleteModalActions: { flexDirection: 'row', alignItems: 'center' },
  deleteModalBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  deleteModalBtnText: { fontSize: 16 },
});
