import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Toast, LoadingLogo } from '../../../src/components';
import { useTheme } from '../../../src/hooks/useTheme';
import {
  getPendingVerifications,
  getApprovedVerifications,
  resolveVerification,
  revokeVerification,
  type VerificationPendingItem,
} from '../../../src/api/admin';
import { getFriendlyErrorMessage } from '../../../src/utils/errorMessage';
import { spacing } from '../../../src/theme';

const VERIFICATION_TYPE_LABEL: Record<string, string> = {
  USER_VERIFIED: 'Verificação de usuário',
  PET_VERIFIED: 'Verificação de pet',
};

export default function AdminVerificationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [selectedVerificationIds, setSelectedVerificationIds] = useState<Set<string>>(new Set());
  const [verificationPendingTypeFilter, setVerificationPendingTypeFilter] = useState<
    'ALL' | 'USER_VERIFIED' | 'PET_VERIFIED'
  >('ALL');
  const [verificationApprovedTypeFilter, setVerificationApprovedTypeFilter] = useState<
    'ALL' | 'USER_VERIFIED' | 'PET_VERIFIED'
  >('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { data: pending = [], isLoading: loadingVerifications, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'verifications'],
    queryFn: getPendingVerifications,
  });
  const { data: approvedVerifications = [], refetch: refetchApproved, isRefetching: refetchingApproved } = useQuery({
    queryKey: ['admin', 'verifications-approved'],
    queryFn: getApprovedVerifications,
  });

  const resolveVerificationMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) =>
      resolveVerification(id, status),
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'verifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'verifications-approved'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['verification-status'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setToastMessage(v.status === 'APPROVED' ? 'Verificação aprovada.' : 'Verificação rejeitada.');
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível atualizar.')),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeVerification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'verifications-approved'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['verification-status'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setToastMessage('Verificação revogada.');
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível revogar.')),
  });

  const toggleVerificationSelection = (id: string) => {
    setSelectedVerificationIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchVerification = (status: 'APPROVED' | 'REJECTED') => {
    const ids = Array.from(selectedVerificationIds);
    if (ids.length === 0) return;
    Alert.alert(
      status === 'APPROVED' ? 'Aprovar selecionadas' : 'Rejeitar selecionadas',
      `Confirmar ${status === 'APPROVED' ? 'aprovação' : 'rejeição'} de ${ids.length} solicitação(ões)?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: status === 'APPROVED' ? 'Aprovar todas' : 'Rejeitar todas',
          style: status === 'REJECTED' ? 'destructive' : 'default',
          onPress: async () => {
            for (const id of ids) {
              await resolveVerification(id, status);
            }
            setSelectedVerificationIds(new Set());
            queryClient.invalidateQueries({ queryKey: ['admin', 'verifications'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'verifications-approved'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
            setToastMessage(
              status === 'APPROVED' ? `${ids.length} aprovada(s).` : `${ids.length} rejeitada(s).`
            );
          },
        },
      ]
    );
  };

  const handleResolveVerification = (item: VerificationPendingItem, status: 'APPROVED' | 'REJECTED') => {
    Alert.alert(
      status === 'APPROVED' ? 'Aprovar' : 'Rejeitar',
      `Confirmar ${status === 'APPROVED' ? 'aprovação' : 'rejeição'} desta solicitação?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: status === 'APPROVED' ? 'Aprovar' : 'Rejeitar',
          style: status === 'REJECTED' ? 'destructive' : 'default',
          onPress: () => resolveVerificationMutation.mutate({ id: item.id, status }),
        },
      ]
    );
  };

  const handleRevoke = (item: VerificationPendingItem) => {
    Alert.alert('Revogar verificação', 'O selo de verificado será removido. Confirmar?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Revogar', style: 'destructive', onPress: () => revokeMutation.mutate(item.id) },
    ]);
  };

  const filteredPending =
    verificationPendingTypeFilter === 'ALL'
      ? pending
      : pending.filter((item) => item.type === verificationPendingTypeFilter);
  const filteredApproved =
    verificationApprovedTypeFilter === 'ALL'
      ? approvedVerifications
      : approvedVerifications.filter((item) => item.type === verificationApprovedTypeFilter);
  const refreshing = isRefetching || refetchingApproved;

  return (
    <ScreenContainer
      scroll
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            refetch();
            refetchApproved();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <View>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Verificações pendentes ({pending.length})
        </Text>
        <View style={[styles.rowWrap, { marginBottom: spacing.sm, flexWrap: 'wrap', gap: spacing.xs }]}>
          {(['ALL', 'USER_VERIFIED', 'PET_VERIFIED'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.chip,
                {
                  backgroundColor: verificationPendingTypeFilter === tab ? colors.primary + '30' : colors.surface,
                  borderWidth: 1,
                  borderColor: verificationPendingTypeFilter === tab ? colors.primary : colors.background,
                },
              ]}
              onPress={() => setVerificationPendingTypeFilter(tab)}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: verificationPendingTypeFilter === tab ? colors.primary : colors.textSecondary },
                ]}
              >
                {tab === 'ALL' ? 'Todas' : tab === 'USER_VERIFIED' ? 'Usuário' : 'Pet'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {pending.length > 0 && selectedVerificationIds.size > 0 && (
          <View style={styles.batchBar}>
            <Text style={[styles.batchLabel, { color: colors.textSecondary }]}>
              {selectedVerificationIds.size} selecionada(s)
            </Text>
            <View style={styles.batchActions}>
              <TouchableOpacity
                style={[styles.batchBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleBatchVerification('APPROVED')}
              >
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <Text style={styles.batchBtnText}>Aprovar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.batchBtn, { backgroundColor: colors.error || '#DC2626' }]}
                onPress={() => handleBatchVerification('REJECTED')}
              >
                <Ionicons name="close-circle" size={16} color="#fff" />
                <Text style={styles.batchBtnText}>Rejeitar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {loadingVerifications ? (
          <View style={styles.sectionLoading}>
            <LoadingLogo size={100} />
          </View>
        ) : filteredPending.length === 0 ? (
          <View style={[styles.emptyBlock, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {pending.length === 0
                ? 'Nenhuma solicitação pendente.'
                : verificationPendingTypeFilter === 'USER_VERIFIED'
                  ? 'Nenhuma verificação de usuário pendente.'
                  : 'Nenhuma verificação de pet pendente.'}
            </Text>
          </View>
        ) : (
          filteredPending.map((item) => (
            <View key={item.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.background }]}>
              <View style={styles.cardRowWrap}>
                <TouchableOpacity
                  style={[styles.checkbox, selectedVerificationIds.has(item.id) && { backgroundColor: colors.primary }]}
                  onPress={() => toggleVerificationSelection(item.id)}
                >
                  {selectedVerificationIds.has(item.id) && <Ionicons name="checkmark" size={14} color="#fff" />}
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <View style={styles.cardRow}>
                    <Text style={[styles.cardType, { color: colors.textPrimary }]}>
                      {VERIFICATION_TYPE_LABEL[item.type] ?? item.type}
                    </Text>
                    <Text style={[styles.cardDate, { color: colors.textSecondary, marginLeft: 8 }]}>
                      {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                  {item.type === 'USER_VERIFIED' ? (
                    <View style={[styles.cardRow, { alignItems: 'center', marginTop: 6 }]}>
                      {item.userAvatarUrl ? (
                        <ExpoImage
                          source={{ uri: item.userAvatarUrl }}
                          style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }}
                        />
                      ) : (
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: colors.primary + '30',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 10,
                          }}
                        >
                          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 16 }}>
                            {(item.userName ?? '?').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardDetail, { color: colors.textPrimary, fontWeight: '600' }]} numberOfLines={1}>
                          {item.userName ?? '—'}
                        </Text>
                        {item.userCity ? (
                          <Text style={[styles.cardDetail, { color: colors.textSecondary, fontSize: 12 }]} numberOfLines={1}>
                            {item.userCity}
                          </Text>
                        ) : null}
                        {item.userUsername ? (
                          <Text style={[styles.cardDetail, { color: colors.textSecondary, fontSize: 12 }]} numberOfLines={1}>
                            @{item.userUsername}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ) : (
                    <View style={[styles.cardRow, { alignItems: 'center', marginTop: 6 }]}>
                      {item.petPhotoUrl ? (
                        <ExpoImage
                          source={{ uri: item.petPhotoUrl }}
                          style={{ width: 48, height: 48, borderRadius: 8, marginRight: 10 }}
                        />
                      ) : (
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 8,
                            backgroundColor: colors.primary + '20',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 10,
                          }}
                        >
                          <Text style={{ fontSize: 24 }}>🐾</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardDetail, { color: colors.textPrimary, fontWeight: '600' }]} numberOfLines={1}>
                          {item.petName ?? '—'}
                        </Text>
                        {item.petSpecies ? (
                          <Text style={[styles.cardDetail, { color: colors.textSecondary, fontSize: 12 }]}>
                            {item.petSpecies === 'dog' ? 'Cachorro' : 'Gato'}
                            {item.petAge != null ? ` • ${item.petAge} ano(s)` : ''}
                          </Text>
                        ) : null}
                        {item.petOwnerName ? (
                          <Text style={[styles.cardDetail, { color: colors.textSecondary, fontSize: 12, marginTop: 2 }]}>
                            Tutor: {item.petOwnerName}
                          </Text>
                        ) : null}
                      </View>
                      {item.petId ? (
                        <TouchableOpacity onPress={() => router.push(`/pet/${item.petId!}`)} style={styles.linkBtn}>
                          <Ionicons name="open-outline" size={14} color={colors.primary} />
                          <Text style={[styles.linkText, { color: colors.primary, fontSize: 12 }]}>Ver pet</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )}
                  {(item.evidenceUrls?.length ?? 0) > 0 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                      {item.evidenceUrls!.slice(0, 3).map((url, i) => (
                        <TouchableOpacity key={i} onPress={() => {}}>
                          <ExpoImage source={{ uri: url }} style={{ width: 44, height: 44, borderRadius: 6 }} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : item.skipEvidenceReason ? (
                    <Text
                      style={[styles.cardDetail, { color: colors.textSecondary, fontSize: 11, fontStyle: 'italic', marginTop: 6 }]}
                      numberOfLines={2}
                    >
                      Sem fotos: {item.skipEvidenceReason}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={[styles.cardActions, { marginTop: 10 }]}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleResolveVerification(item, 'APPROVED')}
                  disabled={resolveVerificationMutation.isPending}
                >
                  {resolveVerificationMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  )}
                  <Text style={styles.actionBtnText}>
                    {resolveVerificationMutation.isPending ? 'Aprovando...' : 'Aprovar'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.error || '#DC2626' }]}
                  onPress={() => handleResolveVerification(item, 'REJECTED')}
                  disabled={resolveVerificationMutation.isPending}
                >
                  {resolveVerificationMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="close-circle" size={18} color="#fff" />
                  )}
                  <Text style={styles.actionBtnText}>
                    {resolveVerificationMutation.isPending ? 'Rejeitando...' : 'Rejeitar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: spacing.xl }]}>
          Verificações aprovadas ({approvedVerifications.length})
        </Text>
        <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
          Revogar remove o selo de verificado.
        </Text>
        <View style={[styles.rowWrap, { marginBottom: spacing.sm, flexWrap: 'wrap', gap: spacing.xs }]}>
          {(['ALL', 'USER_VERIFIED', 'PET_VERIFIED'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.chip,
                {
                  backgroundColor: verificationApprovedTypeFilter === tab ? colors.primary + '30' : colors.surface,
                  borderWidth: 1,
                  borderColor: verificationApprovedTypeFilter === tab ? colors.primary : colors.background,
                },
              ]}
              onPress={() => setVerificationApprovedTypeFilter(tab)}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: verificationApprovedTypeFilter === tab ? colors.primary : colors.textSecondary },
                ]}
              >
                {tab === 'ALL' ? 'Todas' : tab === 'USER_VERIFIED' ? 'Usuário' : 'Pet'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {filteredApproved.length === 0 ? (
          <View style={[styles.emptyBlock, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {approvedVerifications.length === 0
                ? 'Nenhuma verificação aprovada.'
                : verificationApprovedTypeFilter === 'USER_VERIFIED'
                  ? 'Nenhuma verificação de usuário aprovada.'
                  : 'Nenhuma verificação de pet aprovada.'}
            </Text>
          </View>
        ) : (
          filteredApproved.map((item) => (
            <View key={item.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.background }]}>
              <Text style={[styles.cardType, { color: colors.textPrimary }]}>
                {VERIFICATION_TYPE_LABEL[item.type] ?? item.type}
              </Text>
              {item.type === 'USER_VERIFIED' && item.userName ? (
                <Text style={[styles.cardDetail, { color: colors.textSecondary }]}>Usuário: {item.userName}</Text>
              ) : item.type === 'PET_VERIFIED' ? (
                <View style={styles.cardRow}>
                  <Text style={[styles.cardDetail, { color: colors.textSecondary }]}>Pet: {item.petName ?? '—'}</Text>
                  {item.petId ? (
                    <TouchableOpacity onPress={() => router.push(`/pet/${item.petId!}`)} style={styles.linkBtn}>
                      <Ionicons name="image-outline" size={12} color={colors.primary} />
                      <Text style={[styles.linkText, { color: colors.primary, fontSize: 12 }]}>Ver pet</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}
              <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
                {new Date(item.createdAt).toLocaleDateString('pt-BR')}
              </Text>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.revokeBtn,
                  { borderColor: colors.error || '#DC2626', marginTop: spacing.sm },
                ]}
                onPress={() => handleRevoke(item)}
                disabled={revokeMutation.isPending}
              >
                {revokeMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.error || '#DC2626'} />
                ) : (
                  <Ionicons name="remove-circle-outline" size={18} color={colors.error || '#DC2626'} />
                )}
                <Text style={[styles.actionBtnTextRevoke, { color: colors.error || '#DC2626' }]}>
                  {revokeMutation.isPending ? 'Revogando...' : 'Revogar'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.xs },
  sectionSub: { fontSize: 13, marginBottom: spacing.md },
  rowWrap: {},
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  chipText: { fontSize: 14, fontWeight: '600' },
  batchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  batchLabel: { fontSize: 13 },
  batchActions: { flexDirection: 'row', gap: spacing.xs },
  batchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  batchBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  sectionLoading: { paddingVertical: spacing.xl, alignItems: 'center', justifyContent: 'center', minHeight: 120 },
  emptyBlock: { padding: spacing.lg, borderRadius: 12, marginBottom: spacing.sm },
  emptyText: { fontSize: 14 },
  card: { padding: spacing.md, borderRadius: 12, borderWidth: 1, marginBottom: spacing.sm },
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
  cardRowWrap: { flexDirection: 'row', alignItems: 'center' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  cardType: { fontSize: 16, fontWeight: '600' },
  cardDetail: { fontSize: 14, marginTop: 4 },
  cardDate: { fontSize: 12, marginTop: 4 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkText: { fontSize: 13, fontWeight: '500' },
  cardActions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  revokeBtn: { borderWidth: 1, backgroundColor: 'transparent' },
  actionBtnTextRevoke: { fontWeight: '600', fontSize: 14 },
});
