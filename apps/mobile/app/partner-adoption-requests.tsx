import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, LoadingLogo, PrimaryButton, SecondaryButton, PartnerPanelLayout } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import {
  listAdoptionRequests,
  approveAdoptionRequest,
  rejectAdoptionRequest,
  getAdoptionRequest,
  downloadAdoptionRequestSubmissionPdf,
  type AdoptionRequestWithDetails,
} from '../src/api/adoption-requests';
import { useAuthStore } from '../src/stores/authStore';
import { getFriendlyErrorMessage } from '../src/utils/errorMessage';
import { spacing } from '../src/theme';

const STATUS_LABEL: Record<string, string> = {
  INTERESTED: 'Interesse',
  FORM_SENT: 'Formulário enviado',
  FORM_SUBMITTED: 'Aguardando análise',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  ADOPTION_PROPOSED: 'Proposta enviada',
  ADOPTION_CONFIRMED: 'Adoção confirmada',
};

const STATUS_COLOR: Record<string, string> = {
  INTERESTED: '#6b7280',
  FORM_SENT: '#2563eb',
  FORM_SUBMITTED: '#7c3aed',
  APPROVED: '#059669',
  REJECTED: '#dc2626',
  ADOPTION_PROPOSED: '#d97706',
  ADOPTION_CONFIRMED: '#059669',
};

/** Mapa de fallback para exibir valores em português quando a pergunta não tem options no snapshot. */
const ANSWER_DISPLAY_FALLBACK: Record<string, string> = {
  true: 'Sim',
  false: 'Não',
  DAILY: 'Diariamente',
  FEW_TIMES_WEEK: 'Algumas vezes por semana',
  RARELY: 'Raramente',
  INDIFERENTE: 'Indiferente / Depende do pet',
  LOW: 'Calmo',
  MEDIUM: 'Moderado',
  HIGH: 'Ativo',
  DOG: 'Cachorro',
  CAT: 'Gato',
  BOTH: 'Tanto faz / Indiferente',
  small: 'Pequeno',
  medium: 'Médio',
  large: 'Grande',
  xlarge: 'Extra grande / Muito grande',
  male: 'Macho',
  female: 'Fêmea',
  puppy: 'Filhote (até 1 ano)',
  young: 'Jovem (1 a 3 anos)',
  adult: 'Adulto (3 a 7 anos)',
  senior: 'Idoso (7+ anos)',
  any: 'Indiferente',
  YES: 'Sim',
  NO: 'Não',
  UNKNOWN: 'Não sei',
  nao_tem: 'Não tenho outros pets',
  site: 'Site',
  redes: 'Redes sociais',
  indicacao: 'Indicação',
  evento: 'Evento',
  outro: 'Outro',
  casa: 'Casa',
  apartamento: 'Apartamento',
  propria: 'Própria',
  alugada: 'Alugada',
  parentes: 'Com parentes/amigos',
  sim_total: 'Sim, totalmente telado',
  providenciar: 'Ainda não, mas providenciarei em até 7 dias',
  nao: 'Não',
  nao_se_aplica: 'Não se aplica',
  dry: 'Ração seca',
  wet: 'Ração úmida',
  mixed: 'Mista',
  natural: 'Natural',
  other: 'Outra',
  nao_sei: 'Ainda não sei',
  filhote: 'Filhote (0–1 ano)',
  idoso: 'Idoso (7+ anos)',
  indiferente: 'Indiferente',
};

type SnapshotQuestion = {
  id: string;
  label: string;
  type?: string;
  options?: Array<{ value: string; label: string }>;
};

function formatAnswerForDisplay(question: SnapshotQuestion, value: unknown): string {
  if (value == null || value === '') return '—';
  const str = (v: unknown) => (v === true || v === 'true' ? 'Sim' : v === false || v === 'false' ? 'Não' : String(v));

  if (question.type === 'CHECKBOX') {
    return str(value);
  }
  if (question.type === 'SELECT_SINGLE') {
    const key = String(value).trim();
    const label = question.options?.find((o) => o.value === key)?.label;
    if (label) return label;
    return ANSWER_DISPLAY_FALLBACK[key] ?? key;
  }
  if (question.type === 'SELECT_MULTIPLE' && Array.isArray(value)) {
    const labels = (value as string[]).map((v) => {
      const label = question.options?.find((o) => o.value === String(v))?.label;
      return label ?? ANSWER_DISPLAY_FALLBACK[String(v)] ?? String(v);
    });
    return labels.filter(Boolean).length > 0 ? labels.join(', ') : '—';
  }
  if (Array.isArray(value)) {
    return (value as string[]).map((v) => ANSWER_DISPLAY_FALLBACK[String(v)] ?? String(v)).join(', ');
  }
  const key = String(value).trim();
  return ANSWER_DISPLAY_FALLBACK[key] ?? key;
}

