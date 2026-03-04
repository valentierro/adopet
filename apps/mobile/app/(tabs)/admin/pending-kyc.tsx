import { useState, useCallback, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
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
  Linking,
  Modal,
  Pressable,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Toast } from '../../../src/components';
import { useTheme } from '../../../src/hooks/useTheme';
import {
  getPendingKyc,
  getApprovedKyc,
  updateUserKyc,
  revokeUserKyc,
  bulkUpdateKyc,
  type PendingKycItem,
  type ApprovedKycItem,
} from '../../../src/api/admin';
import { getFriendlyErrorMessage } from '../../../src/utils/errorMessage';
import { spacing } from '../../../src/theme';

/** Formata CPF para exibição (xxx.xxx.xxx-xx). */
function formatCpfDisplay(digits: string | null | undefined): string {
  if (!digits || digits.length !== 11) return digits ?? '—';
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/** Retorna status por campo para o bullet: 'ok' | 'fail' | 'na'. Em NOT_EXTRACTED usa dados extraídos reais (ex.: data extraída = ok). */
function getBulletStatus(
  status: string | null | undefined,
  fraudSignal: string | null | undefined,
  item?: PendingKycItem | ApprovedKycItem | null,
): { data: 'ok' | 'fail' | 'na'; cpf: 'ok' | 'fail' | 'na'; rg: 'ok' | 'fail' | 'na'; nome: 'ok' | 'fail' | 'na' } {
  if (!status || status === 'PENDING') return { data: 'na', cpf: 'na', rg: 'na', nome: 'na' };
  if (status === 'NOT_EXTRACTED') {
    if (item != null) {
      return {
        data: item.kycExtractedBirthDate ? 'ok' : 'fail',
        cpf: item.kycExtractedCpf ? 'ok' : 'na',
        rg: item.kycExtractedDocNumber ? 'ok' : 'na',
        nome: item.kycExtractedName ? 'ok' : 'fail',
      };
    }
    return { data: 'fail', cpf: 'na', rg: 'na', nome: 'na' };
  }
  if (status === 'OK') return { data: 'ok', cpf: 'ok', rg: 'ok', nome: 'ok' };
  if (status === 'DIVERGENT' && item != null) {
    const normDigits = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '').trim();
    const sameDate = (a: string | null | undefined, b: string | null | undefined) =>
      a && b ? a.slice(0, 10) === b.slice(0, 10) : false;
    const data =
      item.kycExtractedBirthDate && item.birthDate
        ? sameDate(item.kycExtractedBirthDate, item.birthDate)
          ? 'ok'
          : 'fail'
        : fraudSignal === 'BIRTH_DATE_OR_AGE_DIVERGENT'
          ? 'fail'
          : 'na';
    const cpf =
      item.kycExtractedCpf != null && item.document != null
        ? normDigits(item.kycExtractedCpf) === normDigits(item.document)
          ? 'ok'
          : 'fail'
        : item.kycExtractedCpf != null || item.document != null
          ? 'na'
          : fraudSignal === 'CPF_DIVERGENT'
            ? 'fail'
            : 'na';
    const rg =
      item.kycExtractedDocNumber != null && item.rg != null
        ? normDigits(item.kycExtractedDocNumber) === normDigits(item.rg)
          ? 'ok'
          : 'fail'
        : item.kycExtractedDocNumber != null || item.rg != null
          ? 'na'
          : fraudSignal === 'RG_DIVERGENT'
            ? 'fail'
            : 'na';
    const nome =
      item.kycExtractedName != null && item.name != null
        ? fraudSignal === 'NAME_DIVERGENT'
          ? 'fail'
          : 'ok'
        : fraudSignal === 'NAME_DIVERGENT'
          ? 'fail'
          : 'na';
    return { data, cpf, rg, nome };
  }
  if (status === 'DIVERGENT') {
    switch (fraudSignal) {
      case 'BIRTH_DATE_OR_AGE_DIVERGENT':
        return { data: 'fail', cpf: 'na', rg: 'na', nome: 'na' };
      case 'NAME_DIVERGENT':
        return { data: 'ok', cpf: 'na', rg: 'na', nome: 'fail' };
      case 'CPF_DIVERGENT':
        return { data: 'ok', cpf: 'fail', rg: 'na', nome: 'ok' };
      case 'RG_DIVERGENT':
        return { data: 'ok', cpf: 'ok', rg: 'fail', nome: 'ok' };
      default:
        return { data: 'fail', cpf: 'na', rg: 'na', nome: 'na' };
    }
  }
  return { data: 'na', cpf: 'na', rg: 'na', nome: 'na' };
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

type Tab = 'pending' | 'approved';

export default function PendingKycScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'approved' ? 'approved' : 'pending');
  useEffect(() => {
    if (params.tab === 'approved') setTab('approved');
  }, [params.tab]);
  const [toast, setToast] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRejectReason, setBulkRejectReason] = useState('');
  const [showBulkReject, setShowBulkReject] = useState(false);
  const [approvedSearch, setApprovedSearch] = useState('');
  const [approvedSearchSubmit, setApprovedSearchSubmit] = useState('');
  const [revokeUserId, setRevokeUserId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const { data: pendingList = [], isLoading: pendingLoading, refetch: refetchPending, isRefetching: pendingRefetching } = useQuery({
    queryKey: ['admin', 'pending-kyc'],
    queryFn: getPendingKyc,
    enabled: tab === 'pending',
  });

  const { data: approvedList = [], isLoading: approvedLoading, refetch: refetchApproved, isRefetching: approvedRefetching } = useQuery({
    queryKey: ['admin', 'approved-kyc', approvedSearchSubmit],
    queryFn: () => getApprovedKyc(approvedSearchSubmit || undefined),
    enabled: tab === 'approved',
  });

  const updateKyc = useMutation({
    mutationFn: ({ userId, status, reason }: { userId: string; status: 'VERIFIED' | 'REJECTED'; reason?: string }) =>
      updateUserKyc(userId, status, reason),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-kyc'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      setRejectingUserId(null);
      setRejectReason('');
      setSelectedIds(new Set());
      setToast(status === 'VERIFIED' ? 'KYC aprovado.' : 'KYC rejeitado.');
    },
    onError: (err) => {
      setRejectingUserId(null);
      setToast(getFriendlyErrorMessage(err, 'Erro ao atualizar KYC.'));
    },
  });

  const bulkKyc = useMutation({
    mutationFn: ({ userIds, status, reason }: { userIds: string[]; status: 'VERIFIED' | 'REJECTED'; reason?: string }) =>
      bulkUpdateKyc(userIds, status, reason),
    onSuccess: (data, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-kyc'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      setSelectedIds(new Set());
      setShowBulkReject(false);
      setBulkRejectReason('');
      const errMsg = data.errors?.length ? ` ${data.errors.length} erro(s).` : '';
      setToast(status === 'VERIFIED' ? `${data.processed} aprovado(s).${errMsg}` : `${data.processed} rejeitado(s).${errMsg}`);
    },
    onError: (err) => {
      setToast(getFriendlyErrorMessage(err, 'Erro na ação em massa.'));
    },
  });

  const revokeKyc = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) => revokeUserKyc(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'approved-kyc'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      setRevokeUserId(null);
      setRevokeReason('');
      setToast('KYC revogado. O usuário foi notificado.');
    },
    onError: (err) => {
      setToast(getFriendlyErrorMessage(err, 'Erro ao revogar.'));
    },
  });

  const toggleSelect = useCallback((userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  const handleApprove = (item: PendingKycItem) => {
    Alert.alert('Aprovar KYC', `Aprovar verificação de identidade de ${item.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Aprovar', onPress: () => updateKyc.mutate({ userId: item.userId, status: 'VERIFIED' }) },
    ]);
  };

  const handleReject = (item: PendingKycItem) => {
    setRejectingUserId(item.userId);
    setRejectReason('');
  };

  const confirmReject = (userId: string) => {
    if (!rejectReason?.trim()) {
      setToast('Informe o motivo da rejeição.');
      return;
    }
    updateKyc.mutate({ userId, status: 'REJECTED', reason: rejectReason.trim() });
  };

  const cancelReject = () => {
    setRejectingUserId(null);
    setRejectReason('');
  };

  const handleBulkApprove = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    Alert.alert('Aprovar selecionados', `Aprovar ${ids.length} verificação(ões)?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Aprovar', onPress: () => bulkKyc.mutate({ userIds: ids, status: 'VERIFIED' }) },
    ]);
  };

  const handleBulkReject = () => {
    if (selectedIds.size === 0) return;
    setShowBulkReject(true);
    setBulkRejectReason('');
  };

  const confirmBulkReject = () => {
    const reason = bulkRejectReason?.trim();
    if (!reason) {
      setToast('Informe o motivo da rejeição.');
      return;
    }
    bulkKyc.mutate({ userIds: Array.from(selectedIds), status: 'REJECTED', reason });
  };

  const handleRevoke = (item: ApprovedKycItem) => {
    setRevokeUserId(item.userId);
    setRevokeReason('');
  };

  const confirmRevoke = () => {
    const reason = revokeReason?.trim();
    if (!revokeUserId || !reason) {
      setToast('Informe a justificativa da revogação.');
      return;
    }
    revokeKyc.mutate({ userId: revokeUserId, reason });
  };

  const isPending = updateKyc.isPending || bulkKyc.isPending || revokeKyc.isPending;
  const refetch = tab === 'pending' ? refetchPending : refetchApproved;
  const isRefetching = tab === 'pending' ? pendingRefetching : approvedRefetching;

  return (
    <ScreenContainer>
      <View style={[styles.tabRow, { borderBottomColor: colors.textSecondary + '30' }]}>
        <TouchableOpacity
          style={[styles.tab, tab === 'pending' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setTab('pending')}
        >
          <Text style={[styles.tabText, { color: tab === 'pending' ? colors.primary : colors.textSecondary }]}>Pendentes</Text>
          {pendingList.length > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{pendingList.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'approved' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setTab('approved')}
        >
          <Text style={[styles.tabText, { color: tab === 'approved' ? colors.primary : colors.textSecondary }]}>Aprovados</Text>
        </TouchableOpacity>
      </View>

      {tab === 'approved' && (
        <View style={[styles.searchRow, { backgroundColor: colors.background }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Buscar por nome, e-mail ou usuário"
            placeholderTextColor={colors.textSecondary}
            value={approvedSearch}
            onChangeText={setApprovedSearch}
            onSubmitEditing={() => setApprovedSearchSubmit(approvedSearch.trim())}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={[styles.searchBtn, { backgroundColor: colors.primary }]}
            onPress={() => setApprovedSearchSubmit(approvedSearch.trim())}
          >
            <Text style={styles.searchBtnText}>Buscar</Text>
          </TouchableOpacity>
        </View>
      )}

      {tab === 'pending' && selectedIds.size > 0 && (
        <View style={[styles.bulkBar, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
          <Text style={[styles.bulkLabel, { color: colors.textPrimary }]}>{selectedIds.size} selecionado(s)</Text>
          <View style={styles.bulkActions}>
            <TouchableOpacity
              style={[styles.bulkBtn, { backgroundColor: colors.primary + '30' }]}
              onPress={handleBulkApprove}
              disabled={isPending}
            >
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              <Text style={[styles.bulkBtnText, { color: colors.primary }]}>Aprovar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkBtn, { backgroundColor: '#dc3545' + '30' }]}
              onPress={handleBulkReject}
              disabled={isPending}
            >
              <Ionicons name="close-circle" size={18} color="#dc3545" />
              <Text style={[styles.bulkBtnText, { color: '#dc3545' }]}>Rejeitar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'pending' && (
          <>
            {pendingLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : pendingList.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textSecondary }]}>Nenhum KYC pendente no momento.</Text>
            ) : (
              <>
                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                  Decisão humana. Selecione para aprovar/rejeitar em massa ou use os botões em cada card.
                </Text>
                {pendingList.map((item) => (
                  <View key={item.userId} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.primary + '25' }]}>
                    <TouchableOpacity
                      style={styles.checkWrap}
                      onPress={() => toggleSelect(item.userId)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, selectedIds.has(item.userId) && { backgroundColor: colors.primary }]}>
                        {selectedIds.has(item.userId) && <Ionicons name="checkmark" size={16} color="#fff" />}
                      </View>
                      <View style={styles.cardRow}>
                        <Text style={[styles.name, { color: colors.textPrimary }]}>{item.name}</Text>
                        <Text style={[styles.email, { color: colors.textSecondary }]} numberOfLines={1}>{item.email}</Text>
                        {item.phone != null && item.phone !== '' && (
                          <Text style={[styles.phone, { color: colors.textSecondary }]}>{item.phone}</Text>
                        )}
                        <Text style={[styles.date, { color: colors.textSecondary }]}>Enviado em {formatDate(item.kycSubmittedAt)}</Text>
                        {(() => {
                          const bullet = getBulletStatus(item.kycExtractionStatus, item.kycFraudSignal, item);
                          const green = (colors as { success?: string }).success ?? '#22c55e';
                          const red = colors.error ?? '#dc3545';
                          const gray = colors.textSecondary;
                          const showDetail = (title: string, cadastro: string, documento: string) => {
                            Alert.alert(title, `Cadastro: ${cadastro}\nDocumento (OCR): ${documento}`);
                          };
                          const BulletRow = ({
                            label,
                            status,
                            onPressDetail,
                            cadastro,
                            doc,
                          }: {
                            label: string;
                            status: 'ok' | 'fail' | 'na';
                            onPressDetail?: () => void;
                            cadastro: string;
                            doc: string;
                          }) => {
                            const hasInfo = cadastro !== '—' || doc !== '—';
                            return (
                              <View style={styles.bulletItem}>
                                <View style={styles.bulletRow}>
                                  {status === 'ok' && <Ionicons name="checkmark-circle" size={18} color={green} />}
                                  {status === 'fail' && <Ionicons name="close-circle" size={18} color={red} />}
                                  {status === 'na' && <Text style={[styles.bulletDash, { color: gray }]}>—</Text>}
                                  <Text style={[styles.bulletLabel, { color: colors.textPrimary }]}>{label}</Text>
                                  {status === 'fail' && onPressDetail != null && (
                                    <TouchableOpacity onPress={onPressDetail} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                      <Ionicons name="information-circle-outline" size={18} color={red} />
                                    </TouchableOpacity>
                                  )}
                                </View>
                                {hasInfo && (
                                  <Text style={[styles.bulletDetail, { color: gray }]} numberOfLines={2}>
                                    Cadastro: {cadastro} · Doc: {doc}
                                  </Text>
                                )}
                              </View>
                            );
                          };
                          return (
                            <View style={styles.bulletBlock}>
                              <BulletRow
                                label="Data de nascimento"
                                status={bullet.data}
                                onPressDetail={bullet.data === 'fail' ? () => showDetail('Data de nascimento', item.birthDate ?? '—', item.kycExtractedBirthDate ?? '—') : undefined}
                                cadastro={item.birthDate ?? '—'}
                                doc={item.kycExtractedBirthDate ?? '—'}
                              />
                              <BulletRow
                                label="CPF"
                                status={bullet.cpf}
                                onPressDetail={bullet.cpf === 'fail' ? () => showDetail('CPF', item.document ? formatCpfDisplay(item.document) : '—', item.kycExtractedCpf ? formatCpfDisplay(item.kycExtractedCpf) : '—') : undefined}
                                cadastro={item.document ? formatCpfDisplay(item.document) : '—'}
                                doc={item.kycExtractedCpf ? formatCpfDisplay(item.kycExtractedCpf) : '—'}
                              />
                              <BulletRow
                                label="RG"
                                status={bullet.rg}
                                onPressDetail={bullet.rg === 'fail' ? () => showDetail('RG', item.rg ?? '—', item.kycExtractedDocNumber ?? '—') : undefined}
                                cadastro={item.rg ?? '—'}
                                doc={item.kycExtractedDocNumber ?? '—'}
                              />
                              <BulletRow
                                label="Nome"
                                status={bullet.nome}
                                onPressDetail={bullet.nome === 'fail' ? () => showDetail('Nome', item.name ?? '—', item.kycExtractedName ?? '—') : undefined}
                                cadastro={item.name ?? '—'}
                                doc={item.kycExtractedName ?? '—'}
                              />
                            </View>
                          );
                        })()}
                        {/* Veredito automático: Passou (✅) ou Falhou (❌) */}
                        <View
                          style={[
                            styles.vereditoBox,
                            {
                              backgroundColor:
                                item.kycExtractionStatus === 'OK'
                                  ? ((colors as { success?: string }).success ?? '#22c55e') + '18'
                                  : item.kycExtractionStatus === 'DIVERGENT' || item.kycExtractionStatus === 'NOT_EXTRACTED'
                                    ? (colors.error ?? '#dc3545') + '18'
                                    : colors.surface,
                              borderColor:
                                item.kycExtractionStatus === 'OK'
                                  ? ((colors as { success?: string }).success ?? '#22c55e') + '50'
                                  : item.kycExtractionStatus === 'DIVERGENT' || item.kycExtractionStatus === 'NOT_EXTRACTED'
                                    ? (colors.error ?? '#dc3545') + '50'
                                    : colors.textSecondary + '30',
                            },
                          ]}
                        >
                          {item.kycExtractionStatus === 'OK' && (
                            <>
                              <Text style={styles.vereditoEmoji}>✅</Text>
                              <Text style={[styles.vereditoText, { color: (colors as { success?: string }).success ?? '#22c55e' }]}>Passou</Text>
                            </>
                          )}
                          {(item.kycExtractionStatus === 'DIVERGENT' || item.kycExtractionStatus === 'NOT_EXTRACTED') && (
                            <>
                              <Text style={styles.vereditoEmoji}>❌</Text>
                              <Text style={[styles.vereditoText, { color: colors.error ?? '#dc3545' }]}>Falhou</Text>
                            </>
                          )}
                          {item.kycExtractionStatus === 'PENDING' && (
                            <>
                              <Text style={[styles.vereditoEmojiSmall, { color: colors.textSecondary }]}>⏳</Text>
                              <Text style={[styles.vereditoTextSmall, { color: colors.textSecondary }]}>Aguardando análise</Text>
                            </>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                    <View style={styles.thumbRow}>
                      {item.documentUrl != null && (
                        <TouchableOpacity
                          style={styles.thumbWrap}
                          onPress={() => item.documentUrl && Linking.openURL(item.documentUrl)}
                        >
                          <ExpoImage source={{ uri: item.documentUrl }} style={styles.thumb} contentFit="cover" />
                          <Text style={[styles.thumbLabel, { color: colors.textSecondary }]}>Documento</Text>
                        </TouchableOpacity>
                      )}
                      {item.selfieUrl != null && (
                        <TouchableOpacity
                          style={styles.thumbWrap}
                          onPress={() => item.selfieUrl && Linking.openURL(item.selfieUrl)}
                        >
                          <ExpoImage source={{ uri: item.selfieUrl }} style={styles.thumb} contentFit="cover" />
                          <Text style={[styles.thumbLabel, { color: colors.textSecondary }]}>Selfie</Text>
                        </TouchableOpacity>
                      )}
                      {item.documentVersoUrl != null && (
                        <TouchableOpacity
                          style={styles.thumbWrap}
                          onPress={() => item.documentVersoUrl && Linking.openURL(item.documentVersoUrl)}
                        >
                          <ExpoImage source={{ uri: item.documentVersoUrl }} style={styles.thumb} contentFit="cover" />
                          <Text style={[styles.thumbLabel, { color: colors.textSecondary }]}>Verso</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {rejectingUserId === item.userId ? (
                      <View style={styles.rejectBox}>
                        <TextInput
                          style={[styles.rejectInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
                          placeholder="Motivo da rejeição (obrigatório)"
                          placeholderTextColor={colors.textSecondary}
                          value={rejectReason}
                          onChangeText={setRejectReason}
                          multiline
                        />
                        <View style={styles.rejectActions}>
                          <TouchableOpacity style={[styles.rejectBtn, { borderColor: colors.textSecondary }]} onPress={cancelReject}>
                            <Text style={[styles.rejectBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.rejectBtn, { backgroundColor: colors.primary }]}
                            onPress={() => confirmReject(item.userId)}
                            disabled={isPending}
                          >
                            {updateKyc.isPending ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Text style={[styles.rejectBtnText, { color: '#fff' }]}>Confirmar rejeição</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.actions}>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: colors.primary + '20' }]}
                          onPress={() => handleApprove(item)}
                          disabled={isPending}
                        >
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                          <Text style={[styles.actionBtnText, { color: colors.primary }]}>Aprovar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: '#dc3545' + '20' }]}
                          onPress={() => handleReject(item)}
                          disabled={isPending}
                        >
                          <Ionicons name="close-circle" size={20} color="#dc3545" />
                          <Text style={[styles.actionBtnText, { color: '#dc3545' }]}>Rejeitar</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {tab === 'approved' && (
          <>
            {approvedLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : approvedList.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textSecondary }]}>
                {approvedSearchSubmit ? 'Nenhum resultado para essa busca.' : 'Nenhum KYC aprovado no momento.'}
              </Text>
            ) : (
              <>
                <Text style={[styles.hint, { color: colors.textSecondary }]}>Sem armazenamento de fotos. Revogar devolve o usuário ao estado inicial (pode solicitar novamente).</Text>
                {approvedList.map((item) => (
                  <View key={item.userId} style={[styles.card, styles.approvedCard, { backgroundColor: colors.surface, borderColor: colors.textSecondary + '25' }]}>
                    <View style={styles.cardRow}>
                      <Text style={[styles.name, { color: colors.textPrimary }]}>{item.name}</Text>
                      <Text style={[styles.email, { color: colors.textSecondary }]} numberOfLines={1}>{item.email}</Text>
                      {item.phone != null && item.phone !== '' && (
                        <Text style={[styles.phone, { color: colors.textSecondary }]}>{item.phone}</Text>
                      )}
                      {item.username ? (
                        <Text style={[styles.phone, { color: colors.textSecondary }]}>@{item.username}</Text>
                      ) : null}
                      <Text style={[styles.date, { color: colors.textSecondary }]}>Enviado em {formatDate(item.kycSubmittedAt)}</Text>
                      <Text style={[styles.date, { color: colors.textSecondary }]}>Aprovado em {formatDate(item.kycVerifiedAt)}</Text>
                      {(() => {
                        const bullet = getBulletStatus(item.kycExtractionStatus, item.kycFraudSignal, item);
                        const green = (colors as { success?: string }).success ?? '#22c55e';
                        const red = colors.error ?? '#dc3545';
                        const gray = colors.textSecondary;
                        const showDetail = (title: string, cadastro: string, documento: string) => {
                          Alert.alert(title, `Cadastro: ${cadastro}\nDocumento (OCR): ${documento}`);
                        };
                        const BulletRow = ({
                          label,
                          status,
                          onPressDetail,
                          cadastro,
                          doc,
                        }: {
                          label: string;
                          status: 'ok' | 'fail' | 'na';
                          onPressDetail?: () => void;
                          cadastro: string;
                          doc: string;
                        }) => {
                          const hasInfo = cadastro !== '—' || doc !== '—';
                          return (
                            <View style={styles.bulletItem}>
                              <View style={styles.bulletRow}>
                                {status === 'ok' && <Ionicons name="checkmark-circle" size={18} color={green} />}
                                {status === 'fail' && <Ionicons name="close-circle" size={18} color={red} />}
                                {status === 'na' && <Text style={[styles.bulletDash, { color: gray }]}>—</Text>}
                                <Text style={[styles.bulletLabel, { color: colors.textPrimary }]}>{label}</Text>
                                {status === 'fail' && onPressDetail != null && (
                                  <TouchableOpacity onPress={onPressDetail} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <Ionicons name="information-circle-outline" size={18} color={red} />
                                  </TouchableOpacity>
                                )}
                              </View>
                              {hasInfo && (
                                <Text style={[styles.bulletDetail, { color: gray }]} numberOfLines={2}>
                                  Cadastro: {cadastro} · Doc: {doc}
                                </Text>
                              )}
                            </View>
                          );
                        };
                        return (
                          <View style={styles.bulletBlock}>
                            <BulletRow
                              label="Data de nascimento"
                              status={bullet.data}
                              onPressDetail={bullet.data === 'fail' ? () => showDetail('Data de nascimento', item.birthDate ?? '—', item.kycExtractedBirthDate ?? '—') : undefined}
                              cadastro={item.birthDate ?? '—'}
                              doc={item.kycExtractedBirthDate ?? '—'}
                            />
                            <BulletRow
                              label="CPF"
                              status={bullet.cpf}
                              onPressDetail={bullet.cpf === 'fail' ? () => showDetail('CPF', item.document ? formatCpfDisplay(item.document) : '—', item.kycExtractedCpf ? formatCpfDisplay(item.kycExtractedCpf) : '—') : undefined}
                              cadastro={item.document ? formatCpfDisplay(item.document) : '—'}
                              doc={item.kycExtractedCpf ? formatCpfDisplay(item.kycExtractedCpf) : '—'}
                            />
                            <BulletRow
                              label="RG"
                              status={bullet.rg}
                              onPressDetail={bullet.rg === 'fail' ? () => showDetail('RG', item.rg ?? '—', item.kycExtractedDocNumber ?? '—') : undefined}
                              cadastro={item.rg ?? '—'}
                              doc={item.kycExtractedDocNumber ?? '—'}
                            />
                            <BulletRow
                              label="Nome"
                              status={bullet.nome}
                              onPressDetail={bullet.nome === 'fail' ? () => showDetail('Nome', item.name ?? '—', item.kycExtractedName ?? '—') : undefined}
                              cadastro={item.name ?? '—'}
                              doc={item.kycExtractedName ?? '—'}
                            />
                          </View>
                        );
                      })()}
                      <View
                        style={[
                          styles.vereditoBox,
                          {
                            backgroundColor: item.kycExtractionStatus === 'OK' ? ((colors as { success?: string }).success ?? '#22c55e') + '18' : (colors.error ?? '#dc3545') + '18',
                            borderColor: item.kycExtractionStatus === 'OK' ? ((colors as { success?: string }).success ?? '#22c55e') + '50' : (colors.error ?? '#dc3545') + '50',
                          },
                        ]}
                      >
                        <Text style={styles.vereditoEmoji}>✅</Text>
                        <Text style={[styles.vereditoText, { color: (colors as { success?: string }).success ?? '#22c55e' }]}>
                          {item.kycDecidedBy == null ? 'Validação automática' : 'Passou'}
                        </Text>
                      </View>
                      <Text style={[styles.date, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                        {item.kycDecidedBy == null ? 'Aprovado automaticamente' : 'Aprovado pela equipe'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.revokeBtn, { borderColor: '#dc3545' + '60' }]}
                      onPress={() => handleRevoke(item)}
                      disabled={isPending}
                    >
                      <Ionicons name="shield-outline" size={18} color="#dc3545" />
                      <Text style={[styles.revokeBtnText, { color: '#dc3545' }]}>Revogar verificação</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={showBulkReject} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowBulkReject(false)}>
          <Pressable style={[styles.modalBox, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Rejeitar {selectedIds.size} selecionado(s)</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>A mesma justificativa será enviada a todos.</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
              placeholder="Motivo da rejeição (obrigatório)"
              placeholderTextColor={colors.textSecondary}
              value={bulkRejectReason}
              onChangeText={setBulkRejectReason}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: colors.textSecondary }]} onPress={() => setShowBulkReject(false)}>
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={confirmBulkReject}
                disabled={bulkKyc.isPending || !bulkRejectReason.trim()}
              >
                {bulkKyc.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>Rejeitar todos</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!revokeUserId} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setRevokeUserId(null)}>
          <Pressable style={[styles.modalBox, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Revogar verificação</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>O usuário voltará ao estado inicial e poderá solicitar novamente. Informe a justificativa (enviada por push).</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
              placeholder="Justificativa (obrigatória)"
              placeholderTextColor={colors.textSecondary}
              value={revokeReason}
              onChangeText={setRevokeReason}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: colors.textSecondary }]} onPress={() => setRevokeUserId(null)}>
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#dc3545' }]}
                onPress={confirmRevoke}
                disabled={revokeKyc.isPending || !revokeReason.trim()}
              >
                {revokeKyc.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>Revogar</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Toast message={toast} onHide={() => setToast(null)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, gap: 6 },
  tabText: { fontSize: 15, fontWeight: '600' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 8 },
  searchBtn: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 10 },
  searchBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  bulkBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  bulkLabel: { fontSize: 14, fontWeight: '600' },
  bulkActions: { flexDirection: 'row', gap: spacing.sm },
  bulkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: 8 },
  bulkBtnText: { fontSize: 13, fontWeight: '600' },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  empty: { fontSize: 15, textAlign: 'center', marginTop: spacing.xl },
  hint: { fontSize: 13, marginBottom: spacing.md, fontStyle: 'italic' },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  approvedCard: {},
  checkWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardRow: { flex: 1, marginBottom: spacing.sm },
  name: { fontSize: 16, fontWeight: '600' },
  email: { fontSize: 13, marginTop: 2 },
  phone: { fontSize: 13, marginTop: 2 },
  date: { fontSize: 12, marginTop: 4 },
  bulletBlock: { marginTop: 8, gap: 6 },
  bulletItem: { gap: 2 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bulletDash: { fontSize: 14, width: 18, textAlign: 'center' },
  bulletLabel: { fontSize: 13, flex: 1 },
  bulletDetail: { fontSize: 11, marginLeft: 24 },
  vereditoBox: {
    marginTop: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
  },
  vereditoEmoji: { fontSize: 32, marginBottom: 4 },
  vereditoText: { fontSize: 18, fontWeight: '700' },
  vereditoEmojiSmall: { fontSize: 24, marginBottom: 4 },
  vereditoTextSmall: { fontSize: 14, fontWeight: '600' },
  thumbRow: { flexDirection: 'row', gap: spacing.md, marginVertical: spacing.sm },
  thumbWrap: { alignItems: 'center' },
  thumb: { width: 80, height: 100, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.06)' },
  thumbLabel: { fontSize: 11, marginTop: 4 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: 10,
  },
  actionBtnText: { fontSize: 14, fontWeight: '600' },
  rejectBox: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  rejectInput: { borderWidth: 1, borderRadius: 10, padding: spacing.sm, fontSize: 14, minHeight: 60, textAlignVertical: 'top' },
  rejectActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  rejectBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  rejectBtnText: { fontSize: 14, fontWeight: '600' },
  revokeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  revokeBtnText: { fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
  modalBox: { borderRadius: 16, padding: spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  modalSub: { fontSize: 13, marginBottom: spacing.md },
  modalInput: { borderWidth: 1, borderRadius: 10, padding: spacing.sm, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  modalBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  modalBtnText: { fontSize: 14, fontWeight: '600' },
});
