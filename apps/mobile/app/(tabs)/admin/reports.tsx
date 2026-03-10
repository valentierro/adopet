import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Toast, LoadingLogo } from '../../../src/components';
import { useTheme } from '../../../src/hooks/useTheme';
import { useToastWithDedupe } from '../../../src/hooks/useToastWithDedupe';
import { getReports, resolveReport, banUser, type ReportItem } from '../../../src/api/admin';
import { getFriendlyErrorMessage } from '../../../src/utils/errorMessage';
import { spacing } from '../../../src/theme';

const REPORT_TARGET_LABEL: Record<string, string> = {
  USER: 'Usuário',
  PET: 'Pet',
  MESSAGE: 'Mensagem',
};

const REPORT_REASON_LABEL: Record<string, string> = {
  INAPPROPRIATE: 'Conteúdo inadequado',
  SPAM: 'Spam',
  MISLEADING: 'Informação falsa',
  HARASSMENT: 'Assédio',
  OTHER: 'Outro',
};

export default function AdminReportsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
  const [reportStatusFilter, setReportStatusFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('OPEN');
  const [resolveReportModal, setResolveReportModal] = useState<{ reportId: string; targetType: string } | null>(null);
  const [resolveReportFeedback, setResolveReportFeedback] = useState('');
  const [resolveReportBanUser, setResolveReportBanUser] = useState(false);
  const [banUserModal, setBanUserModal] = useState<{ userId: string; userName?: string } | null>(null);
  const [banUserReason, setBanUserReason] = useState('');
  const { toastMessage, setToastMessage, showToast } = useToastWithDedupe();

  const { data: reports = [], isLoading: loadingReports, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: getReports,
  });

  const resolveReportMutation = useMutation({
    mutationFn: ({
      reportId,
      resolutionFeedback,
      banReportedUser,
    }: {
      reportId: string;
      resolutionFeedback?: string;
      banReportedUser?: boolean;
    }) =>
      resolveReport(reportId, {
        ...(resolutionFeedback ? { resolutionFeedback } : {}),
        ...(banReportedUser ? { banReportedUser: true } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      showToast('Denúncia marcada como resolvida.');
      setResolveReportModal(null);
      setResolveReportFeedback('');
      setResolveReportBanUser(false);
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível resolver.')),
  });

  const banUserMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      banUser(userId, reason ? { reason } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      showToast('Usuário banido. A conta foi desativada.');
      setBanUserModal(null);
      setBanUserReason('');
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível banir o usuário.')),
  });

  const unresolvedReports = reports.filter((r) => !r.resolvedAt);

  const toggleReportSelection = (id: string) => {
    setSelectedReportIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleResolveReport = (r: ReportItem) => {
    setResolveReportModal({ reportId: r.id, targetType: r.targetType });
    setResolveReportFeedback('');
    setResolveReportBanUser(false);
  };

  const handleResolveReportSubmit = () => {
    if (!resolveReportModal) return;
    resolveReportMutation.mutate({
      reportId: resolveReportModal.reportId,
      resolutionFeedback: resolveReportFeedback.trim() || undefined,
      banReportedUser: resolveReportBanUser || undefined,
    });
  };

  const resolveReportCanBanUser =
    resolveReportModal &&
    (resolveReportModal.targetType === 'USER' ||
      resolveReportModal.targetType === 'PET' ||
      resolveReportModal.targetType === 'MESSAGE');

  const handleBatchResolveReports = () => {
    const ids = Array.from(selectedReportIds);
    if (ids.length === 0) return;
    Alert.alert('Resolver selecionadas', `Marcar ${ids.length} denúncia(s) como resolvida(s)?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Resolver todas',
        onPress: async () => {
          for (const id of ids) {
            await resolveReport(id);
          }
          setSelectedReportIds(new Set());
          queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
          queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
          showToast(`${ids.length} denúncia(s) resolvida(s).`);
        },
      },
    ]);
  };

  const filteredReports =
    reportStatusFilter === 'ALL'
      ? reports
      : reportStatusFilter === 'OPEN'
        ? reports.filter((r) => !r.resolvedAt)
        : reports.filter((r) => !!r.resolvedAt);

  return (
    <ScreenContainer
      scroll
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
      }
    >
      <View>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Denúncias ({reports.length})</Text>
        <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
          {unresolvedReports.length} não resolvidas.
        </Text>
        <View style={[styles.rowWrap, { marginBottom: spacing.sm, flexWrap: 'wrap', gap: spacing.xs }]}>
          {(['OPEN', 'RESOLVED', 'ALL'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.chip,
                {
                  backgroundColor: reportStatusFilter === tab ? colors.primary + '30' : colors.surface,
                  borderWidth: 1,
                  borderColor: reportStatusFilter === tab ? colors.primary : colors.background,
                },
              ]}
              onPress={() => setReportStatusFilter(tab)}
            >
              <Text
                style={[styles.chipText, { color: reportStatusFilter === tab ? colors.primary : colors.textSecondary }]}
              >
                {tab === 'OPEN' ? 'Abertas' : tab === 'RESOLVED' ? 'Resolvidas' : 'Todas'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {unresolvedReports.length > 0 && selectedReportIds.size > 0 && (
          <View style={styles.batchBar}>
            <Text style={[styles.batchLabel, { color: colors.textSecondary }]}>
              {selectedReportIds.size} selecionada(s)
            </Text>
            <TouchableOpacity
              style={[styles.batchBtn, { backgroundColor: colors.primary }]}
              onPress={handleBatchResolveReports}
              disabled={resolveReportMutation.isPending}
            >
              {resolveReportMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="checkmark-done" size={16} color="#fff" />
              )}
              <Text style={styles.batchBtnText}>
                {resolveReportMutation.isPending ? 'Resolvendo...' : 'Resolver todas'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {loadingReports ? (
          <View style={styles.sectionLoading}>
            <LoadingLogo size={100} />
          </View>
        ) : filteredReports.length === 0 ? (
          <View style={[styles.emptyBlock, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {reports.length === 0
                ? 'Nenhuma denúncia.'
                : reportStatusFilter === 'OPEN'
                  ? 'Nenhuma denúncia aberta.'
                  : reportStatusFilter === 'RESOLVED'
                    ? 'Nenhuma denúncia resolvida.'
                    : 'Nenhuma denúncia.'}
            </Text>
          </View>
        ) : (
          filteredReports.map((r) => (
            <View key={r.id} style={[styles.reportCard, { backgroundColor: colors.surface, borderColor: colors.background }]}>
              <View style={styles.reportRowWrap}>
                {!r.resolvedAt && (
                  <TouchableOpacity
                    style={[styles.checkbox, selectedReportIds.has(r.id) && { backgroundColor: colors.primary }]}
                    onPress={() => toggleReportSelection(r.id)}
                  >
                    {selectedReportIds.has(r.id) && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </TouchableOpacity>
                )}
                <View style={styles.reportContent}>
                  {r.resolvedAt ? (
                    <View style={[styles.resolvedBadge, { backgroundColor: colors.primary + '20' }]}>
                      <Ionicons name="checkmark-done" size={14} color={colors.primary} />
                      <Text style={[styles.resolvedText, { color: colors.primary }]}>Resolvida</Text>
                    </View>
                  ) : null}
                  <View style={styles.reportRow}>
                    <Text style={[styles.reportTarget, { color: colors.textPrimary }]}>
                      {REPORT_TARGET_LABEL[r.targetType] ?? r.targetType} • {r.targetId.slice(0, 8)}…
                    </Text>
                  </View>
                  {r.targetType === 'PET' && (
                    <TouchableOpacity onPress={() => router.push(`/pet/${r.targetId}`)} style={styles.linkBtn}>
                      <Ionicons name="image-outline" size={12} color={colors.primary} />
                      <Text style={[styles.linkText, { color: colors.primary, fontSize: 12 }]}>
                        Ver anúncio denunciado
                      </Text>
                    </TouchableOpacity>
                  )}
                  <Text style={[styles.reportReason, { color: colors.textSecondary }]}>
                    {REPORT_REASON_LABEL[r.reason] ?? r.reason}
                    {r.description ? ` — ${r.description}` : ''}
                  </Text>
                  <Text style={[styles.reportDate, { color: colors.textSecondary }]}>
                    {new Date(r.createdAt).toLocaleString('pt-BR')} • Denunciante: {r.reporterId.slice(0, 8)}…
                  </Text>
                  {!r.resolvedAt && (
                    <View style={[styles.rowWrap, { marginTop: spacing.sm, gap: spacing.sm, flexWrap: 'wrap' }]}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                        onPress={() => handleResolveReport(r)}
                        disabled={resolveReportMutation.isPending}
                      >
                        {resolveReportMutation.isPending ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Ionicons name="checkmark-done" size={18} color="#fff" />
                        )}
                        <Text style={styles.actionBtnText}>
                          {resolveReportMutation.isPending ? 'Resolvendo...' : 'Resolver denúncia'}
                        </Text>
                      </TouchableOpacity>
                      {r.targetType === 'USER' && (
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: colors.error || '#DC2626' }]}
                          onPress={() => setBanUserModal({ userId: r.targetId })}
                          disabled={banUserMutation.isPending}
                        >
                          {banUserMutation.isPending ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Ionicons name="ban" size={18} color="#fff" />
                          )}
                          <Text style={styles.actionBtnText}>
                            {banUserMutation.isPending ? 'Banindo...' : 'Banir usuário'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      <Modal visible={!!resolveReportModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Resolver denúncia</Text>
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
              Feedback para o denunciador (opcional)
            </Text>
            <TextInput
              style={[
                styles.searchInput,
                styles.feedbackInput,
                { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.primary + '40' },
              ]}
              placeholder="Ex: Analisamos a denúncia e tomamos as medidas necessárias."
              placeholderTextColor={colors.textSecondary}
              value={resolveReportFeedback}
              onChangeText={setResolveReportFeedback}
              multiline
              numberOfLines={4}
            />
            {resolveReportCanBanUser ? (
              <TouchableOpacity
                style={[styles.switchRow, { borderBottomColor: colors.background, marginTop: spacing.sm }]}
                onPress={() => setResolveReportBanUser((prev) => !prev)}
              >
                <Text style={[styles.switchLabel, { color: colors.textPrimary, flex: 1 }]}>
                  {resolveReportModal?.targetType === 'USER'
                    ? 'Confirmada grave – banir usuário denunciado'
                    : resolveReportModal?.targetType === 'PET'
                      ? 'Confirmada grave – banir tutor do pet'
                      : 'Confirmada grave – banir autor da mensagem'}
                </Text>
                <View style={[styles.checkbox, resolveReportBanUser && { backgroundColor: colors.primary }]}>
                  {resolveReportBanUser && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.background }]}
                onPress={() => {
                  setResolveReportModal(null);
                  setResolveReportFeedback('');
                  setResolveReportBanUser(false);
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  { backgroundColor: colors.primary },
                  resolveReportMutation.isPending && styles.modalBtnDisabled,
                ]}
                onPress={handleResolveReportSubmit}
                disabled={resolveReportMutation.isPending}
              >
                <Text style={styles.modalBtnTextPrimary}>
                  {resolveReportMutation.isPending ? 'Resolvendo...' : 'Resolver'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!banUserModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {banUserModal?.userName ? `Banir ${banUserModal.userName}?` : 'Banir usuário?'}
            </Text>
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
              A conta será desativada e não poderá fazer login. Motivo (opcional):
            </Text>
            <TextInput
              style={[
                styles.searchInput,
                styles.feedbackInput,
                { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.primary + '40' },
              ]}
              placeholder="Ex: Violação das regras"
              placeholderTextColor={colors.textSecondary}
              value={banUserReason}
              onChangeText={setBanUserReason}
              multiline
              numberOfLines={2}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.background }]}
                onPress={() => {
                  setBanUserModal(null);
                  setBanUserReason('');
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  { backgroundColor: colors.error || '#DC2626' },
                  banUserMutation.isPending && styles.modalBtnDisabled,
                ]}
                onPress={() =>
                  banUserModal &&
                  banUserMutation.mutate({ userId: banUserModal.userId, reason: banUserReason.trim() || undefined })
                }
                disabled={banUserMutation.isPending}
              >
                <Text style={[styles.modalBtnTextPrimary, { color: '#fff' }]}>
                  {banUserMutation.isPending ? 'Banindo...' : 'Banir'}
                </Text>
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
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
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
  reportCard: { padding: spacing.md, borderRadius: 12, borderWidth: 1, marginBottom: spacing.sm },
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
  reportRowWrap: { flexDirection: 'row', alignItems: 'flex-start' },
  reportContent: { flex: 1 },
  reportRow: { flexDirection: 'row', alignItems: 'center' },
  reportTarget: { fontSize: 15, fontWeight: '600' },
  reportReason: { fontSize: 14, marginTop: 4 },
  reportDate: { fontSize: 12, marginTop: 4 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkText: { fontSize: 13, fontWeight: '500' },
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
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
  modalContent: { borderRadius: 16, padding: spacing.lg, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  modalLabel: { fontSize: 12, fontWeight: '600', marginBottom: spacing.xs },
  searchInput: { padding: spacing.md, borderRadius: 10, fontSize: 16, marginBottom: spacing.sm, borderWidth: 1 },
  feedbackInput: { minHeight: 100, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  switchLabel: { fontSize: 15, flex: 1 },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  modalBtn: { flex: 1, padding: spacing.md, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { fontWeight: '600' },
  modalBtnTextPrimary: { color: '#fff', fontWeight: '600' },
  modalBtnDisabled: { opacity: 0.6 },
});