/** Traduz answerDisplay do breakdown quando a API envia valor bruto (ex: FEW_TIMES_WEEK). */
function translateAnswerDisplay(text: string): string {
  if (!text || text === '—') return text;
  const trimmed = text.trim();
  return ANSWER_DISPLAY_FALLBACK[trimmed] ?? text;
}

export default function PartnerAdoptionRequestsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ petId?: string; requestId?: string }>();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [filter, setFilter] = useState<'all' | 'pending'>('pending');
  const [petFilter, setPetFilter] = useState<string | null>(params.petId ?? null);

  useEffect(() => {
    if (params.petId) setPetFilter(params.petId);
  }, [params.petId]);
  const [detailRequestId, setDetailRequestId] = useState<string | null>(null);
  useEffect(() => {
    if (params.requestId) setDetailRequestId(params.requestId);
  }, [params.requestId]);
  const [approveConfirmRequest, setApproveConfirmRequest] = useState<AdoptionRequestWithDetails | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const getAccessToken = useAuthStore((s) => s.getAccessToken);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['me', 'partner', 'adoption-requests', petFilter ?? 'all'],
    queryFn: () => listAdoptionRequests(petFilter ?? undefined),
  });

  const { data: detailRequest } = useQuery({
    queryKey: ['adoption-request', detailRequestId],
    queryFn: () => getAdoptionRequest(detailRequestId!),
    enabled: !!detailRequestId,
  });

  const filtered =
    filter === 'pending'
      ? requests.filter((r) =>
          ['FORM_SENT', 'FORM_SUBMITTED'].includes(r.status),
        )
      : requests;

  const sorted = [...filtered].sort((a, b) => {
    const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return tb - ta;
  });

  const uniquePets = Array.from(
    new Map(requests.map((r) => [r.pet?.id, { id: r.pet?.id, name: r.pet?.name ?? 'Pet' }])).values(),
  ).filter((p) => p.id);

  const approveMutation = useMutation({
    mutationFn: approveAdoptionRequest,
    onSuccess: () => {
      setApproveConfirmRequest(null);
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'adoption-requests'] });
      if (detailRequestId) {
        queryClient.invalidateQueries({ queryKey: ['adoption-request', detailRequestId] });
        setDetailRequestId(null);
      }
    },
    onError: (e: unknown) =>
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível aprovar.')),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, feedback }: { id: string; feedback?: string }) =>
      rejectAdoptionRequest(id, feedback ? { feedback } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'adoption-requests'] });
      if (detailRequestId) {
        queryClient.invalidateQueries({ queryKey: ['adoption-request', detailRequestId] });
        setDetailRequestId(null);
      }
      setRejectFeedback('');
    },
    onError: (e: unknown) =>
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível rejeitar.')),
  });

  const canApprove = (r: AdoptionRequestWithDetails) => r.status === 'FORM_SUBMITTED';
  const canReject = (r: AdoptionRequestWithDetails) =>
    ['FORM_SENT', 'FORM_SUBMITTED'].includes(r.status);

  const handleApprove = (r: AdoptionRequestWithDetails) => {
    setApproveConfirmRequest(r);
  };

  const confirmApprove = () => {
    if (!approveConfirmRequest) return;
    approveMutation.mutate(approveConfirmRequest.id);
  };

  const handleReject = (r: AdoptionRequestWithDetails) => {
    setDetailRequestId(r.id);
    setRejectFeedback('');
    // Open modal with reject form
  };

  const confirmReject = () => {
    if (!detailRequestId) return;
    rejectMutation.mutate({ id: detailRequestId, feedback: rejectFeedback.trim() || undefined });
  };

  const renderItem = ({ item }: { item: AdoptionRequestWithDetails }) => {
    const statusColor = STATUS_COLOR[item.status] ?? colors.textSecondary;
    const showActions = canApprove(item) || canReject(item);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface }]}
        onPress={() => setDetailRequestId(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardRow}>
          <View style={[styles.iconWrap, { backgroundColor: statusColor + '20' }]}>
            <Ionicons name="paw" size={22} color={statusColor} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.petName, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.pet?.name ?? 'Pet'}
            </Text>
            <Text style={[styles.adopterName, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.adopter?.name ?? 'Interessado'}
            </Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {STATUS_LABEL[item.status] ?? item.status}
                </Text>
              </View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
        </View>
        {showActions && (
          <View style={styles.actions}>
            {canApprove(item) && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleApprove(item);
                }}
                disabled={approveMutation.isPending}
              >
                <Text style={styles.actionBtnText}>Aprovar</Text>
              </TouchableOpacity>
            )}
            {canReject(item) && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.error || '#DC2626' }]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleReject(item);
                }}
                disabled={rejectMutation.isPending}
              >
                <Text style={styles.actionBtnText}>Rejeitar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <PartnerPanelLayout>
          <View style={styles.centered}>
            <LoadingLogo size={120} />
          </View>
        </PartnerPanelLayout>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <PartnerPanelLayout>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Solicitações de adoção</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Analise formulários preenchidos e aprove ou rejeite candidatos.
          </Text>
        </View>
        <View style={[styles.filterRow, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'pending' && { backgroundColor: colors.primary }]}
            onPress={() => setFilter('pending')}
          >
            <Text style={[styles.filterText, { color: filter === 'pending' ? '#fff' : colors.textSecondary }]}>
              Pendentes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'all' && { backgroundColor: colors.primary }]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, { color: filter === 'all' ? '#fff' : colors.textSecondary }]}>
              Todas
            </Text>
          </TouchableOpacity>
        </View>
        {uniquePets.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.petFilterScroll}
            contentContainerStyle={styles.petFilterContent}
          >
            <TouchableOpacity
              style={[styles.petFilterBtn, !petFilter && { backgroundColor: colors.primary }]}
              onPress={() => setPetFilter(null)}
            >
              <Text style={[styles.petFilterText, { color: !petFilter ? '#fff' : colors.textSecondary }]}>
                Todos
              </Text>
            </TouchableOpacity>
            {uniquePets.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.petFilterBtn, petFilter === p.id && { backgroundColor: colors.primary }]}
                onPress={() => setPetFilter(p.id!)}
              >
                <Text style={[styles.petFilterText, { color: petFilter === p.id ? '#fff' : colors.textSecondary }]}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        <FlatList
          data={sorted}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {filter === 'pending'
                  ? 'Nenhuma solicitação pendente.'
                  : 'Nenhuma solicitação de adoção.'}
              </Text>
            </View>
          }
        />
      </PartnerPanelLayout>

      <Modal visible={!!approveConfirmRequest} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setApproveConfirmRequest(null)}>
          <Pressable style={[styles.approveConfirmModal, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.approveConfirmTitle, { color: colors.textPrimary }]}>Aprovar solicitação</Text>
            {approveConfirmRequest && (
              <Text style={[styles.approveConfirmText, { color: colors.textSecondary }]}>
                Aprovar {approveConfirmRequest.adopter?.name ?? 'o interessado'} para {approveConfirmRequest.pet?.name ?? 'o pet'}? O pet será marcado como adotado e o interessado receberá no chat o pedido para confirmar a adoção no app.
              </Text>
            )}
            <View style={styles.approveConfirmActions}>
              <SecondaryButton title="Cancelar" onPress={() => setApproveConfirmRequest(null)} style={styles.approveConfirmBtn} />
              <PrimaryButton
                title={approveMutation.isPending ? 'Aprovando...' : 'Aprovar'}
                onPress={confirmApprove}
                disabled={approveMutation.isPending}
                style={styles.approveConfirmBtn}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!detailRequestId} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setDetailRequestId(null)}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            {detailRequest ? (
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                    {detailRequest.pet?.name} · {detailRequest.adopter?.name}
                  </Text>
                </View>
                {detailRequest.submission && (
                  <View style={[styles.submissionSection, { borderTopColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                      Respostas do formulário
                    </Text>
                    {(() => {
                      const answers = detailRequest.submission.answers as Record<string, unknown>;
                      const snapshot = detailRequest.submission.templateSnapshot as {
                        questions?: SnapshotQuestion[];
                      };
                      const questions = snapshot?.questions ?? [];
                      return (
                        <>
                          <View style={[styles.answerTableHeader, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.answerTableHeaderText, styles.answerColPergunta, { color: colors.textSecondary }]}>
                              Pergunta
                            </Text>
                            <Text style={[styles.answerTableHeaderText, styles.answerColResposta, { color: colors.textSecondary }]}>
                              Resposta
                            </Text>
                          </View>
                          {questions.map((q) => (
                            <View
                              key={q.id}
                              style={[styles.answerRow, { borderBottomColor: colors.border }]}
                            >
                              <View style={styles.answerColPergunta}>
                                <Text style={[styles.answerLabel, { color: colors.textSecondary }]}>
                                  {q.label}
                                </Text>
                              </View>
                              <View style={styles.answerColResposta}>
                                <Text style={[styles.answerValue, { color: colors.textPrimary }]}>
                                  {formatAnswerForDisplay(q, answers[q.id])}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </>
                      );
                    })()}
                  </View>
                )}
                <View style={styles.modalActions}>
                  <View style={styles.modalActionsRow}>
                    {detailRequest.submission && (
                      <TouchableOpacity
                        style={[styles.modalActionBtn, styles.modalActionBtnPrimary, { borderColor: colors.primary }]}
                        onPress={async () => {
                          setDownloadingPdf(true);
                          try {
                            await downloadAdoptionRequestSubmissionPdf(
                              detailRequest.id,
                              getAccessToken,
                              detailRequest.pet?.name,
                            );
                          } catch (e) {
                            Alert.alert(
                              'Erro',
                              getFriendlyErrorMessage(e, 'Não foi possível baixar o PDF.'),
                            );
                          } finally {
                            setDownloadingPdf(false);
                          }
                        }}
                        disabled={downloadingPdf}
                      >
                        <Ionicons name="download-outline" size={20} color={colors.primary} />
                        <Text style={[styles.modalActionBtnText, { color: colors.primary }]}>
                          {downloadingPdf ? 'Baixando...' : 'Download PDF'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {detailRequest.conversationId && (
                      <TouchableOpacity
                        style={[styles.modalActionBtn, styles.modalActionBtnPrimary, { borderColor: colors.primary }]}
                        onPress={() => {
                          setDetailRequestId(null);
                          router.push(`/(tabs)/chat/${detailRequest.conversationId}`);
                        }}
                      >
                        <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
                        <Text style={[styles.modalActionBtnText, { color: colors.primary }]}>Ver conversa</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <SecondaryButton title="Fechar" onPress={() => setDetailRequestId(null)} style={styles.modalCloseBtn} />
                </View>
              </ScrollView>
            ) : (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: spacing.md },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  filterRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    marginBottom: spacing.sm,
  },
  petFilterScroll: { marginBottom: spacing.sm, maxHeight: 44 },
  petFilterContent: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  petFilterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  petFilterText: { fontSize: 14, fontWeight: '600' },
  sortRow: { flexDirection: 'row', borderRadius: 10, padding: 4, marginBottom: spacing.lg },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  sortText: { fontSize: 14, fontWeight: '600' },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterText: { fontSize: 14, fontWeight: '600' },
  list: { paddingBottom: spacing.xl },
  card: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  cardContent: { flex: 1, minWidth: 0 },
  petName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  adopterName: { fontSize: 14, marginBottom: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusText: { fontSize: 13, fontWeight: '600' },
  matchScoreBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  matchScoreText: { fontSize: 13, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8, marginTop: spacing.sm },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: { fontSize: 15, marginTop: spacing.sm },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '92%',
    borderRadius: 16,
    padding: spacing.lg,
  },
  approveConfirmModal: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: spacing.lg,
  },
  approveConfirmTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  approveConfirmText: { fontSize: 15, lineHeight: 22, marginBottom: spacing.lg },
  approveConfirmActions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
  approveConfirmBtn: { flex: 1 },
  modalScroll: { maxHeight: 560 },
  modalHeader: { marginBottom: spacing.md },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  modalHeaderBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  matchScoreBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  matchScoreTextLarge: { fontSize: 16, fontWeight: '700' },
  breakdownSection: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    marginTop: spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: 8,
    flexWrap: 'wrap',
  },
  breakdownLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, flex: 1, minWidth: 0 },
  breakdownLabel: { fontSize: 14, flex: 1, flexWrap: 'wrap' },
  breakdownAnswer: { fontSize: 13, flex: 1, minWidth: 0, flexWrap: 'wrap' },
  breakdownPoints: { fontSize: 14, fontWeight: '700' },
  submissionSection: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: spacing.sm },
  answerTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    gap: spacing.sm,
  },
  answerTableHeaderText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  answerColPergunta: { flex: 1.2, minWidth: 0 },
  answerColResposta: { flex: 1, minWidth: 0 },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  answerLabel: { fontSize: 13, flexWrap: 'wrap' },
  answerValue: { fontSize: 15, flexWrap: 'wrap' },
  rejectSection: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    marginBottom: spacing.md,
  },
  feedbackInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: spacing.sm,
  },
  modalActions: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  modalActionBtn: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  modalActionBtnPrimary: {
    // borderColor e texto definidos inline com colors.primary
  },
  modalActionBtnText: { fontSize: 15, fontWeight: '600' },
  modalCloseBtn: { alignSelf: 'stretch' },
  rejectBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  rejectBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
  },
  chatBtnText: { fontSize: 15, fontWeight: '600' },
});
