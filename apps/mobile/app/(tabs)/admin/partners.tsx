import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  type LayoutChangeEvent,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Toast, LoadingLogo } from '../../../src/components';
import { useTheme } from '../../../src/hooks/useTheme';
import {
  getAdminPartners,
  getAdminPartnerRecommendations,
  getAdminPartnershipRequests,
  updateAdminPartner,
  bulkApprovePartners,
  bulkRejectPartners,
  resendPartnerConfirmation,
  endAdminPartner,
  approvePartnershipRequest,
  rejectPartnershipRequest,
  type PartnershipRequestItem,
  type PartnerAdminItem,
  type PartnerRecommendationItem,
  type UpdatePartnerBody,
} from '../../../src/api/admin';
import { getFriendlyErrorMessage } from '../../../src/utils/errorMessage';
import { spacing } from '../../../src/theme';

function getPartnerTypeLabel(type: string | undefined): string {
  if (!type) return '';
  const u = type.toUpperCase();
  if (u === 'ONG') return 'ONG';
  if (u === 'CLINIC') return 'Clínica';
  if (u === 'STORE') return 'Loja';
  return type;
}

export default function AdminPartnersScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [partnershipRequestStatusFilter, setPartnershipRequestStatusFilter] = useState<
    'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
  >('PENDING');
  const [partnerTypeFilter, setPartnerTypeFilter] = useState<'ALL' | 'ONG' | 'CLINIC' | 'STORE'>('ONG');
  const [partnerRecommendationTypeFilter, setPartnerRecommendationTypeFilter] = useState<
    'ALL' | 'ONG' | 'CLINIC' | 'STORE'
  >('ALL');
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>([]);
  const [editingPartner, setEditingPartner] = useState<PartnerAdminItem | null>(null);
  const [rejectPartnerModal, setRejectPartnerModal] = useState<{ partner: PartnerAdminItem } | null>(null);
  const [rejectPartnerReason, setRejectPartnerReason] = useState('');
  const [bulkRejectReason, setBulkRejectReason] = useState('');
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
  const [rejectPartnershipRequestModal, setRejectPartnershipRequestModal] =
    useState<PartnershipRequestItem | null>(null);
  const [rejectPartnershipRequestReason, setRejectPartnershipRequestReason] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { data: partnersList = [], refetch: refetchPartners, isRefetching: refetchingPartners } = useQuery({
    queryKey: ['admin', 'partners'],
    queryFn: getAdminPartners,
  });
  const {
    data: partnerRecommendations = [],
    refetch: refetchPartnerRecommendations,
    isRefetching: refetchingPartnerRecommendations,
  } = useQuery({
    queryKey: ['admin', 'partner-recommendations'],
    queryFn: getAdminPartnerRecommendations,
  });
  const {
    data: partnershipRequestsList = [],
    refetch: refetchPartnershipRequests,
    isRefetching: refetchingPartnershipRequests,
  } = useQuery({
    queryKey: ['admin', 'partnership-requests'],
    queryFn: getAdminPartnershipRequests,
  });

  const pendingPartnerIds = useMemo(
    () =>
      selectedPartnerIds.filter((id) => {
        const p = partnersList.find((x: PartnerAdminItem) => x.id === id);
        return p && !p.approvedAt;
      }),
    [selectedPartnerIds, partnersList],
  );

  const approvePartnerMutation = useMutation({
    mutationFn: (id: string) => updateAdminPartner(id, { approve: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'partners'] });
      queryClient.invalidateQueries({ queryKey: ['partners', 'ONG'] });
      setToastMessage('Parceiro aprovado.');
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível aprovar.')),
  });

  const rejectPartnerMutation = useMutation({
    mutationFn: ({ id, rejectionReason }: { id: string; rejectionReason?: string }) =>
      updateAdminPartner(id, { reject: true, rejectionReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'partners'] });
      queryClient.invalidateQueries({ queryKey: ['partners', 'ONG'] });
      setToastMessage('Parceiro rejeitado.');
      setRejectPartnerModal(null);
      setRejectPartnerReason('');
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível rejeitar.')),
  });

  const bulkApprovePartnersMutation = useMutation({
    mutationFn: (ids: string[]) => bulkApprovePartners(ids),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'partners'] });
      queryClient.invalidateQueries({ queryKey: ['partners', 'ONG'] });
      setToastMessage(`${data.updated} parceiro(s) aprovado(s).`);
      setSelectedPartnerIds([]);
    },
    onError: (e: unknown) =>
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível aprovar em massa.')),
  });

  const bulkRejectPartnersMutation = useMutation({
    mutationFn: ({ ids, rejectionReason }: { ids: string[]; rejectionReason?: string }) =>
      bulkRejectPartners(ids, rejectionReason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'partners'] });
      queryClient.invalidateQueries({ queryKey: ['partners', 'ONG'] });
      setToastMessage(`${data.updated} parceiro(s) rejeitado(s).`);
      setSelectedPartnerIds([]);
      setShowBulkRejectModal(false);
      setBulkRejectReason('');
    },
    onError: (e: unknown) =>
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível rejeitar em massa.')),
  });

  const approvePartnershipRequestMutation = useMutation({
    mutationFn: (id: string) => approvePartnershipRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'partnership-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'partners'] });
      queryClient.invalidateQueries({ queryKey: ['partners', 'ONG'] });
      setToastMessage('Solicitação aprovada. Parceiro criado na lista.');
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível aprovar.')),
  });

  const rejectPartnershipRequestMutation = useMutation({
    mutationFn: ({ id, rejectionReason }: { id: string; rejectionReason?: string }) =>
      rejectPartnershipRequest(id, rejectionReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'partnership-requests'] });
      setToastMessage('Solicitação rejeitada.');
      setRejectPartnershipRequestModal(null);
      setRejectPartnershipRequestReason('');
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível rejeitar.')),
  });

  const updatePartnerMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePartnerBody }) => updateAdminPartner(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'partners'] });
      queryClient.invalidateQueries({ queryKey: ['partners', 'ONG'] });
      setToastMessage('Parceiro atualizado.');
      setEditingPartner(null);
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível salvar.')),
  });

  const endPartnerMutation = useMutation({
    mutationFn: (partnerId: string) => endAdminPartner(partnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'partners'] });
      queryClient.invalidateQueries({ queryKey: ['partners', 'ONG'] });
      setToastMessage(
        'Parceria encerrada. Se era pago, a assinatura foi cancelada ao final do período já pago (parceiro some do app quando o período terminar).',
      );
      setEditingPartner(null);
    },
    onError: (e: unknown) =>
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível encerrar a parceria.')),
  });

  const resendPartnerMutation = useMutation({
    mutationFn: (partnerId: string) => resendPartnerConfirmation(partnerId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'partners'] });
      const msg = data?.message ?? 'E-mail de confirmação reenviado com sucesso.';
      setToastMessage(msg);
      Alert.alert('Sucesso', msg);
    },
    onError: (e: unknown) =>
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível reenviar o e-mail.')),
  });

  const refreshing =
    refetchingPartners || refetchingPartnerRecommendations || refetchingPartnershipRequests;
  const onRefresh = () => {
    refetchPartners();
    refetchPartnerRecommendations();
    refetchPartnershipRequests();
  };

  const sectionLoading =
    partnersList.length === 0 &&
    partnerRecommendations.length === 0 &&
    partnershipRequestsList.length === 0 &&
    !refreshing;

  return (
    <ScreenContainer>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {sectionLoading ? (
          <View style={styles.sectionLoading}>
            <LoadingLogo size={80} />
          </View>
        ) : (
          <>
            {/* 1. Solicitações de parceria */}
            <View
              onLayout={(e: LayoutChangeEvent) => e.nativeEvent.layout.y}
              collapsable={false}
            >
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 0 }]}>
                Solicitações de parceria ({partnershipRequestsList.length})
              </Text>
              <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                Enviadas pelo formulário “Solicitar parceria”. Use Pendentes para ver as que aguardam decisão.
                Aprovar cria o parceiro e envia e-mail para definir senha; rejeitar registra o motivo.
              </Text>
              <View style={[styles.rowWrap, { marginBottom: spacing.sm, flexWrap: 'wrap', gap: spacing.xs }]}>
                {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          partnershipRequestStatusFilter === tab ? colors.primary + '30' : colors.surface,
                        borderWidth: 1,
                        borderColor:
                          partnershipRequestStatusFilter === tab ? colors.primary : colors.background,
                      },
                    ]}
                    onPress={() => setPartnershipRequestStatusFilter(tab)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color:
                            partnershipRequestStatusFilter === tab
                              ? colors.primary
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {tab === 'PENDING'
                        ? 'Pendentes'
                        : tab === 'APPROVED'
                          ? 'Aprovadas'
                          : tab === 'REJECTED'
                            ? 'Rejeitadas'
                            : 'Todas'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {(() => {
                const filteredPR =
                  partnershipRequestStatusFilter === 'ALL'
                    ? partnershipRequestsList
                    : partnershipRequestsList.filter(
                        (r: PartnershipRequestItem) => r.status === partnershipRequestStatusFilter,
                      );
                if (filteredPR.length === 0) {
                  return (
                    <View style={[styles.emptyBlock, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        {partnershipRequestsList.length === 0
                          ? 'Nenhuma solicitação no momento.'
                          : `Nenhuma solicitação ${
                              partnershipRequestStatusFilter === 'PENDING'
                                ? 'pendente'
                                : partnershipRequestStatusFilter === 'APPROVED'
                                  ? 'aprovada'
                                  : partnershipRequestStatusFilter === 'REJECTED'
                                    ? 'rejeitada'
                                    : 'nesse filtro'
                            }.`}
                      </Text>
                    </View>
                  );
                }
                return filteredPR.map((r: PartnershipRequestItem) => (
                  <View
                    key={r.id}
                    style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.background }]}
                  >
                    <Text style={[styles.adoptionPetName, { color: colors.textPrimary }]}>
                      {r.instituicao}
                    </Text>
                    <View style={[styles.rowWrap, { marginTop: spacing.xs }]}>
                      <View
                        style={[
                          styles.chip,
                          {
                            backgroundColor:
                              (r.tipo === 'ong' ? colors.primary : colors.accent || '#f59e0b') + '25',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            {
                              color: r.tipo === 'ong' ? colors.primary : colors.accent || '#f59e0b',
                            },
                          ]}
                        >
                          {r.tipo === 'ong' ? 'ONG' : 'Comercial'}
                        </Text>
                      </View>
                      {r.status === 'PENDING' && (
                        <View style={[styles.chip, { backgroundColor: (colors.accent || '#f59e0b') + '25' }]}>
                          <Text style={[styles.chipText, { color: colors.accent || '#f59e0b' }]}>
                            Pendente
                          </Text>
                        </View>
                      )}
                      {r.status === 'APPROVED' && (
                        <View style={[styles.chip, { backgroundColor: colors.primary + '25' }]}>
                          <Text style={[styles.chipText, { color: colors.primary }]}>Aprovado</Text>
                        </View>
                      )}
                      {r.status === 'REJECTED' && (
                        <View style={[styles.chip, { backgroundColor: (colors.error || '#dc2626') + '25' }]}>
                          <Text style={[styles.chipText, { color: colors.error || '#dc2626' }]}>
                            Rejeitado
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                      {r.nome} • {r.email} • {r.telefone}
                    </Text>
                    {r.mensagem ? (
                      <Text
                        style={[styles.bugReportComment, { color: colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        "{r.mensagem}"
                      </Text>
                    ) : null}
                    <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
                      {new Date(r.createdAt).toLocaleString('pt-BR')}
                    </Text>
                    {r.rejectionReason && r.status === 'REJECTED' && (
                      <Text
                        style={[
                          styles.cardMeta,
                          { color: colors.error || '#dc2626', marginTop: spacing.xs },
                        ]}
                      >
                        Motivo: {r.rejectionReason}
                      </Text>
                    )}
                    {r.status === 'PENDING' && (
                      <View
                        style={{
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          gap: spacing.xs,
                          marginTop: spacing.sm,
                        }}
                      >
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: colors.primary, alignSelf: 'flex-start' }]}
                          onPress={() => approvePartnershipRequestMutation.mutate(r.id)}
                          disabled={approvePartnershipRequestMutation.isPending}
                        >
                          {approvePartnershipRequestMutation.isPending ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Ionicons name="checkmark-circle" size={18} color="#fff" />
                          )}
                          <Text style={styles.actionBtnText}>Aprovar (cria parceiro)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.actionBtn,
                            { backgroundColor: colors.error || '#dc2626', alignSelf: 'flex-start' },
                          ]}
                          onPress={() => {
                            setRejectPartnershipRequestModal(r);
                            setRejectPartnershipRequestReason('');
                          }}
                          disabled={rejectPartnershipRequestMutation.isPending}
                        >
                          <Ionicons name="close-circle" size={18} color="#fff" />
                          <Text style={styles.actionBtnText}>Rejeitar</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ));
              })()}
            </View>

            {/* 2. Parceiros */}
            <View
              onLayout={(e: LayoutChangeEvent) => e.nativeEvent.layout.y}
              collapsable={false}
            >
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: spacing.xl }]}>
                Parceiros ({partnersList.length})
              </Text>
              <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                ONGs, clínicas e lojas. Parceiros ainda não aprovados exibem Aprovar e Rejeitar. Ações em
                massa abaixo.
              </Text>
              <View style={[styles.rowWrap, { marginBottom: spacing.sm, flexWrap: 'wrap', gap: spacing.xs }]}>
                {(['ALL', 'ONG', 'CLINIC', 'STORE'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: partnerTypeFilter === t ? colors.primary + '30' : colors.surface,
                        borderWidth: 1,
                        borderColor: partnerTypeFilter === t ? colors.primary : colors.background,
                      },
                    ]}
                    onPress={() => {
                      setPartnerTypeFilter(t);
                      setSelectedPartnerIds([]);
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: partnerTypeFilter === t ? colors.primary : colors.textSecondary },
                      ]}
                    >
                      {t === 'ALL' ? 'Todos' : getPartnerTypeLabel(t)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {pendingPartnerIds.length > 0 && (
                <View
                  style={[
                    styles.batchBar,
                    {
                      backgroundColor: colors.background,
                      marginBottom: spacing.md,
                    },
                  ]}
                >
                  <Text style={[styles.batchLabel, { color: colors.textPrimary }]}>
                    {pendingPartnerIds.length} selecionado(s)
                  </Text>
                  <View style={styles.batchActions}>
                    <TouchableOpacity
                      style={[styles.batchBtn, { backgroundColor: colors.primary }]}
                      onPress={() => bulkApprovePartnersMutation.mutate(pendingPartnerIds)}
                      disabled={bulkApprovePartnersMutation.isPending}
                    >
                      {bulkApprovePartnersMutation.isPending ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons name="checkmark-done" size={18} color="#fff" />
                      )}
                      <Text style={styles.batchBtnText}>Aprovar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.batchBtn, { backgroundColor: colors.error || '#dc2626' }]}
                      onPress={() => setShowBulkRejectModal(true)}
                      disabled={bulkRejectPartnersMutation.isPending}
                    >
                      <Ionicons name="close-circle" size={18} color="#fff" />
                      <Text style={styles.batchBtnText}>Rejeitar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {(() => {
                const filtered =
                  partnerTypeFilter === 'ALL'
                    ? partnersList
                    : partnersList.filter((p: PartnerAdminItem) => p.type === partnerTypeFilter);
                if (filtered.length === 0) {
                  return (
                    <View style={[styles.emptyBlock, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        {partnersList.length === 0
                          ? 'Nenhum parceiro cadastrado.'
                          : `Nenhum parceiro do tipo ${getPartnerTypeLabel(partnerTypeFilter)}.`}
                      </Text>
                    </View>
                  );
                }
                return filtered.map((p: PartnerAdminItem) => {
                  const canSelectForApproveReject = !p.approvedAt;
                  const isSelected = selectedPartnerIds.includes(p.id);
                  return (
                    <View
                      key={p.id}
                      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.background }]}
                    >
                      <View style={styles.cardRowWrap}>
                        {canSelectForApproveReject ? (
                          <TouchableOpacity
                            onPress={() =>
                              setSelectedPartnerIds((prev) =>
                                isSelected ? prev.filter((id) => id !== p.id) : [...prev, p.id],
                              )
                            }
                            style={{ paddingRight: spacing.sm, paddingVertical: 4 }}
                          >
                            <View
                              style={[
                                styles.checkbox,
                                isSelected && { backgroundColor: colors.primary },
                              ]}
                            >
                              {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                            </View>
                          </TouchableOpacity>
                        ) : (
                          <View style={{ width: 22, marginRight: spacing.sm }} />
                        )}
                        {p.logoUrl ? (
                          <ExpoImage
                            source={{ uri: p.logoUrl }}
                            style={styles.partnerCardLogo}
                            contentFit="contain"
                          />
                        ) : null}
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[styles.adoptionPetName, { color: colors.textPrimary }]}>
                            {p.name}
                          </Text>
                          <View style={[styles.rowWrap, { marginTop: 2 }]}>
                            <View
                              style={[
                                styles.chip,
                                { backgroundColor: colors.primary + '25', alignSelf: 'flex-start' },
                              ]}
                            >
                              <Text style={[styles.chipText, { color: colors.primary }]}>
                                {getPartnerTypeLabel(p.type)}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                            {p.approvedAt
                              ? p.activatedAt
                                ? 'Aprovado • Ativo'
                                : 'Aprovado • Aguardando primeiro acesso'
                              : 'Não aprovado'}
                          </Text>
                          {p.city ? (
                            <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>{p.city}</Text>
                          ) : null}
                          {p.description ? (
                            <Text
                              style={[styles.cardMeta, { color: colors.textSecondary }]}
                              numberOfLines={2}
                            >
                              {p.description}
                            </Text>
                          ) : null}
                          <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
                            {new Date(p.createdAt).toLocaleString('pt-BR')}
                          </Text>
                          {p.rejectionReason ? (
                            <View
                              style={[
                                styles.resolvedBadge,
                                {
                                  backgroundColor: (colors.error || '#dc2626') + '20',
                                  alignSelf: 'flex-start',
                                  marginTop: spacing.xs,
                                },
                              ]}
                            >
                              <Ionicons name="close-circle" size={14} color={colors.error || '#dc2626'} />
                              <Text
                                style={[styles.resolvedText, { color: colors.error || '#dc2626' }]}
                                numberOfLines={2}
                              >
                                Rejeitado: {p.rejectionReason}
                              </Text>
                            </View>
                          ) : null}
                          {p.isPaidPartner ? (
                            <View
                              style={[
                                styles.resolvedBadge,
                                {
                                  backgroundColor: (colors.accent || '#f59e0b') + '25',
                                  alignSelf: 'flex-start',
                                  marginTop: spacing.xs,
                                  marginRight: spacing.xs,
                                },
                              ]}
                            >
                              <Ionicons name="star" size={14} color={colors.accent || '#f59e0b'} />
                              <Text style={[styles.resolvedText, { color: colors.accent || '#f59e0b' }]}>
                                Pago
                              </Text>
                            </View>
                          ) : null}
                          {!p.approvedAt && (
                            <View
                              style={{
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                gap: spacing.xs,
                                marginTop: spacing.sm,
                              }}
                            >
                              <TouchableOpacity
                                style={[
                                  styles.actionBtn,
                                  { backgroundColor: colors.primary, alignSelf: 'flex-start' },
                                ]}
                                onPress={() => approvePartnerMutation.mutate(p.id)}
                                disabled={approvePartnerMutation.isPending}
                              >
                                {approvePartnerMutation.isPending ? (
                                  <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                                )}
                                <Text style={styles.actionBtnText}>Aprovar</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  styles.actionBtn,
                                  {
                                    backgroundColor: colors.error || '#dc2626',
                                    alignSelf: 'flex-start',
                                  },
                                ]}
                                onPress={() => {
                                  setRejectPartnerModal({ partner: p });
                                  setRejectPartnerReason('');
                                }}
                                disabled={rejectPartnerMutation.isPending}
                              >
                                <Ionicons name="close-circle" size={18} color="#fff" />
                                <Text style={styles.actionBtnText}>Rejeitar</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                          <View
                            style={{
                              flexDirection: 'row',
                              flexWrap: 'wrap',
                              gap: spacing.xs,
                              marginTop: spacing.sm,
                            }}
                          >
                            <TouchableOpacity
                              style={[styles.actionBtn, { backgroundColor: colors.background }]}
                              onPress={() => setEditingPartner(p)}
                            >
                              <Ionicons name="pencil" size={18} color={colors.textPrimary} />
                              <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>
                                Editar
                              </Text>
                            </TouchableOpacity>
                            {(p.approvedAt || p.isPaidPartner) && p.active ? (
                              <TouchableOpacity
                                style={[
                                  styles.actionBtn,
                                  { backgroundColor: colors.error || '#dc2626' },
                                ]}
                                onPress={() => {
                                  Alert.alert(
                                    'Encerrar parceria',
                                    p.isPaidPartner
                                      ? `${p.name}: a assinatura será cancelada ao final do período já pago. Confirma?`
                                      : `${p.name} deixará de aparecer no app agora. Confirma?`,
                                    [
                                      { text: 'Cancelar', style: 'cancel' },
                                      {
                                        text: 'Encerrar',
                                        style: 'destructive',
                                        onPress: () => endPartnerMutation.mutate(p.id),
                                      },
                                    ],
                                  );
                                }}
                                disabled={endPartnerMutation.isPending}
                              >
                                {endPartnerMutation.isPending ? (
                                  <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                  <Ionicons name="close-circle" size={18} color="#fff" />
                                )}
                                <Text style={styles.actionBtnText}>Encerrar parceria</Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                });
              })()}
            </View>

            {/* 3. Indicações de parceiros */}
            <View
              onLayout={(e: LayoutChangeEvent) => e.nativeEvent.layout.y}
              collapsable={false}
            >
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: spacing.xl }]}>
                Indicações de parceiros ({partnerRecommendations.length})
              </Text>
              <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                Indicações enviadas pelos usuários (ONG, clínica ou loja). Apenas leitura.
              </Text>
              <View style={[styles.rowWrap, { marginBottom: spacing.sm, flexWrap: 'wrap', gap: spacing.xs }]}>
                {(['ALL', 'ONG', 'CLINIC', 'STORE'] as const).map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          partnerRecommendationTypeFilter === tab ? colors.primary + '30' : colors.surface,
                        borderWidth: 1,
                        borderColor:
                          partnerRecommendationTypeFilter === tab ? colors.primary : colors.background,
                      },
                    ]}
                    onPress={() => setPartnerRecommendationTypeFilter(tab)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color:
                            partnerRecommendationTypeFilter === tab
                              ? colors.primary
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {tab === 'ALL' ? 'Todos' : getPartnerTypeLabel(tab)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {(() => {
                const filteredRec =
                  partnerRecommendationTypeFilter === 'ALL'
                    ? partnerRecommendations
                    : partnerRecommendations.filter(
                        (r: PartnerRecommendationItem) =>
                          r.suggestedType === partnerRecommendationTypeFilter,
                      );
                if (filteredRec.length === 0) {
                  return (
                    <View style={[styles.emptyBlock, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        {partnerRecommendations.length === 0
                          ? 'Nenhuma indicação ainda.'
                          : `Nenhuma indicação do tipo ${getPartnerTypeLabel(partnerRecommendationTypeFilter)}.`}
                      </Text>
                    </View>
                  );
                }
                return filteredRec.map((r: PartnerRecommendationItem) => (
                  <View
                    key={r.id}
                    style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.background }]}
                  >
                    <Text
                      style={[
                        styles.sectionTitle,
                        { color: colors.textPrimary, fontSize: 16, marginTop: 0 },
                      ]}
                    >
                      {r.suggestedName}
                    </Text>
                    <View style={styles.rowWrap}>
                      <View style={[styles.chip, { backgroundColor: colors.primary + '25' }]}>
                        <Text style={[styles.chipText, { color: colors.primary }]}>
                          {getPartnerTypeLabel(r.suggestedType)}
                        </Text>
                      </View>
                      {r.suggestedCity ? (
                        <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                          {r.suggestedCity}
                        </Text>
                      ) : null}
                    </View>
                    {(r.suggestedEmail ?? r.suggestedPhone) && (
                      <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                        {[r.suggestedEmail, r.suggestedPhone].filter(Boolean).join(' • ')}
                      </Text>
                    )}
                    {r.message ? (
                      <Text
                        style={[styles.bugReportComment, { color: colors.textSecondary }]}
                        numberOfLines={4}
                      >
                        "{r.message}"
                      </Text>
                    ) : null}
                    <Text style={[styles.cardMeta, { color: colors.textSecondary, marginTop: 4 }]}>
                      Indicado por: {r.indicadorName ?? '—'}
                      {r.indicadorEmail ? ` (${r.indicadorEmail})` : ''}
                    </Text>
                    <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
                      {new Date(r.createdAt).toLocaleString('pt-BR')}
                    </Text>
                  </View>
                ));
              })()}
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal: Rejeitar solicitação de parceria */}
      <Modal visible={!!rejectPartnershipRequestModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, padding: spacing.lg }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Rejeitar solicitação
              {rejectPartnershipRequestModal
                ? ` – ${rejectPartnershipRequestModal.instituicao}`
                : ''}
            </Text>
            <Text
              style={[styles.modalLabel, { color: colors.textSecondary, marginTop: spacing.sm }]}
            >
              Motivo da rejeição (opcional)
            </Text>
            <TextInput
              style={[
                styles.searchInput,
                styles.feedbackInput,
                {
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                  borderColor: colors.primary + '40',
                  marginTop: spacing.xs,
                },
              ]}
              placeholder="Ex.: documentação incompleta"
              placeholderTextColor={colors.textSecondary}
              value={rejectPartnershipRequestReason}
              onChangeText={setRejectPartnershipRequestReason}
              multiline
              numberOfLines={3}
            />
            <View style={[styles.modalActions, { marginTop: spacing.lg }]}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.background }]}
                onPress={() => {
                  setRejectPartnershipRequestModal(null);
                  setRejectPartnershipRequestReason('');
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.error || '#dc2626' }]}
                onPress={() => {
                  if (rejectPartnershipRequestModal) {
                    rejectPartnershipRequestMutation.mutate({
                      id: rejectPartnershipRequestModal.id,
                      rejectionReason: rejectPartnershipRequestReason.trim() || undefined,
                    });
                  }
                }}
                disabled={rejectPartnershipRequestMutation.isPending}
              >
                <Text style={styles.modalBtnTextPrimary}>
                  {rejectPartnershipRequestMutation.isPending ? 'Rejeitando...' : 'Rejeitar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Rejeitar um parceiro */}
      <Modal visible={!!rejectPartnerModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, padding: spacing.lg }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Rejeitar parceria{rejectPartnerModal ? ` – ${rejectPartnerModal.partner.name}` : ''}
            </Text>
            <Text
              style={[styles.modalLabel, { color: colors.textSecondary, marginTop: spacing.sm }]}
            >
              Motivo da rejeição (opcional)
            </Text>
            <TextInput
              style={[
                styles.searchInput,
                styles.feedbackInput,
                {
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                  borderColor: colors.primary + '40',
                  marginTop: spacing.xs,
                },
              ]}
              placeholder="Ex.: documentação incompleta"
              placeholderTextColor={colors.textSecondary}
              value={rejectPartnerReason}
              onChangeText={setRejectPartnerReason}
              multiline
              numberOfLines={3}
            />
            <View style={[styles.modalActions, { marginTop: spacing.lg }]}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.background }]}
                onPress={() => {
                  setRejectPartnerModal(null);
                  setRejectPartnerReason('');
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.error || '#dc2626' }]}
                onPress={() => {
                  if (rejectPartnerModal) {
                    rejectPartnerMutation.mutate({
                      id: rejectPartnerModal.partner.id,
                      rejectionReason: rejectPartnerReason.trim() || undefined,
                    });
                  }
                }}
                disabled={rejectPartnerMutation.isPending}
              >
                <Text style={styles.modalBtnTextPrimary}>
                  {rejectPartnerMutation.isPending ? 'Rejeitando...' : 'Rejeitar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Rejeitar em massa */}
      <Modal visible={showBulkRejectModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, padding: spacing.lg }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Rejeitar {pendingPartnerIds.length} parceiro(s) selecionado(s)
            </Text>
            <Text
              style={[styles.modalLabel, { color: colors.textSecondary, marginTop: spacing.sm }]}
            >
              Motivo da rejeição (opcional, mesmo motivo para todos)
            </Text>
            <TextInput
              style={[
                styles.searchInput,
                styles.feedbackInput,
                {
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                  borderColor: colors.primary + '40',
                  marginTop: spacing.xs,
                },
              ]}
              placeholder="Ex.: documentação incompleta"
              placeholderTextColor={colors.textSecondary}
              value={bulkRejectReason}
              onChangeText={setBulkRejectReason}
              multiline
              numberOfLines={3}
            />
            <View style={[styles.modalActions, { marginTop: spacing.lg }]}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.background }]}
                onPress={() => {
                  setShowBulkRejectModal(false);
                  setBulkRejectReason('');
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.error || '#dc2626' }]}
                onPress={() =>
                  bulkRejectPartnersMutation.mutate({
                    ids: pendingPartnerIds,
                    rejectionReason: bulkRejectReason.trim() || undefined,
                  })
                }
                disabled={bulkRejectPartnersMutation.isPending}
              >
                <Text style={styles.modalBtnTextPrimary}>
                  {bulkRejectPartnersMutation.isPending ? 'Rejeitando...' : 'Rejeitar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Editar parceiro (simplificado – só visualização + Fechar) */}
      <Modal visible={!!editingPartner} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, padding: spacing.lg }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Parceiro{editingPartner ? ` – ${editingPartner.name}` : ''}
            </Text>
            {editingPartner ? (
              <View style={{ marginBottom: spacing.md }}>
                <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                  Tipo: {getPartnerTypeLabel(editingPartner.type)}
                </Text>
                {editingPartner.city ? (
                  <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                    Cidade: {editingPartner.city}
                  </Text>
                ) : null}
                {editingPartner.email ? (
                  <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                    E-mail: {editingPartner.email}
                  </Text>
                ) : null}
                {editingPartner.phone ? (
                  <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                    Telefone: {editingPartner.phone}
                  </Text>
                ) : null}
                <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                  Status:{' '}
                  {editingPartner.approvedAt
                    ? editingPartner.activatedAt
                      ? 'Aprovado e ativo'
                      : 'Aprovado, aguardando primeiro acesso'
                    : 'Não aprovado'}
                </Text>
                {editingPartner.canResendConfirmation ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.primary, marginTop: spacing.sm }]}
                    onPress={() => resendPartnerMutation.mutate(editingPartner.id)}
                    disabled={resendPartnerMutation.isPending}
                  >
                    <Ionicons name="mail" size={18} color="#fff" />
                    <Text style={styles.actionBtnText}>Reenviar e-mail de confirmação</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.background }]}
                onPress={() => setEditingPartner(null)}
              >
                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.xs },
  sectionSub: { fontSize: 13, marginBottom: spacing.md },
  sectionLoading: { paddingVertical: spacing.xl, alignItems: 'center', justifyContent: 'center', minHeight: 120 },
  emptyBlock: { padding: spacing.lg, borderRadius: 12, marginBottom: spacing.sm },
  emptyText: { fontSize: 14 },
  card: { padding: spacing.md, borderRadius: 12, borderWidth: 1, marginBottom: spacing.sm },
  cardRowWrap: { flexDirection: 'row', alignItems: 'center' },
  cardMeta: { fontSize: 13 },
  cardDate: { fontSize: 12, marginTop: 4 },
  adoptionPetName: { fontSize: 16, fontWeight: '600', flex: 1, minWidth: 0 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 20 },
  chipText: { fontSize: 13, fontWeight: '600' },
  batchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  batchLabel: { fontSize: 13 },
  batchActions: { flexDirection: 'row', gap: spacing.xs },
  batchBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  batchBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.2)',
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerCardLogo: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  resolvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  resolvedText: { fontSize: 12, fontWeight: '600' },
  bugReportComment: { fontSize: 13, fontStyle: 'italic', marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: { borderRadius: 16, padding: spacing.lg, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  modalLabel: { fontSize: 12, fontWeight: '600', marginBottom: spacing.xs },
  searchInput: { padding: spacing.md, borderRadius: 10, fontSize: 16, marginBottom: spacing.sm, borderWidth: 1 },
  feedbackInput: { minHeight: 100, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  modalBtn: { flex: 1, padding: spacing.md, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { fontWeight: '600' },
  modalBtnTextPrimary: { color: '#fff', fontWeight: '600' },
});
