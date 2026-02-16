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
  Platform,
  Switch,
  Linking,
  type LayoutChangeEvent,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
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
  confirmAdoptionByAdopet,
  rejectAdoptionByAdopet,
  searchAdminUsers,
  getAdminPetsAvailable,
  getAdminPendingAdoptionsByTutor,
  rejectPendingAdoptionByTutor,
  getAdminBugReports,
  resolveVerification,
  revokeVerification,
  getAdminPartners,
  getAdminPartnerRecommendations,
  createAdminPartner,
  updateAdminPartner,
  getFeatureFlags,
  updateFeatureFlag,
  type VerificationPendingItem,
  type ReportItem,
  type AdoptionItem,
  type PetAvailableItem,
  type PendingAdoptionByTutorItem,
  type UserSearchItem,
  type BugReportItem,
  type PartnerAdminItem,
  type PartnerRecommendationItem,
  type CreatePartnerBody,
  type UpdatePartnerBody,
  type FeatureFlagItem,
} from '../../src/api/admin';
import { presign } from '../../src/api/uploads';
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
  icon,
}: {
  title: string;
  count: number;
  sub?: string;
  colors: { textPrimary: string; textSecondary: string; primary: string };
  onPress?: () => void;
  icon?: React.ReactNode;
}) {
  const card = (
    <View style={[styles.summaryCard, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
      {icon != null && <View style={styles.summaryCardIcon}>{icon}</View>}
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
  const [batchPublicationStatus, setBatchPublicationStatus] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [selectedVerificationIds, setSelectedVerificationIds] = useState<Set<string>>(new Set());
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
  const [selectedPendingAdoptionPetIds, setSelectedPendingAdoptionPetIds] = useState<Set<string>>(new Set());

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

  const { data: bugReports = [], refetch: refetchBugReports, isRefetching: refetchingBugReports } = useQuery({
    queryKey: ['admin', 'bug-reports'],
    queryFn: getAdminBugReports,
  });

  const { data: partnersList = [], refetch: refetchPartners, isRefetching: refetchingPartners } = useQuery({
    queryKey: ['admin', 'partners'],
    queryFn: getAdminPartners,
  });
  const { data: partnerRecommendations = [], refetch: refetchPartnerRecommendations, isRefetching: refetchingPartnerRecommendations } = useQuery({
    queryKey: ['admin', 'partner-recommendations'],
    queryFn: getAdminPartnerRecommendations,
  });

  const { data: featureFlagsList = [], refetch: refetchFeatureFlags, isRefetching: refetchingFeatureFlags } = useQuery({
    queryKey: ['admin', 'feature-flags'],
    queryFn: getFeatureFlags,
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

  useEffect(() => {
    if (!confirmAdoptionSearchQuery.trim() || confirmAdoptionSearchQuery.length < 2) {
      setConfirmAdoptionSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setConfirmAdoptionSearching(true);
      try {
        const list = await searchAdminUsers(confirmAdoptionSearchQuery);
        setConfirmAdoptionSearchResults(list);
      } catch {
        setConfirmAdoptionSearchResults([]);
      } finally {
        setConfirmAdoptionSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [confirmAdoptionSearchQuery]);

  useEffect(() => {
    if (!massConfirmSearchQuery.trim() || massConfirmSearchQuery.length < 2) {
      setMassConfirmSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setMassConfirmSearching(true);
      try {
        const list = await searchAdminUsers(massConfirmSearchQuery);
        setMassConfirmSearchResults(list);
      } catch {
        setMassConfirmSearchResults([]);
      } finally {
        setMassConfirmSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [massConfirmSearchQuery]);

  const [registerPetId, setRegisterPetId] = useState<string | null>(null);
  const [registerAdopterId, setRegisterAdopterId] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedAdoption, setSelectedAdoption] = useState<AdoptionItem | null>(null);
  const [confirmingAdoptionPetId, setConfirmingAdoptionPetId] = useState<string | null>(null);
  const [rejectingAdoptionPetId, setRejectingAdoptionPetId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [resolveReportModal, setResolveReportModal] = useState<{ reportId: string } | null>(null);
  const [resolveReportFeedback, setResolveReportFeedback] = useState('');
  const [confirmAdoptionPendingItem, setConfirmAdoptionPendingItem] = useState<PendingAdoptionByTutorItem | null>(null);
  const [confirmAdoptionSearchQuery, setConfirmAdoptionSearchQuery] = useState('');
  const [confirmAdoptionSearchResults, setConfirmAdoptionSearchResults] = useState<UserSearchItem[]>([]);
  const [confirmAdoptionSearching, setConfirmAdoptionSearching] = useState(false);
  const [confirmAdoptionSelectedAdopterId, setConfirmAdoptionSelectedAdopterId] = useState<string | null>(null);
  const [showMassConfirmAdoptionModal, setShowMassConfirmAdoptionModal] = useState(false);
  const [massConfirmSearchQuery, setMassConfirmSearchQuery] = useState('');
  const [massConfirmSearchResults, setMassConfirmSearchResults] = useState<UserSearchItem[]>([]);
  const [massConfirmSearching, setMassConfirmSearching] = useState(false);
  const [massConfirmSelectedAdopterId, setMassConfirmSelectedAdopterId] = useState<string | null>(null);
  const [massConfirmSubmitting, setMassConfirmSubmitting] = useState(false);
  const [rejectInProgressPetId, setRejectInProgressPetId] = useState<string | null>(null);
  const [massRejecting, setMassRejecting] = useState(false);
  const [showCreatePartnerModal, setShowCreatePartnerModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerAdminItem | null>(null);
  const [editPartnerForm, setEditPartnerForm] = useState<{ name: string; city: string; description: string; website: string; email: string; phone: string; logoUrl: string; active: boolean; isPaidPartner: boolean }>({
    name: '', city: '', description: '', website: '', email: '', phone: '', logoUrl: '', active: true, isPaidPartner: false,
  });
  const [createPartnerForm, setCreatePartnerForm] = useState<CreatePartnerBody>({
    type: 'ONG',
    name: '',
    city: '',
    description: '',
    website: '',
    email: '',
    phone: '',
    logoUrl: '',
    active: true,
    approve: false,
    isPaidPartner: false,
  });
  const [partnerLogoUploading, setPartnerLogoUploading] = useState<'create' | string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const sectionY = useRef<Record<string, number>>({});
  const pendingByTutorRef = useRef<View>(null);
  const bugReportsRef = useRef<View>(null);
  const partnerRecommendationsRef = useRef<View>(null);
  const partnersRef = useRef<View>(null);
  const adoptionsRef = useRef<View>(null);
  const pendingPetsRef = useRef<View>(null);
  const verificationsRef = useRef<View>(null);
  const reportsRef = useRef<View>(null);
  const featureFlagsRef = useRef<View>(null);

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
      setConfirmAdoptionPendingItem(null);
      setConfirmAdoptionSearchQuery('');
      setConfirmAdoptionSearchResults([]);
      setConfirmAdoptionSelectedAdopterId(null);
      setToastMessage('Adoção registrada. O pet foi marcado como adotado.');
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível registrar a adoção.')),
  });

  const confirmByAdopetMutation = useMutation({
    mutationFn: (petId: string) => confirmAdoptionByAdopet(petId),
    onMutate: (petId) => setConfirmingAdoptionPetId(petId),
    onSuccess: (_, petId) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'adoptions'] });
      setSelectedAdoption((prev) => (prev && prev.petId === petId ? { ...prev, confirmedByAdopet: true } : prev));
      setSelectedPendingAdoptionPetIds((prev) => { const s = new Set(prev); s.delete(petId); return s; });
      setToastMessage('Adoção confirmada pelo Adopet.');
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível confirmar.')),
    onSettled: () => setConfirmingAdoptionPetId(null),
  });

  const rejectByAdopetMutation = useMutation({
    mutationFn: (petId: string) => rejectAdoptionByAdopet(petId),
    onMutate: (petId) => setRejectingAdoptionPetId(petId),
    onSuccess: (_, petId) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'adoptions'] });
      setSelectedAdoption((prev) => (prev && prev.petId === petId ? null : prev));
      setSelectedPendingAdoptionPetIds((prev) => { const s = new Set(prev); s.delete(petId); return s; });
      setToastMessage('Adoção rejeitada pelo Adopet.');
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível rejeitar.')),
    onSettled: () => setRejectingAdoptionPetId(null),
  });

  const pendingAdoptionsList = adoptionsList.filter((a) => !a.confirmedByAdopet);
  const bulkConfirmPendingMutation = useMutation({
    mutationFn: async (petIds: string[]) => {
      await Promise.all(petIds.map((id) => confirmAdoptionByAdopet(id)));
    },
    onSuccess: (_, petIds) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'adoptions'] });
      setSelectedPendingAdoptionPetIds(new Set());
      setToastMessage(`${petIds.length} adoção(ões) confirmada(s) pelo Adopet.`);
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível confirmar em massa.')),
  });

  const bulkRejectPendingMutation = useMutation({
    mutationFn: async (petIds: string[]) => {
      await Promise.all(petIds.map((id) => rejectAdoptionByAdopet(id)));
    },
    onSuccess: (_, petIds) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'adoptions'] });
      setSelectedPendingAdoptionPetIds(new Set());
      setToastMessage(`${petIds.length} adoção(ões) rejeitada(s) pelo Adopet.`);
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível rejeitar em massa.')),
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

  const createPartnerMutation = useMutation({
    mutationFn: (body: CreatePartnerBody) => createAdminPartner(body),
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'partners'] });
      queryClient.invalidateQueries({ queryKey: ['partners', 'ONG'] });
      setShowCreatePartnerModal(false);
      setCreatePartnerForm({ type: 'ONG', name: '', city: '', description: '', website: '', email: '', phone: '', active: true, approve: false, isPaidPartner: false });
      setToastMessage(v.approve ? 'Parceiro criado e aprovado.' : 'Parceiro criado. Aprove para aparecer no app.');
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível criar parceiro.')),
  });

  const uploadPartnerLogo = useCallback(async (forCreate: boolean, partnerId?: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão', 'Precisamos acessar suas fotos para enviar a logo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    setPartnerLogoUploading(forCreate ? 'create' : partnerId ?? null);
    try {
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `partner-logo-${Date.now()}.${ext === 'jpg' ? 'jpg' : ext}`;
      const { uploadUrl, publicUrl } = await presign(filename, `image/${ext === 'jpg' ? 'jpeg' : ext}`);
      const response = await fetch(uri);
      const blob = await response.blob();
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': blob.type || 'image/jpeg' },
      });
      if (!putRes.ok) throw new Error(`Upload falhou: ${putRes.status}`);
      if (forCreate) {
        setCreatePartnerForm((f) => ({ ...f, logoUrl: publicUrl }));
      } else {
        setEditPartnerForm((f) => ({ ...f, logoUrl: publicUrl }));
      }
    } catch (e: unknown) {
      Alert.alert('Falha ao enviar logo', getFriendlyErrorMessage(e, 'Tente novamente ou use uma URL.'));
    } finally {
      setPartnerLogoUploading(null);
    }
  }, []);

  const approvePartnerMutation = useMutation({
    mutationFn: (id: string) => updateAdminPartner(id, { approve: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'partners'] });
      queryClient.invalidateQueries({ queryKey: ['partners', 'ONG'] });
      setToastMessage('Parceiro aprovado.');
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível aprovar.')),
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

  const updateFeatureFlagMutation = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) => updateFeatureFlag(key, { enabled }),
    onSuccess: (_, { key, enabled }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] });
      setToastMessage(`Feature "${key}" ${enabled ? 'habilitada' : 'desabilitada'}.`);
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível atualizar a flag.')),
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
    refetchBugReports();
    refetchFeatureFlags();
    refetchPartnerRecommendations();
    refetchPartners();
    setSelectedPetIds(new Set());
    setSelectedVerificationIds(new Set());
    setSelectedReportIds(new Set());
    setSelectedPendingAdoptionPetIds(new Set());
  }, [refetchPets, refetchVerifications, refetchApproved, refetchReports, refetchStats, refetchAdoptions, refetchPetsAvailable, refetchPendingByTutor, refetchBugReports, refetchFeatureFlags, refetchPartnerRecommendations, refetchPartners]);

  useFocusEffect(
    useCallback(() => {
      onRefresh();
    }, [onRefresh]),
  );

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

  const togglePendingAdoptionSelection = (petId: string) => {
    setSelectedPendingAdoptionPetIds((prev) => {
      const next = new Set(prev);
      if (next.has(petId)) next.delete(petId);
      else next.add(petId);
      return next;
    });
  };

  const handleMassConfirmAdoptions = () => {
    setShowMassConfirmAdoptionModal(true);
    setMassConfirmSearchQuery('');
    setMassConfirmSearchResults([]);
    setMassConfirmSelectedAdopterId(null);
  };

  const handleRejectPendingAdoption = (item: PendingAdoptionByTutorItem) => {
    Alert.alert(
      'Rejeitar adoção',
      `Rejeitar a marcação de adoção de "${item.petName}"? O pet permanece como está (não volta ao feed). Não será computado ponto nem quantidade de adoção para o tutor, que verá o badge "Rejeitado pelo Adopet" em Meus anúncios.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rejeitar',
          style: 'destructive',
          onPress: async () => {
            setRejectInProgressPetId(item.petId);
            try {
              await rejectPendingAdoptionByTutor(item.petId);
              queryClient.invalidateQueries({ queryKey: ['admin', 'pending-adoptions-by-tutor'] });
              queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
              queryClient.invalidateQueries({ queryKey: ['feed'] });
              setToastMessage('Rejeitado. O tutor verá o badge em Meus anúncios.');
            } catch (e: unknown) {
              Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível rejeitar.'));
            } finally {
              setRejectInProgressPetId(null);
            }
          },
        },
      ],
    );
  };

  const handleMassRejectPendingAdoptions = () => {
    const petIds = Array.from(selectedPendingAdoptionPetIds);
    if (petIds.length === 0) return;
    Alert.alert(
      'Rejeitar selecionados',
      `Rejeitar ${petIds.length} marcação(ões) de adoção? Os pets permanecem como estão (não voltam ao feed). Não será computado ponto nem quantidade de adoção; os tutores verão o badge "Rejeitado pelo Adopet" em Meus anúncios.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rejeitar todos',
          style: 'destructive',
          onPress: async () => {
            setMassRejecting(true);
            let done = 0;
            let errorMessage: string | null = null;
            for (const petId of petIds) {
              try {
                await rejectPendingAdoptionByTutor(petId);
                done++;
              } catch (e: unknown) {
                errorMessage = getFriendlyErrorMessage(e, 'Erro ao rejeitar.');
                break;
              }
            }
            queryClient.invalidateQueries({ queryKey: ['admin', 'pending-adoptions-by-tutor'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
            queryClient.invalidateQueries({ queryKey: ['feed'] });
            setSelectedPendingAdoptionPetIds(new Set());
            setMassRejecting(false);
            setToastMessage(
              errorMessage
                ? `${done} rejeitado(s). ${errorMessage}`
                : petIds.length === 1
                  ? 'Rejeitado. O tutor verá o badge em Meus anúncios.'
                  : `${petIds.length} rejeições concluídas. Os tutores verão o badge em Meus anúncios.`,
            );
          },
        },
      ],
    );
  };

  const handleMassConfirmAdoptionsSubmit = async () => {
    const petIds = Array.from(selectedPendingAdoptionPetIds);
    const adopterId = massConfirmSelectedAdopterId;
    if (petIds.length === 0 || !adopterId) return;
    setMassConfirmSubmitting(true);
    try {
      let done = 0;
      let errorMessage: string | null = null;
      for (const petId of petIds) {
        try {
          await createAdoption(petId, adopterId);
          done++;
        } catch (e: unknown) {
          errorMessage = getFriendlyErrorMessage(e, 'Erro ao registrar adoção.');
          break;
        }
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'adoptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pets-available'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-adoptions-by-tutor'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'tutor-stats'] });
      setSelectedPendingAdoptionPetIds(new Set());
      setShowMassConfirmAdoptionModal(false);
      setMassConfirmSelectedAdopterId(null);
      setMassConfirmSearchQuery('');
      setMassConfirmSearchResults([]);
      if (errorMessage) {
        setToastMessage(`${done} confirmada(s). ${errorMessage}`);
      } else {
        setToastMessage(petIds.length === 1 ? 'Adoção registrada.' : `${petIds.length} adoções registradas.`);
      }
    } finally {
      setMassConfirmSubmitting(false);
    }
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
            setBatchPublicationStatus(status);
            try {
              for (const petId of ids) {
                await setPetPublication(petId, status);
              }
              setSelectedPetIds(new Set());
              queryClient.invalidateQueries({ queryKey: ['admin', 'pending-pets'] });
              queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
              queryClient.invalidateQueries({ queryKey: ['feed'] });
              setToastMessage(status === 'APPROVED' ? `${ids.length} anúncio(s) aprovado(s).` : `${ids.length} anúncio(s) rejeitado(s).`);
            } catch (e: unknown) {
              Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível atualizar alguns anúncios.'));
            } finally {
              setBatchPublicationStatus(null);
            }
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
    refetchingAdoptions ||
    refetchingBugReports ||
    refetchingPartnerRecommendations ||
    refetchingPartners;
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

        {/* Dashboard: grid de cards com ícones */}
        <View style={styles.summaryGrid}>
          <SummaryCard
            title="Total de adoções"
            count={stats?.totalAdoptions ?? 0}
            colors={colors}
            onPress={() => scrollToSection('adoptions')}
            icon={<Ionicons name="heart" size={22} color={colors.primary} />}
          />
          <SummaryCard
            title="Adoções este mês"
            count={stats?.adoptionsThisMonth ?? 0}
            colors={colors}
            onPress={() => scrollToSection('adoptions')}
            icon={<Ionicons name="calendar" size={22} color={colors.primary} />}
          />
          <SummaryCard
            title="Anúncios pendentes"
            count={pendingPets.length}
            colors={colors}
            onPress={() => scrollToSection('pendingPets')}
            icon={<Ionicons name="document-text-outline" size={22} color={colors.primary} />}
          />
          <SummaryCard
            title="Verificações"
            count={pending.length}
            sub="pendentes"
            colors={colors}
            onPress={() => scrollToSection('verifications')}
            icon={<Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />}
          />
          <SummaryCard
            title="Denúncias abertas"
            count={unresolvedReports.length}
            colors={colors}
            onPress={() => scrollToSection('reports')}
            icon={<Ionicons name="flag-outline" size={22} color={colors.primary} />}
          />
          <SummaryCard
            title="Marcados adotado"
            count={stats?.pendingAdoptionsByTutorCount ?? 0}
            sub="pelo tutor"
            colors={colors}
            onPress={() => scrollToSection('pendingByTutor')}
            icon={<Ionicons name="time-outline" size={22} color={colors.primary} />}
          />
          <SummaryCard
            title="Parceiros"
            count={partnersList.length}
            colors={colors}
            onPress={() => scrollToSection('partners')}
            icon={<Ionicons name="business-outline" size={22} color={colors.primary} />}
          />
          <SummaryCard
            title="Indicações"
            count={partnerRecommendations.length}
            sub="parceiros"
            colors={colors}
            onPress={() => scrollToSection('partnerRecommendations')}
            icon={<Ionicons name="people-outline" size={22} color={colors.primary} />}
          />
          <SummaryCard
            title="Reports de bugs"
            count={bugReports.length}
            sub="beta"
            colors={colors}
            onPress={() => scrollToSection('bugReports')}
            icon={<Ionicons name="bug-outline" size={22} color={colors.primary} />}
          />
          <SummaryCard
            title="Feature flags"
            count={featureFlagsList.length}
            sub="ligar/desligar"
            colors={colors}
            onPress={() => scrollToSection('featureFlags')}
            icon={<Ionicons name="flag" size={22} color={colors.primary} />}
          />
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
          {selectedPendingAdoptionPetIds.size > 0 && (
            <View style={styles.batchBar}>
              <Text style={[styles.batchLabel, { color: colors.textSecondary }]}>
                {selectedPendingAdoptionPetIds.size} selecionado(s)
              </Text>
              <View style={styles.batchActions}>
                <TouchableOpacity
                  style={[styles.batchBtn, { backgroundColor: colors.primary }]}
                  onPress={handleMassConfirmAdoptions}
                  disabled={massConfirmSubmitting}
                >
                  <Ionicons name="checkmark-done" size={16} color="#fff" />
                  <Text style={styles.batchBtnText}>Confirmar adoções</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.batchBtn, { backgroundColor: colors.error || '#DC2626' }]}
                  onPress={handleMassRejectPendingAdoptions}
                  disabled={massRejecting}
                >
                  <Ionicons name="close-circle" size={16} color="#fff" />
                  <Text style={styles.batchBtnText}>{massRejecting ? 'Rejeitando...' : 'Rejeitar selecionados'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {pendingAdoptionsByTutor.map((item) => (
            <View key={item.petId} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.background }]}>
              <View style={styles.cardRowWrap}>
                <TouchableOpacity
                  style={[styles.checkbox, selectedPendingAdoptionPetIds.has(item.petId) && { backgroundColor: colors.primary }]}
                  onPress={() => togglePendingAdoptionSelection(item.petId)}
                >
                  {selectedPendingAdoptionPetIds.has(item.petId) && <Ionicons name="checkmark" size={14} color="#fff" />}
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
              <View style={styles.adoptionCardHeader}>
                <Text style={[styles.adoptionPetName, { color: colors.textPrimary }]}>{item.petName}</Text>
                <View style={[styles.adoptionBadge, styles.adoptionBadgePending, { backgroundColor: (colors.error || '#DC2626') + '20' }]}>
                  <Ionicons name="time-outline" size={14} color={colors.error || '#DC2626'} />
                  <Text style={[styles.adoptionBadgeText, { color: colors.error || '#DC2626' }]}>Aguardando confirmação</Text>
                </View>
              </View>
              <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>Tutor: {item.tutorName}</Text>
              {item.pendingAdopterName ? (
                <Text style={[styles.cardMeta, { color: colors.primary }]}>
                  Adotante indicado pelo tutor: {item.pendingAdopterName}
                  {item.pendingAdopterUsername ? ` (@${item.pendingAdopterUsername})` : ''}
                </Text>
              ) : null}
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
              <View style={[styles.cardActions, styles.cardActionsEqual, { marginTop: spacing.sm }]}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnEqual, { backgroundColor: colors.primary }]}
                onPress={() => {
                  if (item.pendingAdopterId) {
                    Alert.alert(
                      'Confirmar adoção',
                      `Confirmar adoção de ${item.petName} com ${item.pendingAdopterName ?? 'adotante indicado pelo tutor'}?`,
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Confirmar', onPress: () => createAdoptionMutation.mutate({ petId: item.petId }) },
                      ]
                    );
                  } else {
                    setConfirmAdoptionPendingItem(item);
                    setConfirmAdoptionSearchQuery('');
                    setConfirmAdoptionSearchResults([]);
                    setConfirmAdoptionSelectedAdopterId(null);
                  }
                }}
                disabled={createAdoptionMutation.isPending}
              >
                {createAdoptionMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                )}
                <Text style={styles.actionBtnText} numberOfLines={1}>
                  {createAdoptionMutation.isPending ? 'Salvando...' : item.pendingAdopterId ? 'Confirmar (indicado)' : 'Confirmar adoção'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnEqual, { backgroundColor: colors.error || '#DC2626' }]}
                onPress={() => handleRejectPendingAdoption(item)}
                disabled={rejectInProgressPetId === item.petId}
              >
                {rejectInProgressPetId === item.petId ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="close-circle" size={18} color="#fff" />
                )}
                <Text style={styles.actionBtnText}>
                  {rejectInProgressPetId === item.petId ? 'Rejeitando...' : 'Rejeitar'}
                </Text>
              </TouchableOpacity>
            </View>
                </View>
              </View>
            </View>
          ))}
          </View>
        )}

        {/* CTA: Portal admin web */}
        <View style={[styles.adminWebCtaWrap, { backgroundColor: colors.surface, borderColor: colors.primary + '40' }]}>
          <Text style={[styles.adminWebCtaTitle, { color: colors.textPrimary }]}>Painel completo no navegador</Text>
          <Text style={[styles.adminWebCtaSub, { color: colors.textSecondary }]}>
            Acesse o portal administrativo na web para relatórios, usuários e mais opções.
          </Text>
          <TouchableOpacity
            style={[styles.adminWebCtaBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              const url = 'https://admin.appadopet.com.br/';
              Linking.canOpenURL(url).then((supported) => {
                if (supported) Linking.openURL(url);
                else Alert.alert('Abrir link', 'Não foi possível abrir. Tente acessar pelo navegador: ' + url);
              });
            }}
            accessibilityLabel="Abrir portal administrativo na web"
          >
            <Ionicons name="open-outline" size={20} color="#fff" />
            <Text style={styles.adminWebCtaBtnText}>Abrir admin.appadopet.com.br</Text>
          </TouchableOpacity>
        </View>

      {/* Modal Confirmação em massa */}
      <Modal visible={showMassConfirmAdoptionModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Confirmar {selectedPendingAdoptionPetIds.size} adoção(ões)
            </Text>
            <Text style={[styles.sectionSub, { color: colors.textSecondary, marginBottom: spacing.md }]}>
              O mesmo adotante será atribuído a todos os pets selecionados.
            </Text>
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Adotante (busque por nome ou email)</Text>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
              placeholder="Nome ou email..."
              placeholderTextColor={colors.textSecondary}
              value={massConfirmSearchQuery}
              onChangeText={setMassConfirmSearchQuery}
              autoCapitalize="none"
            />
            {massConfirmSearching && <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />}
            <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
              {massConfirmSearchResults.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={[styles.pickerItem, massConfirmSelectedAdopterId === u.id && { backgroundColor: colors.primary + '25' }]}
                  onPress={() => setMassConfirmSelectedAdopterId(u.id)}
                >
                  <Text style={[styles.pickerItemText, { color: colors.textPrimary }]}>{u.name}</Text>
                  <Text style={[styles.pickerItemSub, { color: colors.textSecondary }]}>{u.email}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.background }]}
                onPress={() => {
                  setShowMassConfirmAdoptionModal(false);
                  setMassConfirmSearchQuery('');
                  setMassConfirmSearchResults([]);
                  setMassConfirmSelectedAdopterId(null);
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  { backgroundColor: colors.primary },
                  (!massConfirmSelectedAdopterId || massConfirmSubmitting) && styles.modalBtnDisabled,
                ]}
                onPress={handleMassConfirmAdoptionsSubmit}
                disabled={!massConfirmSelectedAdopterId || massConfirmSubmitting}
              >
                <Text style={styles.modalBtnTextPrimary}>
                  {massConfirmSubmitting ? 'Salvando...' : 'Confirmar todos'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Confirmar adoção (pet já marcado pelo tutor) */}
      <Modal visible={confirmAdoptionPendingItem != null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Confirmar adoção</Text>
            {confirmAdoptionPendingItem ? (
              <>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Pet</Text>
                <Text style={[styles.pickerItemText, { color: colors.textPrimary, marginBottom: spacing.md }]}>
                  {confirmAdoptionPendingItem.petName} (tutor: {confirmAdoptionPendingItem.tutorName})
                </Text>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Adotante (busque por nome ou email)</Text>
                <TextInput
                  style={[styles.searchInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
                  placeholder="Nome ou email..."
                  placeholderTextColor={colors.textSecondary}
                  value={confirmAdoptionSearchQuery}
                  onChangeText={setConfirmAdoptionSearchQuery}
                  autoCapitalize="none"
                />
                {confirmAdoptionSearching && <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />}
                <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                  {confirmAdoptionSearchResults.map((u) => (
                    <TouchableOpacity
                      key={u.id}
                      style={[styles.pickerItem, confirmAdoptionSelectedAdopterId === u.id && { backgroundColor: colors.primary + '25' }]}
                      onPress={() => setConfirmAdoptionSelectedAdopterId(u.id)}
                    >
                      <Text style={[styles.pickerItemText, { color: colors.textPrimary }]}>{u.name}</Text>
                      <Text style={[styles.pickerItemSub, { color: colors.textSecondary }]}>{u.email}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: colors.background }]}
                    onPress={() => {
                      setConfirmAdoptionPendingItem(null);
                      setConfirmAdoptionSearchQuery('');
                      setConfirmAdoptionSearchResults([]);
                      setConfirmAdoptionSelectedAdopterId(null);
                    }}
                  >
                    <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalBtn,
                      { backgroundColor: colors.primary },
                      (!confirmAdoptionSelectedAdopterId || createAdoptionMutation.isPending) && styles.modalBtnDisabled,
                    ]}
                    onPress={() => {
                      if (confirmAdoptionPendingItem && confirmAdoptionSelectedAdopterId) {
                        createAdoptionMutation.mutate({
                          petId: confirmAdoptionPendingItem.petId,
                          adopterUserId: confirmAdoptionSelectedAdopterId,
                        });
                      }
                    }}
                    disabled={!confirmAdoptionSelectedAdopterId || createAdoptionMutation.isPending}
                  >
                    <Text style={styles.modalBtnTextPrimary}>
                      {createAdoptionMutation.isPending ? 'Salvando...' : 'Confirmar adoção'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

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
      {pendingAdoptionsList.length > 0 && selectedPendingAdoptionPetIds.size > 0 && (
        <View style={styles.batchBar}>
          <Text style={[styles.batchLabel, { color: colors.textSecondary }]}>
            {selectedPendingAdoptionPetIds.size} selecionada(s)
          </Text>
          <View style={styles.batchActions}>
            <TouchableOpacity
              style={[styles.batchBtn, { backgroundColor: colors.primary }]}
              onPress={() => bulkConfirmPendingMutation.mutate(Array.from(selectedPendingAdoptionPetIds))}
              disabled={bulkConfirmPendingMutation.isPending}
            >
              {bulkConfirmPendingMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
              )}
              <Text style={styles.batchBtnText}>
                {bulkConfirmPendingMutation.isPending ? 'Confirmando...' : 'Confirmar selecionadas'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.batchBtn, { backgroundColor: colors.error || '#DC2626' }]}
              onPress={() =>
                Alert.alert(
                  'Rejeitar adoções',
                  `Rejeitar ${selectedPendingAdoptionPetIds.size} adoção(ões)? Tutor e adotante verão o badge "Rejeitado pelo Adopet".`,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Rejeitar',
                      style: 'destructive',
                      onPress: () => bulkRejectPendingMutation.mutate(Array.from(selectedPendingAdoptionPetIds)),
                    },
                  ]
                )
              }
              disabled={bulkRejectPendingMutation.isPending}
            >
              {bulkRejectPendingMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="close-circle" size={16} color="#fff" />
              )}
              <Text style={styles.batchBtnText}>
                {bulkRejectPendingMutation.isPending ? 'Rejeitando...' : 'Rejeitar selecionadas'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {adoptionsList.length === 0 ? (
        <View style={[styles.emptyBlock, { backgroundColor: colors.surface }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhuma adoção registrada ainda.</Text>
        </View>
      ) : (
        adoptionsList.slice(0, 20).map((a) => (
          <View
            key={a.id}
            style={[styles.card, styles.adoptionCard, { backgroundColor: colors.surface, borderColor: colors.background }]}
          >
            <TouchableOpacity
              style={styles.adoptionCardTouchable}
              onPress={() => setSelectedAdoption(a)}
              activeOpacity={0.7}
            >
              <View style={styles.adoptionCardHeader}>
                {!a.confirmedByAdopet ? (
                  <TouchableOpacity
                    style={[styles.checkbox, selectedPendingAdoptionPetIds.has(a.petId) && { backgroundColor: colors.primary }]}
                    onPress={() => {
                      setSelectedPendingAdoptionPetIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(a.petId)) next.delete(a.petId);
                        else next.add(a.petId);
                        return next;
                      });
                    }}
                  >
                    {selectedPendingAdoptionPetIds.has(a.petId) && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </TouchableOpacity>
                ) : null}
                <Text style={[styles.adoptionPetName, { color: colors.textPrimary }]} numberOfLines={1}>{a.petName}</Text>
                {a.confirmedByAdopet ? (
                  <View style={[styles.adoptionBadge, styles.adoptionBadgeConfirmed, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                    <Text style={[styles.adoptionBadgeText, { color: colors.primary }]}>Confirmado</Text>
                  </View>
                ) : (
                  <View style={[styles.adoptionBadge, { backgroundColor: (colors.textSecondary || '#78716c') + '25' }]}>
                    <Text style={[styles.adoptionBadgeText, { color: colors.textSecondary || '#78716c' }]}>Aguardando confirmação Adopet</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>Tutor: {a.tutorName}</Text>
              <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>Adotante: {a.adopterName}</Text>
              <Text style={[styles.cardDate, { color: colors.textSecondary }]}>{new Date(a.adoptedAt).toLocaleDateString('pt-BR')}</Text>
            </TouchableOpacity>
            {!a.confirmedByAdopet && (
              <View style={styles.adoptionCardActions}>
                <TouchableOpacity
                  style={[styles.adoptionCardBtn, { backgroundColor: colors.primary }]}
                  onPress={() => confirmByAdopetMutation.mutate(a.petId)}
                  disabled={confirmingAdoptionPetId != null}
                >
                  {confirmingAdoptionPetId === a.petId ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.adoptionCardBtnText}>Confirmar</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.adoptionCardBtn, { backgroundColor: colors.error || '#DC2626' }]}
                  onPress={() =>
                    Alert.alert(
                      'Rejeitar adoção',
                      'Tem certeza? O tutor e o adotante verão o badge "Rejeitado pelo Adopet".',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Rejeitar', style: 'destructive', onPress: () => rejectByAdopetMutation.mutate(a.petId) },
                      ]
                    )
                  }
                  disabled={rejectingAdoptionPetId != null}
                >
                  {rejectingAdoptionPetId === a.petId ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.adoptionCardBtnText}>Rejeitar</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
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
                {selectedAdoption.confirmedByAdopet ? (
                  <View style={[styles.adoptionBadge, styles.adoptionBadgeConfirmed, { backgroundColor: colors.primary + '20', alignSelf: 'flex-start', marginBottom: spacing.md }]}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                    <Text style={[styles.adoptionBadgeText, { color: colors.primary }]}>Confirmado pelo Adopet</Text>
                  </View>
                ) : (
                  <View style={[styles.adoptionBadge, { backgroundColor: (colors.textSecondary || '#78716c') + '25', alignSelf: 'flex-start', marginBottom: spacing.md }]}>
                    <Text style={[styles.adoptionBadgeText, { color: colors.textSecondary || '#78716c' }]}>Aguardando confirmação Adopet</Text>
                  </View>
                )}
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
                  activeOpacity={0.8}
                  style={{
                    marginTop: spacing.sm,
                    paddingVertical: 14,
                    paddingHorizontal: 24,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#e5e7eb',
                    borderWidth: 1,
                    borderColor: '#9ca3af',
                    minHeight: 48,
                  }}
                  onPress={() => setSelectedAdoption(null)}
                >
                  <Ionicons name="close-circle-outline" size={20} color="#111827" />
                  <Text style={{ color: '#111827', fontSize: 16, fontWeight: '600', marginTop: 4 }}>Fechar</Text>
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
            <TouchableOpacity style={[styles.batchBtn, { backgroundColor: colors.primary }]} onPress={() => handleBatchPetPublication('APPROVED')} disabled={batchPublicationStatus !== null || setPublicationMutation.isPending}>
              {batchPublicationStatus === 'APPROVED' || setPublicationMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark-circle" size={16} color="#fff" />}
              <Text style={styles.batchBtnText}>{batchPublicationStatus === 'APPROVED' || setPublicationMutation.isPending ? 'Aprovando...' : 'Aprovar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.batchBtn, { backgroundColor: colors.error || '#DC2626' }]} onPress={() => handleBatchPetPublication('REJECTED')} disabled={batchPublicationStatus !== null || setPublicationMutation.isPending}>
              {batchPublicationStatus === 'REJECTED' || setPublicationMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="close-circle" size={16} color="#fff" />}
              <Text style={styles.batchBtnText}>{batchPublicationStatus === 'REJECTED' || setPublicationMutation.isPending ? 'Rejeitando...' : 'Rejeitar'}</Text>
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
                  <View style={styles.petNameRow}>
                    <Text style={[styles.petName, { color: colors.textPrimary }]} numberOfLines={1}>{pet.name}</Text>
                    {pet.partner && (
                      <View style={[styles.partnerBadge, { backgroundColor: (pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? colors.primary + '25' : colors.textSecondary + '20' }]}>
                        <Ionicons name={(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? 'star' : 'heart'} size={12} color={(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? colors.primary : colors.textSecondary} />
                        <Text style={[styles.partnerBadgeText, { color: (pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? colors.primary : colors.textSecondary }]}>
                          {(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? 'Patrocinado' : 'Parceiro'}
                        </Text>
                      </View>
                    )}
                  </View>
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
            <Text style={[styles.cardType, { color: colors.textPrimary }]}>{VERIFICATION_TYPE_LABEL[item.type] ?? item.type}</Text>
            {item.type === 'USER_VERIFIED' && item.userName ? (
              <Text style={[styles.cardDetail, { color: colors.textSecondary }]}>Usuário: {item.userName}</Text>
            ) : item.type === 'PET_VERIFIED' ? (
              <View style={styles.cardRow}>
                <Text style={[styles.cardDetail, { color: colors.textSecondary }]}>
                  Pet: {item.petName ?? '—'}
                </Text>
                {item.petId ? (
                  <TouchableOpacity onPress={() => router.push(`/pet/${item.petId!}`)} style={styles.linkBtn}>
                    <Ionicons name="image-outline" size={12} color={colors.primary} />
                    <Text style={[styles.linkText, { color: colors.primary, fontSize: 12 }]}>Ver pet</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
            <Text style={[styles.cardDate, { color: colors.textSecondary }]}>{new Date(item.createdAt).toLocaleDateString('pt-BR')}</Text>
            <TouchableOpacity style={[styles.actionBtn, styles.revokeBtn, { borderColor: colors.error || '#DC2626', marginTop: spacing.sm }]} onPress={() => handleRevoke(item)} disabled={revokeMutation.isPending}>
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

      {/* Parceiros (ONG, clínicas, lojas) */}
      <View ref={partnersRef} onLayout={(e: LayoutChangeEvent) => { sectionY.current.partners = e.nativeEvent.layout.y; }} collapsable={false}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: spacing.xl }]}>Parceiros ({partnersList.length})</Text>
        <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
          ONGs, clínicas e lojas. Aprove para aparecer na tela Parceiros e na seleção ao criar/editar pet.
        </Text>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary, marginBottom: spacing.md }]}
          onPress={() => {
                    setCreatePartnerForm({ type: 'ONG', name: '', city: '', description: '', website: '', email: '', phone: '', logoUrl: '', active: true, approve: false, isPaidPartner: false });
            setShowCreatePartnerModal(true);
          }}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.actionBtnText}>Novo parceiro</Text>
        </TouchableOpacity>
        {partnersList.length === 0 ? (
          <View style={[styles.emptyBlock, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhum parceiro cadastrado.</Text>
          </View>
        ) : (
          partnersList.map((p: PartnerAdminItem) => (
            <View key={p.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.background }]}>
              <View style={styles.cardRowWrap}>
                {p.logoUrl ? (
                  <ExpoImage source={{ uri: p.logoUrl }} style={styles.partnerCardLogo} contentFit="contain" />
                ) : null}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.adoptionPetName, { color: colors.textPrimary }]}>{p.name}</Text>
                  <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                    {p.type} {p.city ? `• ${p.city}` : ''}
                  </Text>
                  {p.description ? (
                    <Text style={[styles.cardMeta, { color: colors.textSecondary }]} numberOfLines={2}>{p.description}</Text>
                  ) : null}
                  <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
                    {new Date(p.createdAt).toLocaleString('pt-BR')}
                  </Text>
                  {p.isPaidPartner ? (
                    <View style={[styles.resolvedBadge, { backgroundColor: (colors.accent || '#f59e0b') + '25', alignSelf: 'flex-start', marginTop: spacing.xs, marginRight: spacing.xs }]}>
                      <Ionicons name="star" size={14} color={colors.accent || '#f59e0b'} />
                      <Text style={[styles.resolvedText, { color: colors.accent || '#f59e0b' }]}>Pago</Text>
                    </View>
                  ) : null}
                  {p.approvedAt ? (
                    <View style={[styles.resolvedBadge, { backgroundColor: colors.primary + '20', alignSelf: 'flex-start', marginTop: spacing.xs }]}>
                      <Ionicons name="checkmark-done" size={14} color={colors.primary} />
                      <Text style={[styles.resolvedText, { color: colors.primary }]}>Aprovado</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.primary, marginTop: spacing.sm, alignSelf: 'flex-start' }]}
                      onPress={() => approvePartnerMutation.mutate(p.id)}
                      disabled={approvePartnerMutation.isPending}
                    >
                      {approvePartnerMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark-circle" size={18} color="#fff" />}
                      <Text style={styles.actionBtnText}>Aprovar</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.background, marginTop: spacing.sm, alignSelf: 'flex-start' }]}
                    onPress={() => {
                      setEditingPartner(p);
                      setEditPartnerForm({
                        name: p.name,
                        city: p.city ?? '',
                        description: p.description ?? '',
                        website: p.website ?? '',
                        email: p.email ?? '',
                        phone: p.phone ?? '',
                        logoUrl: p.logoUrl ?? '',
                        active: p.active,
                        isPaidPartner: !!p.isPaidPartner,
                      });
                    }}
                  >
                    <Ionicons name="pencil" size={18} color={colors.textPrimary} />
                    <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>Editar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Indicações de parceiros */}
      <View ref={partnerRecommendationsRef} onLayout={(e: LayoutChangeEvent) => { sectionY.current.partnerRecommendations = e.nativeEvent.layout.y; }} collapsable={false}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: spacing.xl }]}>Indicações de parceiros ({partnerRecommendations.length})</Text>
        <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
          Indicações enviadas pelos usuários (ONG, clínica ou loja). Quem indicou aparece abaixo de cada card.
        </Text>
        {partnerRecommendations.length === 0 ? (
          <View style={[styles.emptyBlock, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhuma indicação ainda.</Text>
          </View>
        ) : (
          partnerRecommendations.map((r: PartnerRecommendationItem) => (
            <View key={r.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.background }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: 16, marginTop: 0 }]}>{r.suggestedName}</Text>
              <View style={styles.rowWrap}>
                <View style={[styles.chip, { backgroundColor: colors.primary + '25' }]}>
                  <Text style={[styles.chipText, { color: colors.primary }]}>
                    {r.suggestedType === 'ONG' ? 'ONG' : r.suggestedType === 'CLINIC' ? 'Clínica' : 'Loja'}
                  </Text>
                </View>
                {r.suggestedCity ? (
                  <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>{r.suggestedCity}</Text>
                ) : null}
              </View>
              {(r.suggestedEmail ?? r.suggestedPhone) && (
                <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                  {[r.suggestedEmail, r.suggestedPhone].filter(Boolean).join(' • ')}
                </Text>
              )}
              {r.message ? (
                <Text style={[styles.bugReportComment, { color: colors.textSecondary }]} numberOfLines={4}>“{r.message}”</Text>
              ) : null}
              <Text style={[styles.cardMeta, { color: colors.textSecondary, marginTop: 4 }]}>
                Indicado por: {r.indicadorName ?? '—'}{r.indicadorEmail ? ` (${r.indicadorEmail})` : ''}
              </Text>
              <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
                {new Date(r.createdAt).toLocaleString('pt-BR')}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Reports de bugs (beta) */}
      <View ref={bugReportsRef} onLayout={(e: LayoutChangeEvent) => { sectionY.current.bugReports = e.nativeEvent.layout.y; }} collapsable={false}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: spacing.xl }]}>Reports de bugs ({bugReports.length})</Text>
        <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
          Bugs (tela de falha) e sugestões enviados pelos usuários. Apenas leitura.
        </Text>
        {bugReports.length === 0 ? (
          <View style={[styles.emptyBlock, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhum report de bug ainda.</Text>
          </View>
        ) : (
          bugReports.map((r: BugReportItem) => (
            <View key={r.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.background }]}>
              {r.type === 'SUGGESTION' ? (
                <View style={[styles.bugReportTypeBadge, { backgroundColor: colors.primary + '25' }]}>
                  <Text style={[styles.bugReportTypeText, { color: colors.primary }]}>Sugestão</Text>
                </View>
              ) : (
                <View style={[styles.bugReportTypeBadge, { backgroundColor: (colors.error || '#DC2626') + '20' }]}>
                  <Text style={[styles.bugReportTypeText, { color: colors.error || '#DC2626' }]}>Bug</Text>
                </View>
              )}
              <Text style={[styles.bugReportMessage, { color: colors.textPrimary }]} numberOfLines={3}>{r.message}</Text>
              {(r.userName ?? r.userEmail) && (
                <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                  {r.userName ?? 'Anônimo'}{r.userEmail ? ` • ${r.userEmail}` : ''}
                </Text>
              )}
              {r.screen ? (
                <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>Tela: {r.screen}</Text>
              ) : null}
              {r.userComment ? (
                <Text style={[styles.bugReportComment, { color: colors.textSecondary }]}>“{r.userComment}”</Text>
              ) : null}
              <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
                {new Date(r.createdAt).toLocaleString('pt-BR')}
              </Text>
              {r.stack ? (
                <Text style={[styles.bugReportStack, { color: colors.textSecondary }]} numberOfLines={5}>
                  {r.stack}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </View>

      {/* Feature flags */}
      <View ref={featureFlagsRef} onLayout={(e: LayoutChangeEvent) => { sectionY.current.featureFlags = e.nativeEvent.layout.y; }} collapsable={false}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: spacing.xl }]}>Feature flags</Text>
        <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
          Habilitar ou desabilitar funcionalidades da aplicação. As flags são criadas no banco sob demanda (ao ligar/desligar).
        </Text>
        {featureFlagsList.length === 0 ? (
          <View style={[styles.emptyBlock, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhuma feature flag cadastrada. Use a API ou o banco para criar flags (ex: require_email_verification).</Text>
          </View>
        ) : (
          featureFlagsList.map((flag: FeatureFlagItem) => (
            <View key={flag.key} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.background, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>{flag.key}</Text>
                {flag.description ? (
                  <Text style={[styles.sectionSub, { color: colors.textSecondary, marginTop: 2 }]}>{flag.description}</Text>
                ) : null}
              </View>
              <Switch
                value={flag.enabled}
                onValueChange={(enabled) => updateFeatureFlagMutation.mutate({ key: flag.key, enabled })}
                disabled={updateFeatureFlagMutation.isPending && updateFeatureFlagMutation.variables?.key === flag.key}
                trackColor={{ false: colors.background, true: colors.primary + '80' }}
                thumbColor={flag.enabled ? colors.primary : colors.textSecondary}
              />
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

      {/* Modal Novo parceiro */}
      <Modal visible={showCreatePartnerModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.modalContentScroll, { backgroundColor: colors.surface }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Novo parceiro</Text>
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Tipo</Text>
            <View style={styles.rowWrap}>
              {(['ONG', 'CLINIC', 'STORE'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, { backgroundColor: createPartnerForm.type === t ? colors.primary : colors.background }]}
                  onPress={() => setCreatePartnerForm((f) => ({ ...f, type: t }))}
                >
                  <Text style={{ color: createPartnerForm.type === t ? '#fff' : colors.textPrimary, fontSize: 13 }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Nome *</Text>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
              placeholder="Ex: Instituto Amor de Patas"
              placeholderTextColor={colors.textSecondary}
              value={createPartnerForm.name}
              onChangeText={(name) => setCreatePartnerForm((f) => ({ ...f, name }))}
            />
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Cidade (opcional)</Text>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
              placeholder="Ex: São Paulo"
              placeholderTextColor={colors.textSecondary}
              value={createPartnerForm.city ?? ''}
              onChangeText={(city) => setCreatePartnerForm((f) => ({ ...f, city }))}
            />
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Descrição (opcional)</Text>
            <TextInput
              style={[styles.searchInput, styles.feedbackInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
              placeholder="Breve descrição"
              placeholderTextColor={colors.textSecondary}
              value={createPartnerForm.description ?? ''}
              onChangeText={(description) => setCreatePartnerForm((f) => ({ ...f, description }))}
              multiline
              numberOfLines={3}
            />
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Site (opcional)</Text>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
              placeholder="https://..."
              placeholderTextColor={colors.textSecondary}
              value={createPartnerForm.website ?? ''}
              onChangeText={(website) => setCreatePartnerForm((f) => ({ ...f, website }))}
              autoCapitalize="none"
              keyboardType="url"
            />
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>E-mail (opcional)</Text>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
              placeholder="contato@..."
              placeholderTextColor={colors.textSecondary}
              value={createPartnerForm.email ?? ''}
              onChangeText={(email) => setCreatePartnerForm((f) => ({ ...f, email }))}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Telefone (opcional)</Text>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
              placeholder="(11) 99999-9999"
              placeholderTextColor={colors.textSecondary}
              value={createPartnerForm.phone ?? ''}
              onChangeText={(phone) => setCreatePartnerForm((f) => ({ ...f, phone }))}
              keyboardType="phone-pad"
            />
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Logo (aparece na página de parceiros)</Text>
            <View style={styles.partnerLogoRow}>
              <TextInput
                style={[styles.searchInput, { flex: 1, backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
                placeholder="URL da logo ou envie abaixo"
                placeholderTextColor={colors.textSecondary}
                value={createPartnerForm.logoUrl ?? ''}
                onChangeText={(logoUrl) => setCreatePartnerForm((f) => ({ ...f, logoUrl }))}
                autoCapitalize="none"
                keyboardType="url"
              />
              <TouchableOpacity
                style={[styles.uploadLogoBtn, { backgroundColor: colors.primary }]}
                onPress={() => uploadPartnerLogo(true)}
                disabled={partnerLogoUploading === 'create'}
              >
                {partnerLogoUploading === 'create' ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="cloud-upload" size={20} color="#fff" />}
              </TouchableOpacity>
            </View>
            {(createPartnerForm.logoUrl ?? '').trim() ? (
              <View style={styles.logoPreviewWrap}>
                <ExpoImage source={{ uri: (createPartnerForm.logoUrl ?? '').trim() }} style={styles.logoPreview} contentFit="contain" />
              </View>
            ) : null}
            <TouchableOpacity
              style={[styles.switchRow, { borderBottomColor: colors.background, marginTop: spacing.sm }]}
              onPress={() => setCreatePartnerForm((f) => ({ ...f, approve: !f.approve }))}
            >
              <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Aprovar ao criar (aparece no app)</Text>
              <View style={[styles.checkbox, createPartnerForm.approve && { backgroundColor: colors.primary }]}>
                {createPartnerForm.approve && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.switchRow, { borderBottomColor: colors.background, marginTop: spacing.sm }]}
              onPress={() => setCreatePartnerForm((f) => ({ ...f, isPaidPartner: !f.isPaidPartner }))}
            >
              <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Parceria paga (destaque no app e no feed)</Text>
              <View style={[styles.checkbox, createPartnerForm.isPaidPartner && { backgroundColor: colors.primary }]}>
                {createPartnerForm.isPaidPartner && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
            </TouchableOpacity>
            </ScrollView>
            <View style={[styles.modalActions, { marginTop: spacing.md }]}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.background }]}
                onPress={() => { setShowCreatePartnerModal(false); }}
              >
                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }, (createPartnerMutation.isPending || !createPartnerForm.name.trim()) && styles.modalBtnDisabled]}
                onPress={() => {
                  const body: CreatePartnerBody = {
                    type: createPartnerForm.type,
                    name: createPartnerForm.name.trim(),
                    ...(createPartnerForm.city?.trim() && { city: createPartnerForm.city.trim() }),
                    ...(createPartnerForm.description?.trim() && { description: createPartnerForm.description.trim() }),
                    ...(createPartnerForm.website?.trim() && { website: createPartnerForm.website.trim() }),
                    ...(createPartnerForm.email?.trim() && { email: createPartnerForm.email.trim() }),
                    ...(createPartnerForm.phone?.trim() && { phone: createPartnerForm.phone.trim() }),
                    ...(createPartnerForm.logoUrl?.trim() && { logoUrl: createPartnerForm.logoUrl.trim() }),
                    active: true,
                    approve: !!createPartnerForm.approve,
                    isPaidPartner: !!createPartnerForm.isPaidPartner,
                  };
                  createPartnerMutation.mutate(body);
                }}
                disabled={createPartnerMutation.isPending || !createPartnerForm.name.trim()}
              >
                <Text style={styles.modalBtnTextPrimary}>{createPartnerMutation.isPending ? 'Criando...' : 'Criar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Editar parceiro */}
      <Modal visible={!!editingPartner} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.modalContentScroll, { backgroundColor: colors.surface }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Editar parceiro</Text>
            {editingPartner ? (
              <>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Tipo</Text>
                <Text style={[styles.modalLabel, { color: colors.textPrimary, marginBottom: spacing.sm }]}>{editingPartner.type}</Text>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Nome *</Text>
                <TextInput
                  style={[styles.searchInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
                  placeholder="Nome"
                  placeholderTextColor={colors.textSecondary}
                  value={editPartnerForm.name}
                  onChangeText={(name) => setEditPartnerForm((f) => ({ ...f, name }))}
                />
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Cidade</Text>
                <TextInput
                  style={[styles.searchInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
                  placeholder="Cidade"
                  placeholderTextColor={colors.textSecondary}
                  value={editPartnerForm.city}
                  onChangeText={(city) => setEditPartnerForm((f) => ({ ...f, city }))}
                />
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Descrição</Text>
                <TextInput
                  style={[styles.searchInput, styles.feedbackInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
                  placeholder="Descrição"
                  placeholderTextColor={colors.textSecondary}
                  value={editPartnerForm.description}
                  onChangeText={(description) => setEditPartnerForm((f) => ({ ...f, description }))}
                  multiline
                  numberOfLines={3}
                />
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Site</Text>
                <TextInput
                  style={[styles.searchInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
                  placeholder="https://..."
                  placeholderTextColor={colors.textSecondary}
                  value={editPartnerForm.website}
                  onChangeText={(website) => setEditPartnerForm((f) => ({ ...f, website }))}
                  autoCapitalize="none"
                  keyboardType="url"
                />
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>E-mail</Text>
                <TextInput
                  style={[styles.searchInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
                  placeholder="E-mail"
                  placeholderTextColor={colors.textSecondary}
                  value={editPartnerForm.email}
                  onChangeText={(email) => setEditPartnerForm((f) => ({ ...f, email }))}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Telefone</Text>
                <TextInput
                  style={[styles.searchInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
                  placeholder="Telefone"
                  placeholderTextColor={colors.textSecondary}
                  value={editPartnerForm.phone}
                  onChangeText={(phone) => setEditPartnerForm((f) => ({ ...f, phone }))}
                  keyboardType="phone-pad"
                />
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Logo (aparece na página de parceiros)</Text>
                <View style={styles.partnerLogoRow}>
                  <TextInput
                    style={[styles.searchInput, { flex: 1, backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
                    placeholder="URL da logo ou envie abaixo"
                    placeholderTextColor={colors.textSecondary}
                    value={editPartnerForm.logoUrl}
                    onChangeText={(logoUrl) => setEditPartnerForm((f) => ({ ...f, logoUrl }))}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                  <TouchableOpacity
                    style={[styles.uploadLogoBtn, { backgroundColor: colors.primary }]}
                    onPress={() => editingPartner && uploadPartnerLogo(false, editingPartner.id)}
                    disabled={!!partnerLogoUploading}
                  >
                    {partnerLogoUploading === editingPartner?.id ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="cloud-upload" size={20} color="#fff" />}
                  </TouchableOpacity>
                </View>
                {editPartnerForm.logoUrl.trim() ? (
                  <View style={styles.logoPreviewWrap}>
                    <ExpoImage source={{ uri: editPartnerForm.logoUrl.trim() }} style={styles.logoPreview} contentFit="contain" />
                  </View>
                ) : null}
                <TouchableOpacity
                  style={[styles.switchRow, { borderBottomColor: colors.background, marginTop: spacing.sm }]}
                  onPress={() => setEditPartnerForm((f) => ({ ...f, active: !f.active }))}
                >
                  <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Ativo (visível quando aprovado)</Text>
                  <View style={[styles.checkbox, editPartnerForm.active && { backgroundColor: colors.primary }]}>
                    {editPartnerForm.active && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.switchRow, { borderBottomColor: colors.background, marginTop: spacing.sm }]}
                  onPress={() => setEditPartnerForm((f) => ({ ...f, isPaidPartner: !f.isPaidPartner }))}
                >
                  <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Parceria paga (destaque no app e no feed)</Text>
                  <View style={[styles.checkbox, editPartnerForm.isPaidPartner && { backgroundColor: colors.primary }]}>
                    {editPartnerForm.isPaidPartner && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </TouchableOpacity>
                {!editingPartner.approvedAt && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.primary, marginTop: spacing.md }]}
                    onPress={() => {
                      updatePartnerMutation.mutate({
                        id: editingPartner.id,
                        body: { approve: true },
                      });
                    }}
                    disabled={updatePartnerMutation.isPending}
                  >
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.actionBtnText}>Aprovar agora</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : null}
            </ScrollView>
            <View style={[styles.modalActions, { marginTop: spacing.md }]}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.background }]}
                onPress={() => setEditingPartner(null)}
              >
                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }, (updatePartnerMutation.isPending || !editPartnerForm.name.trim()) && styles.modalBtnDisabled]}
                onPress={() => {
                  if (!editingPartner) return;
                  const body: UpdatePartnerBody = {
                    name: editPartnerForm.name.trim(),
                    city: editPartnerForm.city.trim() || undefined,
                    description: editPartnerForm.description.trim() || undefined,
                    website: editPartnerForm.website.trim() || undefined,
                    email: editPartnerForm.email.trim() || undefined,
                    phone: editPartnerForm.phone.trim() || undefined,
                    logoUrl: editPartnerForm.logoUrl.trim() || undefined,
                    active: editPartnerForm.active,
                    isPaidPartner: editPartnerForm.isPaidPartner,
                  };
                  updatePartnerMutation.mutate({ id: editingPartner.id, body });
                }}
                disabled={updatePartnerMutation.isPending || !editPartnerForm.name.trim()}
              >
                <Text style={styles.modalBtnTextPrimary}>{updatePartnerMutation.isPending ? 'Salvando...' : 'Salvar'}</Text>
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    flexWrap: 'nowrap',
  },
  summaryCard: {
    width: '31%',
    minWidth: 100,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCardIcon: { marginBottom: 4 },
  summaryCount: { fontSize: 24, fontWeight: '800' },
  summaryTitle: { fontSize: 12, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  summarySub: { fontSize: 11, marginTop: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.xs },
  sectionSub: { fontSize: 13, marginBottom: spacing.md },
  adminWebCtaWrap: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
  },
  adminWebCtaTitle: { fontSize: 17, fontWeight: '700', marginBottom: spacing.xs },
  adminWebCtaSub: { fontSize: 14, marginBottom: spacing.md },
  adminWebCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
  },
  adminWebCtaBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
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
  petInfo: { flex: 1, marginLeft: spacing.sm, minWidth: 0 },
  petNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  petName: { fontSize: 16, fontWeight: '600', flex: 1, minWidth: 0 },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  partnerBadgeText: { fontSize: 11, fontWeight: '600' },
  linkRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkText: { fontSize: 13, fontWeight: '500' },
  cardRowWrap: { flexDirection: 'row', alignItems: 'center' },
  cardRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  cardType: { fontSize: 16, fontWeight: '600' },
  cardDetail: { fontSize: 14, marginTop: 4 },
  cardMeta: { fontSize: 13 },
  cardDate: { fontSize: 12, marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  cardActionsEqual: { flexWrap: 'nowrap' },
  actionBtnEqual: { flex: 1, minWidth: 0 },
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
  bugReportTypeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 6 },
  bugReportTypeText: { fontSize: 12, fontWeight: '600' },
  bugReportMessage: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  bugReportComment: { fontSize: 13, fontStyle: 'italic', marginTop: 4 },
  bugReportStack: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 6 },
  resolvedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: spacing.sm },
  resolvedText: { fontSize: 12, fontWeight: '600' },
  registerAdoptionBtn: { padding: spacing.md, borderRadius: 10, alignItems: 'center', marginBottom: spacing.md },
  registerAdoptionBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  adoptionCard: {},
  adoptionCardTouchable: { flex: 1 },
  adoptionCardHeader: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, marginBottom: 2 },
  adoptionPetName: { fontSize: 16, fontWeight: '600', flex: 1, minWidth: 0 },
  adoptionCardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  adoptionCardBtn: { flex: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center' },
  adoptionCardBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
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
  partnerLogoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  uploadLogoBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoPreviewWrap: { marginBottom: spacing.sm, alignItems: 'flex-start' },
  logoPreview: { width: 80, height: 80, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.06)' },
  partnerCardLogo: { width: 48, height: 48, borderRadius: 10, marginRight: spacing.md, backgroundColor: 'rgba(0,0,0,0.06)' },
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
  modalContentScroll: { maxHeight: '85%' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 20 },
  chipText: { fontSize: 13, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  switchLabel: { fontSize: 15, flex: 1 },
});
