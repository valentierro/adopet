import { useCallback, useState, useEffect, useRef } from 'react';
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
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, PageIntro, Toast, LoadingLogo } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import {
  getPendingPets,
  setPetPublication,
  getPendingVerifications,
  getApprovedVerifications,
  getReports,
  resolveReport,
  getAdminStats,
  getAdminAdoptions,
  createAdoption,
  searchAdminUsers,
  getAdminPetsAvailable,
  getAdminPendingAdoptionsByTutor,
  resolveVerification,
  revokeVerification,
  type VerificationPendingItem,
  type ReportItem,
  type AdoptionItem,
  type PetAvailableItem,
  type PendingAdoptionByTutorItem,
  type UserSearchItem,
} from '../../src/api/admin';
import { getFriendlyErrorMessage } from '../../src/utils/errorMessage';
import { spacing } from '../../src/theme';

const VERIFICATION_TYPE_LABEL: Record<string, string> = {
  USER_VERIFIED: 'Verificação de usuário',
  PET_VERIFIED: 'Verificação de pet',
};

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

function SummaryCard({
  title,
  count,
  sub,
  colors,
  onPress,
}: {
  title: string;
  count: number;
  sub?: string;
  colors: { textPrimary: string; textSecondary: string; primary: string };
  onPress?: () => void;
}) {
  const card = (
    <View style={[styles.summaryCard, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
      <Text style={[styles.summaryCount, { color: colors.primary }]}>{count}</Text>
      <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>{title}</Text>
      {sub != null && <Text style={[styles.summarySub, { color: colors.textSecondary }]}>{sub}</Text>}
    </View>
  );
  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{card}</TouchableOpacity>;
  }
  return card;
}

export default function AdminScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [selectedPetIds, setSelectedPetIds] = useState<Set<string>>(new Set());
  const [selectedVerificationIds, setSelectedVerificationIds] = useState<Set<string>>(new Set());
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());

  const { data: pendingPets = [], isLoading: loadingPets, refetch: refetchPets, isRefetching: refetchingPets } = useQuery({
    queryKey: ['admin', 'pending-pets'],
    queryFn: getPendingPets,
  });

  const { data: pending = [], isLoading: loadingVerifications, refetch: refetchVerifications, isRefetching: refetchingVerifications } = useQuery({
    queryKey: ['admin', 'verifications'],
    queryFn: getPendingVerifications,
  });

  const { data: approvedVerifications = [], refetch: refetchApproved, isRefetching: refetchingApproved } = useQuery({
    queryKey: ['admin', 'verifications-approved'],
    queryFn: getApprovedVerifications,
  });

  const { data: reports = [], isLoading: loadingReports, refetch: refetchReports, isRefetching: refetchingReports } = useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: getReports,
  });

  const { data: stats, refetch: refetchStats, isRefetching: refetchingStats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: getAdminStats,
  });

  const { data: adoptionsList = [], refetch: refetchAdoptions, isRefetching: refetchingAdoptions } = useQuery({
    queryKey: ['admin', 'adoptions'],
    queryFn: getAdminAdoptions,
  });

  const { data: petsAvailable = [], refetch: refetchPetsAvailable } = useQuery({
    queryKey: ['admin', 'pets-available'],
    queryFn: getAdminPetsAvailable,
  });

  const { data: pendingAdoptionsByTutor = [], refetch: refetchPendingByTutor } = useQuery({
    queryKey: ['admin', 'pending-adoptions-by-tutor'],
    queryFn: getAdminPendingAdoptionsByTutor,
  });

  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserSearchItem[]>([]);
  const [userSearching, setUserSearching] = useState(false);
  useEffect(() => {
    if (!userSearchQuery.trim() || userSearchQuery.length < 2) {
      setUserSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setUserSearching(true);
      try {
        const list = await searchAdminUsers(userSearchQuery);
        setUserSearchResults(list);
      } catch {
        setUserSearchResults([]);
      } finally {
        setUserSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [userSearchQuery]);

  const [registerPetId, setRegisterPetId] = useState<string | null>(null);
  const [registerAdopterId, setRegisterAdopterId] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedAdoption, setSelectedAdoption] = useState<AdoptionItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [resolveReportModal, setResolveReportModal] = useState<{ reportId: string } | null>(null);
  const [resolveReportFeedback, setResolveReportFeedback] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const sectionY = useRef<Record<string, number>>({});
  const pendingByTutorRef = useRef<View>(null);
  const adoptionsRef = useRef<View>(null);
  const pendingPetsRef = useRef<View>(null);
  const verificationsRef = useRef<View>(null);
  const reportsRef = useRef<View>(null);

  const scrollToSection = useCallback((key: string) => {
    const y = sectionY.current[key];
    if (typeof y === 'number' && scrollRef.current) {
      scrollRef.current.scrollTo({ y: Math.max(0, y - 20), animated: true });
    }
  }, []);
  const createAdoptionMutation = useMutation({
    mutationFn: ({ petId, adopterUserId }: { petId: string; adopterUserId: string }) => createAdoption(petId, adopterUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'adoptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pets-available'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-adoptions-by-tutor'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'tutor-stats'] });
      setShowRegisterModal(false);
      setRegisterPetId(null);
      setRegisterAdopterId(null);
      setUserSearchQuery('');
      setUserSearchResults([]);
      setToastMessage('Adoção registrada. O pet foi marcado como adotado.');
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível registrar a adoção.')),
  });

  const setPublicationMutation = useMutation({
    mutationFn: ({ petId, status }: { petId: string; status: 'APPROVED' | 'REJECTED' }) => setPetPublication(petId, status),
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-pets'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      setToastMessage(v.status === 'APPROVED' ? 'Anúncio aprovado.' : 'Anúncio rejeitado.');
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível atualizar.')),
  });

  const resolveVerificationMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) => resolveVerification(id, status),
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

  const resolveReportMutation = useMutation({
    mutationFn: ({ reportId, resolutionFeedback }: { reportId: string; resolutionFeedback?: string }) =>
      resolveReport(reportId, resolutionFeedback ? { resolutionFeedback } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      setToastMessage('Denúncia marcada como resolvida.');
      setResolveReportModal(null);
      setResolveReportFeedback('');
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível resolver.')),
  });

  const onRefresh = useCallback(() => {
    refetchPets();
    refetchVerifications();
    refetchApproved();
    refetchReports();
    refetchStats();
    refetchAdoptions();
    refetchPetsAvailable();
    refetchPendingByTutor();
    setSelectedPetIds(new Set());
    setSelectedVerificationIds(new Set());
    setSelectedReportIds(new Set());
  }, [refetchPets, refetchVerifications, refetchApproved, refetchReports, refetchStats, refetchAdoptions, refetchPetsAvailable, refetchPendingByTutor]);

  const togglePetSelection = (id: string) => {
    setSelectedPetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleVerificationSelection = (id: string) => {
    setSelectedVerificationIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleReportSelection = (id: string) => {
    setSelectedReportIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePetPublication = (petId: string, status: 'APPROVED' | 'REJECTED') => {
    Alert.alert(
      status === 'APPROVED' ? 'Aprovar anúncio' : 'Rejeitar anúncio',
      status === 'APPROVED' ? 'Este pet passará a aparecer no feed geral.' : 'Este anúncio não aparecerá no feed.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: status === 'APPROVED' ? 'Aprovar' : 'Rejeitar', style: status === 'REJECTED' ? 'destructive' : 'default', onPress: () => setPublicationMutation.mutate({ petId, status }) },
      ]
    );
  };

  const handleBatchPetPublication = (status: 'APPROVED' | 'REJECTED') => {
    const ids = Array.from(selectedPetIds);
    if (ids.length === 0) return;
    Alert.alert(
      status === 'APPROVED' ? 'Aprovar selecionados' : 'Rejeitar selecionados',
      `Confirmar ${status === 'APPROVED' ? 'aprovação' : 'rejeição'} de ${ids.length} anúncio(s)?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: status === 'APPROVED' ? 'Aprovar todos' : 'Rejeitar todos',
          style: status === 'REJECTED' ? 'destructive' : 'default',
          onPress: async () => {
            for (const petId of ids) {
              await setPetPublication(petId, status);
            }
            setSelectedPetIds(new Set());
            queryClient.invalidateQueries({ queryKey: ['admin', 'pending-pets'] });
            queryClient.invalidateQueries({ queryKey: ['feed'] });
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
        { text: status === 'APPROVED' ? 'Aprovar' : 'Rejeitar', style: status === 'REJECTED' ? 'destructive' : 'default', onPress: () => resolveVerificationMutation.mutate({ id: item.id, status }) },
      ]
    );
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
          },
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

  const handleResolveReport = (r: ReportItem) => {
    setResolveReportModal({ reportId: r.id });
    setResolveReportFeedback('');
  };

  const handleResolveReportSubmit = () => {
    if (!resolveReportModal) return;
    resolveReportMutation.mutate({
      reportId: resolveReportModal.reportId,
      resolutionFeedback: resolveReportFeedback.trim() || undefined,
    });
  };

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
        },
      },
    ]);
  };

  const refreshing =
    refetchingPets ||
    refetchingVerifications ||
    refetchingApproved ||
    refetchingReports ||
    refetchingStats ||
    refetchingAdoptions;
  const unresolvedReports = reports.filter((r) => !r.resolvedAt);

  return (
    <ScreenContainer
      ref={scrollRef}
      scroll
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View ref={scrollContentRef} collapsable={false}>
        <PageIntro
          title="Administração"
          subtitle="Dashboard, adoções, anúncios, denúncias e verificações."
        />

        {/* Dashboard: 3 cards em cima, 3 embaixo */}
        <View style={styles.summaryRow}>
          <SummaryCard title="Total de adoções" count={stats?.totalAdoptions ?? 0} colors={colors} onPress={() => scrollToSection('adoptions')} />
          <SummaryCard title="Adoções este mês" count={stats?.adoptionsThisMonth ?? 0} colors={colors} onPress={() => scrollToSection('adoptions')} />
          <SummaryCard title="Anúncios pendentes" count={pendingPets.length} colors={colors} onPress={() => scrollToSection('pendingPets')} />
        </View>
        <View style={styles.summaryRow}>
          <SummaryCard title="Verificações" count={pending.length} sub="pendentes" colors={colors} onPress={() => scrollToSection('verifications')} />
          <SummaryCard title="Denúncias abertas" count={unresolvedReports.length} colors={colors} onPress={() => scrollToSection('reports')} />
          <SummaryCard title="Marcados adotado" count={stats?.pendingAdoptionsByTutorCount ?? 0} sub="pelo tutor" colors={colors} onPress={() => scrollToSection('pendingByTutor')} />
        </View>

        {/* Pets marcados como adotados pelo tutor (aguardando confirmação) */}
        {(pendingAdoptionsByTutor.length > 0) && (
          <View
            ref={pendingByTutorRef}
            onLayout={(e: LayoutChangeEvent) => { sectionY.current.pendingByTutor = e.nativeEvent.layout.y; }}
            collapsable={false}
          >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Pets marcados como adotados pelo tutor ({pendingAdoptionsByTutor.length})</Text>
          <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
            O tutor marcou o pet como adotado. Valide em até 48h ou o sistema marcará os pontos automaticamente.
          </Text>
          {pendingAdoptionsByTutor.map((item) => (
            <View key={item.petId} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.background }]}>
              <View style={styles.adoptionCardHeader}>
                <Text style={[styles.adoptionPetName, { color: colors.textPrimary }]}>{item.petName}</Text>
                <View style={[styles.adoptionBadge, styles.adoptionBadgePending, { backgroundColor: (colors.error || '#DC2626') + '20' }]}>
                  <Ionicons name="time-outline" size={14} color={colors.error || '#DC2626'} />
                  <Text style={[styles.adoptionBadgeText, { color: colors.error || '#DC2626' }]}>Aguardando confirmação</Text>
                </View>
              </View>
              <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>Tutor: {item.tutorName}</Text>
              <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
                Marcado em {new Date(item.markedAt).toLocaleDateString('pt-BR')} às {new Date(item.markedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
              {item.autoApproveAt ? (
                <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
                  Validação automática em {new Date(item.autoApproveAt).toLocaleDateString('pt-BR')} às {new Date(item.autoApproveAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              ) : null}
              <TouchableOpacity
                style={[styles.linkBtn, { marginTop: spacing.sm }]}
                onPress={() => router.push({ pathname: '/pet/[id]', params: { id: item.petId } })}
              >
                <Ionicons name="image-outline" size={14} color={colors.primary} />
                <Text style={[styles.linkText, { color: colors.primary }]}>Ver anúncio</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.linkBtn]}
                onPress={() => router.push({ pathname: '/tutor-profile', params: { petId: item.petId } })}
              >
                <Ionicons name="person-outline" size={14} color={colors.primary} />
                <Text style={[styles.linkText, { color: colors.primary }]}>Ver perfil do tutor</Text>
              </TouchableOpacity>
            </View>
          ))}
          </View>
        )}

        {/* Adoções registradas + Registrar adoção */}
        <View ref={adoptionsRef} onLayout={(e: LayoutChangeEvent) => { sectionY.current.adoptions = e.nativeEvent.layout.y; }} collapsable={false}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Adoções registradas ({adoptionsList.length})</Text>
      <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
        Registros com tutor e adotante. Registrar nova adoção marca o pet como adotado e atualiza a pontuação do tutor.
      </Text>
      <TouchableOpacity
        style={[styles.registerAdoptionBtn, { backgroundColor: colors.primary }]}
        onPress={() => setShowRegisterModal(true)}
      >
        <Text style={styles.registerAdoptionBtnText}>Registrar adoção</Text>
      </TouchableOpacity>
      {adoptionsList.length === 0 ? (
        <View style={[styles.emptyBlock, { backgroundColor: colors.surface }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhuma adoção registrada ainda.</Text>
        </View>
      ) : (
        adoptionsList.slice(0, 20).map((a) => (
          <TouchableOpacity
            key={a.id}
            style={[styles.card, styles.adoptionCard, { backgroundColor: colors.surface, borderColor: colors.background }]}
            onPress={() => setSelectedAdoption(a)}
            activeOpacity={0.7}
          >
            <View style={styles.adoptionCardHeader}>
              <Text style={[styles.adoptionPetName, { color: colors.textPrimary }]}>{a.petName}</Text>
              <View style={[styles.adoptionBadge, styles.adoptionBadgeConfirmed, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                <Text style={[styles.adoptionBadgeText, { color: colors.primary }]}>Confirmado</Text>
              </View>
            </View>
            <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>Tutor: {a.tutorName}</Text>
            <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>Adotante: {a.adopterName}</Text>
            <Text style={[styles.cardDate, { color: colors.textSecondary }]}>{new Date(a.adoptedAt).toLocaleDateString('pt-BR')}</Text>
          </TouchableOpacity>
        ))
      )}
      {adoptionsList.length > 20 && (
        <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>Exibindo as 20 mais recentes.</Text>
      )}
        </View>

      {/* Modal Registrar adoção */}
      <Modal visible={showRegisterModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Registrar adoção</Text>
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Pet</Text>
            <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
              {petsAvailable.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.pickerItem, registerPetId === p.id && { backgroundColor: colors.primary + '25' }]}
                  onPress={() => setRegisterPetId(p.id)}
                >
                  <Text style={[styles.pickerItemText, { color: colors.textPrimary }]}>{p.name}</Text>
                  <Text style={[styles.pickerItemSub, { color: colors.textSecondary }]}>{p.ownerName}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {petsAvailable.length === 0 && <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>Nenhum pet disponível (já adotados ou não aprovados).</Text>}
            <Text style={[styles.modalLabel, { color: colors.textSecondary, marginTop: spacing.md }]}>Adotante (busque por nome ou email)</Text>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
              placeholder="Nome ou email..."
              placeholderTextColor={colors.textSecondary}
              value={userSearchQuery}
              onChangeText={setUserSearchQuery}
              autoCapitalize="none"
            />
            {userSearching && <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />}
            <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
              {userSearchResults.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={[styles.pickerItem, registerAdopterId === u.id && { backgroundColor: colors.primary + '25' }]}
                  onPress={() => setRegisterAdopterId(u.id)}
                >
                  <Text style={[styles.pickerItemText, { color: colors.textPrimary }]}>{u.name}</Text>
                  <Text style={[styles.pickerItemSub, { color: colors.textSecondary }]}>{u.email}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.background }]} onPress={() => setShowRegisterModal(false)}>
                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  { backgroundColor: colors.primary },
                  (!registerPetId || !registerAdopterId || createAdoptionMutation.isPending) && styles.modalBtnDisabled,
                ]}
                onPress={() => {
                  if (registerPetId && registerAdopterId) createAdoptionMutation.mutate({ petId: registerPetId, adopterUserId: registerAdopterId });
                }}
                disabled={!registerPetId || !registerAdopterId || createAdoptionMutation.isPending}
              >
                <Text style={styles.modalBtnTextPrimary}>{createAdoptionMutation.isPending ? 'Salvando...' : 'Registrar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Detalhes da adoção */}
      <Modal visible={selectedAdoption != null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setSelectedAdoption(null)} />
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]} collapsable={false}>
            {selectedAdoption ? (
              <>
                <View style={[styles.adoptionBadge, styles.adoptionBadgeConfirmed, { backgroundColor: colors.primary + '20', alignSelf: 'flex-start', marginBottom: spacing.md }]}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                  <Text style={[styles.adoptionBadgeText, { color: colors.primary }]}>Confirmado</Text>
                </View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{selectedAdoption.petName}</Text>
                <Text style={[styles.detailRow, { color: colors.textSecondary }]}>
                  <Text style={styles.detailLabel}>Tutor: </Text>
                  {selectedAdoption.tutorName}
                </Text>
                <Text style={[styles.detailRow, { color: colors.textSecondary }]}>
                  <Text style={styles.detailLabel}>Adotante: </Text>
                  {selectedAdoption.adopterName}
                </Text>
                <Text style={[styles.detailRow, { color: colors.textSecondary }]}>
                  <Text style={styles.detailLabel}>Data do registro: </Text>
                  {new Date(selectedAdoption.adoptedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </Text>
                <View style={[styles.modalActions, { marginTop: spacing.lg }]}>
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]}
                    onPress={() => {
                      setSelectedAdoption(null);
                      router.push({ pathname: '/pet/[id]', params: { id: selectedAdoption.petId } });
                    }}
                  >
                    <Ionicons name="image-outline" size={18} color="#fff" />
                    <Text style={[styles.modalBtnText, styles.modalBtnTextPrimary]}>Ver anúncio do pet</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.background, marginTop: spacing.sm }]}
                  onPress={() => setSelectedAdoption(null)}
                >
                  <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Fechar</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Anúncios pendentes */}
        <View ref={pendingPetsRef} onLayout={(e: LayoutChangeEvent) => { sectionY.current.pendingPets = e.nativeEvent.layout.y; }} collapsable={false}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Anúncios pendentes ({pendingPets.length})</Text>
      <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>Novos pets só entram no feed após aprovação.</Text>
      {pendingPets.length > 0 && selectedPetIds.size > 0 && (
        <View style={styles.batchBar}>
          <Text style={[styles.batchLabel, { color: colors.textSecondary }]}>{selectedPetIds.size} selecionado(s)</Text>
          <View style={styles.batchActions}>
            <TouchableOpacity style={[styles.batchBtn, { backgroundColor: colors.primary }]} onPress={() => handleBatchPetPublication('APPROVED')} disabled={setPublicationMutation.isPending}>
              {setPublicationMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark-circle" size={16} color="#fff" />}
              <Text style={styles.batchBtnText}>{setPublicationMutation.isPending ? 'Aprovando...' : 'Aprovar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.batchBtn, { backgroundColor: colors.error || '#DC2626' }]} onPress={() => handleBatchPetPublication('REJECTED')} disabled={setPublicationMutation.isPending}>
              {setPublicationMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="close-circle" size={16} color="#fff" />}
              <Text style={styles.batchBtnText}>{setPublicationMutation.isPending ? 'Rejeitando...' : 'Rejeitar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {loadingPets ? (
        <View style={styles.sectionLoading}>
          <LoadingLogo size={100} />
        </View>
      ) : pendingPets.length === 0 ? (
        <View style={[styles.emptyBlock, { backgroundColor: colors.surface }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhum anúncio pendente.</Text>
        </View>
      ) : (
        pendingPets.map((pet) => (
          <View key={pet.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.background }]}>
            <View style={styles.petRowWrap}>
              {pendingPets.length > 0 && (
                <TouchableOpacity
                  style={[styles.checkbox, selectedPetIds.has(pet.id) && { backgroundColor: colors.primary }]}
                  onPress={() => togglePetSelection(pet.id)}
                >
                  {selectedPetIds.has(pet.id) && <Ionicons name="checkmark" size={14} color="#fff" />}
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.petRow} onPress={() => router.push(`/pet/${pet.id}`)} activeOpacity={0.8}>
                {pet.photos?.[0] ? (
                  <ExpoImage source={{ uri: pet.photos[0] }} style={styles.petThumb} contentFit="cover" />
                ) : (
                  <View style={[styles.petThumb, styles.petThumbPlaceholder, { backgroundColor: colors.background }]} />
                )}
                <View style={styles.petInfo}>
                  <Text style={[styles.petName, { color: colors.textPrimary }]} numberOfLines={1}>{pet.name}</Text>
                  <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>{pet.species} • {pet.age} ano(s)</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.linkRow}>
              <TouchableOpacity onPress={() => router.push(`/pet/${pet.id}`)} style={styles.linkBtn}>
                <Ionicons name="image-outline" size={14} color={colors.primary} />
                <Text style={[styles.linkText, { color: colors.primary }]}>Ver anúncio</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push({ pathname: '/tutor-profile', params: { petId: pet.id } })} style={styles.linkBtn}>
                <Ionicons name="person-outline" size={14} color={colors.primary} />
                <Text style={[styles.linkText, { color: colors.primary }]}>Ver perfil do tutor</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => handlePetPublication(pet.id, 'APPROVED')} disabled={setPublicationMutation.isPending}>
                {setPublicationMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark-circle" size={18} color="#fff" />}
                <Text style={styles.actionBtnText}>{setPublicationMutation.isPending ? 'Aprovando...' : 'Aprovar'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.error || '#DC2626' }]} onPress={() => handlePetPublication(pet.id, 'REJECTED')} disabled={setPublicationMutation.isPending}>
                {setPublicationMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="close-circle" size={18} color="#fff" />}
                <Text style={styles.actionBtnText}>{setPublicationMutation.isPending ? 'Rejeitando...' : 'Rejeitar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
        </View>

      {/* Verificações pendentes */}
        <View ref={verificationsRef} onLayout={(e: LayoutChangeEvent) => { sectionY.current.verifications = e.nativeEvent.layout.y; }} collapsable={false}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: spacing.xl }]}>Verificações pendentes ({pending.length})</Text>
      {pending.length > 0 && selectedVerificationIds.size > 0 && (
        <View style={styles.batchBar}>
          <Text style={[styles.batchLabel, { color: colors.textSecondary }]}>{selectedVerificationIds.size} selecionada(s)</Text>
          <View style={styles.batchActions}>
            <TouchableOpacity style={[styles.batchBtn, { backgroundColor: colors.primary }]} onPress={() => handleBatchVerification('APPROVED')}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={styles.batchBtnText}>Aprovar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.batchBtn, { backgroundColor: colors.error || '#DC2626' }]} onPress={() => handleBatchVerification('REJECTED')}>
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
      ) : pending.length === 0 ? (
        <View style={[styles.emptyBlock, { backgroundColor: colors.surface }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhuma solicitação pendente.</Text>
        </View>
      ) : (
        pending.map((item) => (
          <View key={item.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.background }]}>
            <View style={styles.cardRowWrap}>
              <TouchableOpacity
                style={[styles.checkbox, selectedVerificationIds.has(item.id) && { backgroundColor: colors.primary }]}
                onPress={() => toggleVerificationSelection(item.id)}
              >
                {selectedVerificationIds.has(item.id) && <Ionicons name="checkmark" size={14} color="#fff" />}
              </TouchableOpacity>
              <View style={styles.cardRow}>
                <Text style={[styles.cardType, { color: colors.textPrimary }]}>{VERIFICATION_TYPE_LABEL[item.type] ?? item.type}</Text>
                {item.petId ? (
                  <TouchableOpacity onPress={() => router.push(`/pet/${item.petId!}`)} style={styles.linkBtn}>
                    <Ionicons name="image-outline" size={12} color={colors.primary} />
                    <Text style={[styles.linkText, { color: colors.primary, fontSize: 12 }]}>Ver pet</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
            <Text style={[styles.cardDate, { color: colors.textSecondary }]}>{new Date(item.createdAt).toLocaleDateString('pt-BR')}</Text>
            <View style={styles.cardActions}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => handleResolveVerification(item, 'APPROVED')} disabled={resolveVerificationMutation.isPending}>
                {resolveVerificationMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark-circle" size={18} color="#fff" />}
                <Text style={styles.actionBtnText}>{resolveVerificationMutation.isPending ? 'Aprovando...' : 'Aprovar'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.error || '#DC2626' }]} onPress={() => handleResolveVerification(item, 'REJECTED')} disabled={resolveVerificationMutation.isPending}>
                {resolveVerificationMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="close-circle" size={18} color="#fff" />}
                <Text style={styles.actionBtnText}>{resolveVerificationMutation.isPending ? 'Rejeitando...' : 'Rejeitar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
        </View>

      {/* Verificações aprovadas (revogar) */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: spacing.xl }]}>Verificações aprovadas ({approvedVerifications.length})</Text>
      <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>Revogar remove o selo de verificado.</Text>
      {approvedVerifications.length === 0 ? (
        <View style={[styles.emptyBlock, { backgroundColor: colors.surface }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhuma verificação aprovada.</Text>
        </View>
      ) : (
        approvedVerifications.map((item) => (
          <View key={item.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.background }]}>
            <View style={styles.cardRow}>
              <Text style={[styles.cardType, { color: colors.textPrimary }]}>{VERIFICATION_TYPE_LABEL[item.type] ?? item.type}</Text>
              {item.petId ? (
                <TouchableOpacity onPress={() => router.push(`/pet/${item.petId!}`)} style={styles.linkBtn}>
                  <Ionicons name="image-outline" size={12} color={colors.primary} />
                  <Text style={[styles.linkText, { color: colors.primary, fontSize: 12 }]}>Ver pet</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={[styles.cardDate, { color: colors.textSecondary }]}>{new Date(item.createdAt).toLocaleDateString('pt-BR')}</Text>
            <TouchableOpacity style={[styles.actionBtn, styles.revokeBtn, { borderColor: colors.error || '#DC2626' }]} onPress={() => handleRevoke(item)} disabled={revokeMutation.isPending}>
              {revokeMutation.isPending ? <ActivityIndicator size="small" color={colors.error || '#DC2626'} /> : <Ionicons name="remove-circle-outline" size={18} color={colors.error || '#DC2626'} />}
              <Text style={[styles.actionBtnTextRevoke, { color: colors.error || '#DC2626' }]}>{revokeMutation.isPending ? 'Revogando...' : 'Revogar'}</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      {/* Denúncias */}
      <View ref={reportsRef} onLayout={(e: LayoutChangeEvent) => { sectionY.current.reports = e.nativeEvent.layout.y; }} collapsable={false}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: spacing.xl }]}>Denúncias ({reports.length})</Text>
      <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>{unresolvedReports.length} não resolvidas.</Text>
      {unresolvedReports.length > 0 && selectedReportIds.size > 0 && (
        <View style={styles.batchBar}>
          <Text style={[styles.batchLabel, { color: colors.textSecondary }]}>{selectedReportIds.size} selecionada(s)</Text>
          <TouchableOpacity style={[styles.batchBtn, { backgroundColor: colors.primary }]} onPress={handleBatchResolveReports} disabled={resolveReportMutation.isPending}>
            {resolveReportMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark-done" size={16} color="#fff" />}
            <Text style={styles.batchBtnText}>{resolveReportMutation.isPending ? 'Resolvendo...' : 'Resolver todas'}</Text>
          </TouchableOpacity>
        </View>
      )}
      {loadingReports ? (
        <View style={styles.sectionLoading}>
          <LoadingLogo size={100} />
        </View>
      ) : reports.length === 0 ? (
        <View style={[styles.emptyBlock, { backgroundColor: colors.surface }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhuma denúncia.</Text>
        </View>
      ) : (
        reports.map((r) => (
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
                    <Text style={[styles.linkText, { color: colors.primary, fontSize: 12 }]}>Ver anúncio denunciado</Text>
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
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.primary, marginTop: spacing.sm }]}
                    onPress={() => handleResolveReport(r)}
                    disabled={resolveReportMutation.isPending}
                  >
                    {resolveReportMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark-done" size={18} color="#fff" />}
                    <Text style={styles.actionBtnText}>{resolveReportMutation.isPending ? 'Resolvendo...' : 'Resolver denúncia'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        ))
      )}
        </View>

      {/* Modal Resolver denúncia com feedback */}
      <Modal visible={!!resolveReportModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Resolver denúncia</Text>
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Feedback para o denunciador (opcional)</Text>
            <TextInput
              style={[styles.searchInput, styles.feedbackInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
              placeholder="Ex: Analisamos a denúncia e tomamos as medidas necessárias."
              placeholderTextColor={colors.textSecondary}
              value={resolveReportFeedback}
              onChangeText={setResolveReportFeedback}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.background }]} onPress={() => { setResolveReportModal(null); setResolveReportFeedback(''); }}>
                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }, resolveReportMutation.isPending && styles.modalBtnDisabled]}
                onPress={handleResolveReportSubmit}
                disabled={resolveReportMutation.isPending}
              >
                <Text style={styles.modalBtnTextPrimary}>{resolveReportMutation.isPending ? 'Resolvendo...' : 'Resolver'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    flexWrap: 'nowrap',
  },
  summaryCard: {
    flex: 1,
    minWidth: 0,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCount: { fontSize: 24, fontWeight: '800' },
  summaryTitle: { fontSize: 12, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  summarySub: { fontSize: 11, marginTop: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.xs },
  sectionSub: { fontSize: 13, marginBottom: spacing.md },
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
  batchBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  batchBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  loader: { marginVertical: spacing.md },
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
  petRowWrap: { flexDirection: 'row', alignItems: 'center' },
  petRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  petThumb: { width: 48, height: 48, borderRadius: 8 },
  petThumbPlaceholder: {},
  petInfo: { flex: 1, marginLeft: spacing.sm },
  petName: { fontSize: 16, fontWeight: '600' },
  linkRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkText: { fontSize: 13, fontWeight: '500' },
  cardRowWrap: { flexDirection: 'row', alignItems: 'center' },
  cardRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  cardType: { fontSize: 16, fontWeight: '600' },
  cardMeta: { fontSize: 13 },
  cardDate: { fontSize: 12, marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  revokeBtn: { borderWidth: 1, backgroundColor: 'transparent', marginTop: spacing.sm },
  actionBtnTextRevoke: { fontWeight: '600', fontSize: 14 },
  reportCard: { padding: spacing.md, borderRadius: 12, borderWidth: 1, marginBottom: spacing.sm },
  reportRowWrap: { flexDirection: 'row', alignItems: 'flex-start' },
  reportContent: { flex: 1 },
  reportRow: { flexDirection: 'row', alignItems: 'center' },
  reportTarget: { fontSize: 15, fontWeight: '600' },
  reportReason: { fontSize: 14, marginTop: 4 },
  reportDate: { fontSize: 12, marginTop: 4 },
  resolvedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: spacing.sm },
  resolvedText: { fontSize: 12, fontWeight: '600' },
  registerAdoptionBtn: { padding: spacing.md, borderRadius: 10, alignItems: 'center', marginBottom: spacing.md },
  registerAdoptionBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  adoptionCard: {},
  adoptionCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm, marginBottom: 2 },
  adoptionPetName: { fontSize: 16, fontWeight: '600' },
  adoptionBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  adoptionBadgeText: { fontSize: 12, fontWeight: '600' },
  adoptionBadgePending: {},
  adoptionBadgeConfirmed: {},
  detailRow: { fontSize: 15, marginBottom: spacing.sm },
  detailLabel: { fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
  modalContent: { borderRadius: 16, padding: spacing.lg, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  modalLabel: { fontSize: 12, fontWeight: '600', marginBottom: spacing.xs },
  searchInput: { padding: spacing.md, borderRadius: 10, fontSize: 16, marginBottom: spacing.sm, borderWidth: 1 },
  feedbackInput: { minHeight: 100, textAlignVertical: 'top' },
  pickerScroll: { maxHeight: 120, marginBottom: spacing.sm },
  pickerItem: { padding: spacing.sm, borderRadius: 8, marginBottom: 2 },
  pickerItemText: { fontSize: 15, fontWeight: '500' },
  pickerItemSub: { fontSize: 12, marginTop: 2 },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  modalBtn: { flex: 1, padding: spacing.md, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { fontWeight: '600' },
  modalBtnTextPrimary: { color: '#fff', fontWeight: '600' },
  modalBtnDisabled: { opacity: 0.6 },
});
