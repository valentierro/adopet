import { useState, useEffect } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Toast, LoadingLogo } from '../../../src/components';
import { useTheme } from '../../../src/hooks/useTheme';
import { useToastWithDedupe } from '../../../src/hooks/useToastWithDedupe';
import {
  getAdminPendingAdoptionsByTutor,
  getAdminAdoptions,
  getAdminPetsAvailable,
  createAdoption,
  confirmAdoptionByAdopet,
  rejectAdoptionByAdopet,
  rejectPendingAdoptionByTutor,
  searchAdminUsers,
  type PendingAdoptionByTutorItem,
  type AdoptionItem,
  type PetAvailableItem,
  type UserSearchItem,
} from '../../../src/api/admin';
import { getFriendlyErrorMessage } from '../../../src/utils/errorMessage';
import { spacing } from '../../../src/theme';

export default function AdminAdoptionsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [selectedPendingAdoptionPetIds, setSelectedPendingAdoptionPetIds] = useState<Set<string>>(new Set());
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserSearchItem[]>([]);
  const [userSearching, setUserSearching] = useState(false);
  const [confirmAdoptionSearchQuery, setConfirmAdoptionSearchQuery] = useState('');
  const [confirmAdoptionSearchResults, setConfirmAdoptionSearchResults] = useState<UserSearchItem[]>([]);
  const [confirmAdoptionSearching, setConfirmAdoptionSearching] = useState(false);
  const [massConfirmSearchQuery, setMassConfirmSearchQuery] = useState('');
  const [massConfirmSearchResults, setMassConfirmSearchResults] = useState<UserSearchItem[]>([]);
  const [massConfirmSearching, setMassConfirmSearching] = useState(false);
  const [registerPetId, setRegisterPetId] = useState<string | null>(null);
  const [registerAdopterId, setRegisterAdopterId] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedAdoption, setSelectedAdoption] = useState<AdoptionItem | null>(null);
  const [confirmingAdoptionPetId, setConfirmingAdoptionPetId] = useState<string | null>(null);
  const [rejectingAdoptionPetId, setRejectingAdoptionPetId] = useState<string | null>(null);
  const { toastMessage, setToastMessage, showToast } = useToastWithDedupe();
  const [confirmAdoptionPendingItem, setConfirmAdoptionPendingItem] = useState<PendingAdoptionByTutorItem | null>(null);
  const [confirmAdoptionSelectedAdopterId, setConfirmAdoptionSelectedAdopterId] = useState<string | null>(null);
  const [showMassConfirmAdoptionModal, setShowMassConfirmAdoptionModal] = useState(false);
  const [massConfirmSelectedAdopterId, setMassConfirmSelectedAdopterId] = useState<string | null>(null);
  const [massConfirmSubmitting, setMassConfirmSubmitting] = useState(false);
  const [rejectInProgressPetId, setRejectInProgressPetId] = useState<string | null>(null);
  const [massRejecting, setMassRejecting] = useState(false);

  const { data: adoptionsList = [], refetch: refetchAdoptions, isRefetching: refetchingAdoptions } = useQuery({
    queryKey: ['admin', 'adoptions'],
    queryFn: getAdminAdoptions,
  });

  const { data: petsAvailable = [], refetch: refetchPetsAvailable } = useQuery({
    queryKey: ['admin', 'pets-available'],
    queryFn: getAdminPetsAvailable,
  });

  const {
    data: pendingAdoptionsByTutor = [],
    refetch: refetchPendingByTutor,
    isLoading: loadingPendingByTutor,
  } = useQuery({
    queryKey: ['admin', 'pending-adoptions-by-tutor'],
    queryFn: getAdminPendingAdoptionsByTutor,
  });

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

  const pendingAdoptionsList = adoptionsList.filter((a) => !a.confirmedByAdopet);

  const createAdoptionMutation = useMutation({
    mutationFn: ({ petId, adopterUserId }: { petId: string; adopterUserId?: string }) =>
      createAdoption(petId, adopterUserId),
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
      showToast('Adoção registrada. O pet foi marcado como adotado.');
    },
    onError: (e: unknown) =>
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível registrar a adoção.')),
  });

  const confirmByAdopetMutation = useMutation({
    mutationFn: (petId: string) => confirmAdoptionByAdopet(petId),
    onMutate: (petId) => setConfirmingAdoptionPetId(petId),
    onSuccess: (_, petId) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'adoptions'] });
      setSelectedAdoption((prev) => (prev && prev.petId === petId ? { ...prev, confirmedByAdopet: true } : prev));
      setSelectedPendingAdoptionPetIds((prev) => {
        const s = new Set(prev);
        s.delete(petId);
        return s;
      });
      showToast('Adoção confirmada pelo Adopet.');
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
      setSelectedPendingAdoptionPetIds((prev) => {
        const s = new Set(prev);
        s.delete(petId);
        return s;
      });
      showToast('Adoção rejeitada pelo Adopet.');
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível rejeitar.')),
    onSettled: () => setRejectingAdoptionPetId(null),
  });

  const bulkConfirmPendingMutation = useMutation({
    mutationFn: async (petIds: string[]) => {
      await Promise.all(petIds.map((id) => confirmAdoptionByAdopet(id)));
    },
    onSuccess: (_, petIds) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'adoptions'] });
      setSelectedPendingAdoptionPetIds(new Set());
      showToast(`${petIds.length} adoção(ões) confirmada(s) pelo Adopet.`);
    },
    onError: (e: unknown) =>
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível confirmar em massa.')),
  });

  const bulkRejectPendingMutation = useMutation({
    mutationFn: async (petIds: string[]) => {
      await Promise.all(petIds.map((id) => rejectAdoptionByAdopet(id)));
    },
    onSuccess: (_, petIds) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'adoptions'] });
      setSelectedPendingAdoptionPetIds(new Set());
      showToast(`${petIds.length} adoção(ões) rejeitada(s) pelo Adopet.`);
    },
    onError: (e: unknown) =>
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível rejeitar em massa.')),
  });

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
              showToast('Rejeitado. O tutor verá o badge em Meus anúncios.');
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
            showToast(
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
        showToast(`${done} confirmada(s). ${errorMessage}`);
      } else {
        showToast(
          petIds.length === 1 ? 'Adoção registrada.' : `${petIds.length} adoções registradas.`,
        );
      }
    } finally {
      setMassConfirmSubmitting(false);
    }
  };

  const onRefresh = () => {
    refetchAdoptions();
    refetchPendingByTutor();
    refetchPetsAvailable();
  };

  if (loadingPendingByTutor) {
    return (
      <ScreenContainer>
        <View style={styles.loadingWrap}>
          <LoadingLogo size={100} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      scroll
      refreshControl={
        <RefreshControl
          refreshing={refetchingAdoptions}
          onRefresh={onRefresh}
          colors={[colors.primary]}
        />
      }
    >
      {/* Pets marcados como adotados pelo tutor (aguardando confirmação) */}
      {pendingAdoptionsByTutor.length > 0 && (
        <View>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Pets marcados como adotados pelo tutor ({pendingAdoptionsByTutor.length})
          </Text>
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
                  <Text style={styles.batchBtnText}>
                    {massRejecting ? 'Rejeitando...' : 'Rejeitar selecionados'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {pendingAdoptionsByTutor.map((item) => (
            <View
              key={item.petId}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.background }]}
            >
              <View style={styles.cardRowWrap}>
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    selectedPendingAdoptionPetIds.has(item.petId) && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => togglePendingAdoptionSelection(item.petId)}
                >
                  {selectedPendingAdoptionPetIds.has(item.petId) && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <View style={styles.adoptionCardHeader}>
                    <Text style={[styles.adoptionPetName, { color: colors.textPrimary }]}>{item.petName}</Text>
                    <View
                      style={[
                        styles.adoptionBadge,
                        styles.adoptionBadgePending,
                        { backgroundColor: (colors.error || '#DC2626') + '20' },
                      ]}
                    >
                      <Ionicons name="time-outline" size={14} color={colors.error || '#DC2626'} />
                      <Text style={[styles.adoptionBadgeText, { color: colors.error || '#DC2626' }]}>
                        Aguardando confirmação
                      </Text>
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
                    Marcado em {new Date(item.markedAt).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(item.markedAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  {item.autoApproveAt ? (
                    <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
                      Validação automática em {new Date(item.autoApproveAt).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(item.autoApproveAt).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
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
                              {
                                text: 'Confirmar',
                                onPress: () => createAdoptionMutation.mutate({ petId: item.petId }),
                              },
                            ],
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
                        {createAdoptionMutation.isPending
                          ? 'Salvando...'
                          : item.pendingAdopterId
                            ? 'Confirmar (indicado)'
                            : 'Confirmar adoção'}
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

      {/* Adoções registradas + Registrar adoção */}
      <View>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Adoções registradas ({adoptionsList.length})
        </Text>
        <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
          Registros com tutor e adotante. Registrar nova adoção marca o pet como adotado e atualiza a pontuação do
          tutor.
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
                        onPress: () =>
                          bulkRejectPendingMutation.mutate(Array.from(selectedPendingAdoptionPetIds)),
                      },
                    ],
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
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhuma adoção registrada ainda.
            </Text>
          </View>
        ) : (
          adoptionsList.slice(0, 20).map((a) => (
            <View
              key={a.id}
              style={[
                styles.card,
                styles.adoptionCard,
                { backgroundColor: colors.surface, borderColor: colors.background },
              ]}
            >
              <TouchableOpacity
                style={styles.adoptionCardTouchable}
                onPress={() => setSelectedAdoption(a)}
                activeOpacity={0.7}
              >
                <View style={styles.adoptionCardHeader}>
                  {!a.confirmedByAdopet ? (
                    <TouchableOpacity
                      style={[
                        styles.checkbox,
                        selectedPendingAdoptionPetIds.has(a.petId) && { backgroundColor: colors.primary },
                      ]}
                      onPress={() => {
                        setSelectedPendingAdoptionPetIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(a.petId)) next.delete(a.petId);
                          else next.add(a.petId);
                          return next;
                        });
                      }}
                    >
                      {selectedPendingAdoptionPetIds.has(a.petId) && (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      )}
                    </TouchableOpacity>
                  ) : null}
                  <Text
                    style={[styles.adoptionPetName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {a.petName}
                  </Text>
                  {a.confirmedByAdopet ? (
                    <View
                      style={[
                        styles.adoptionBadge,
                        styles.adoptionBadgeConfirmed,
                        { backgroundColor: colors.primary + '20' },
                      ]}
                    >
                      <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                      <Text style={[styles.adoptionBadgeText, { color: colors.primary }]}>Confirmado</Text>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.adoptionBadge,
                        { backgroundColor: (colors.textSecondary || '#78716c') + '25' },
                      ]}
                    >
                      <Text
                        style={[styles.adoptionBadgeText, { color: colors.textSecondary || '#78716c' }]}
                      >
                        Aguardando confirmação Adopet
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>Tutor: {a.tutorName}</Text>
                <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>Adotante: {a.adopterName}</Text>
                <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
                  {new Date(a.adoptedAt).toLocaleDateString('pt-BR')}
                </Text>
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
                          {
                            text: 'Rejeitar',
                            style: 'destructive',
                            onPress: () => rejectByAdopetMutation.mutate(a.petId),
                          },
                        ],
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
          <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
            Exibindo as 20 mais recentes.
          </Text>
        )}
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
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
              Adotante (busque por nome ou email)
            </Text>
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                  borderColor: colors.primary + '40',
                },
              ]}
              placeholder="Nome ou email..."
              placeholderTextColor={colors.textSecondary}
              value={massConfirmSearchQuery}
              onChangeText={setMassConfirmSearchQuery}
              autoCapitalize="none"
            />
            {massConfirmSearching && (
              <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
            )}
            <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
              {massConfirmSearchResults.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={[
                    styles.pickerItem,
                    massConfirmSelectedAdopterId === u.id && { backgroundColor: colors.primary + '25' },
                  ]}
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
                <Text
                  style={[
                    styles.pickerItemText,
                    { color: colors.textPrimary, marginBottom: spacing.md },
                  ]}
                >
                  {confirmAdoptionPendingItem.petName} (tutor: {confirmAdoptionPendingItem.tutorName})
                </Text>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
                  Adotante (busque por nome ou email)
                </Text>
                <TextInput
                  style={[
                    styles.searchInput,
                    {
                      backgroundColor: colors.background,
                      color: colors.textPrimary,
                      borderColor: colors.primary + '40',
                    },
                  ]}
                  placeholder="Nome ou email..."
                  placeholderTextColor={colors.textSecondary}
                  value={confirmAdoptionSearchQuery}
                  onChangeText={setConfirmAdoptionSearchQuery}
                  autoCapitalize="none"
                />
                {confirmAdoptionSearching && (
                  <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
                )}
                <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                  {confirmAdoptionSearchResults.map((u) => (
                    <TouchableOpacity
                      key={u.id}
                      style={[
                        styles.pickerItem,
                        confirmAdoptionSelectedAdopterId === u.id && { backgroundColor: colors.primary + '25' },
                      ]}
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
                      (!confirmAdoptionSelectedAdopterId || createAdoptionMutation.isPending) &&
                        styles.modalBtnDisabled,
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

      {/* Modal Registrar adoção */}
      <Modal visible={showRegisterModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Registrar adoção</Text>
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Pet</Text>
            <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
              {petsAvailable.map((p: PetAvailableItem) => (
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
            {petsAvailable.length === 0 && (
              <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                Nenhum pet disponível (já adotados ou não aprovados).
              </Text>
            )}
            <Text style={[styles.modalLabel, { color: colors.textSecondary, marginTop: spacing.md }]}>
              Adotante (busque por nome ou email)
            </Text>
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                  borderColor: colors.primary + '40',
                },
              ]}
              placeholder="Nome ou email..."
              placeholderTextColor={colors.textSecondary}
              value={userSearchQuery}
              onChangeText={setUserSearchQuery}
              autoCapitalize="none"
            />
            {userSearching && (
              <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
            )}
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
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.background }]}
                onPress={() => setShowRegisterModal(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  { backgroundColor: colors.primary },
                  (!registerPetId || !registerAdopterId || createAdoptionMutation.isPending) &&
                    styles.modalBtnDisabled,
                ]}
                onPress={() => {
                  if (registerPetId && registerAdopterId)
                    createAdoptionMutation.mutate({ petId: registerPetId, adopterUserId: registerAdopterId });
                }}
                disabled={!registerPetId || !registerAdopterId || createAdoptionMutation.isPending}
              >
                <Text style={styles.modalBtnTextPrimary}>
                  {createAdoptionMutation.isPending ? 'Salvando...' : 'Registrar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Detalhes da adoção */}
      <Modal visible={selectedAdoption != null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setSelectedAdoption(null)}
          />
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]} collapsable={false}>
            {selectedAdoption ? (
              <>
                {selectedAdoption.confirmedByAdopet ? (
                  <View
                    style={[
                      styles.adoptionBadge,
                      styles.adoptionBadgeConfirmed,
                      {
                        backgroundColor: colors.primary + '20',
                        alignSelf: 'flex-start',
                        marginBottom: spacing.md,
                      },
                    ]}
                  >
                    <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                    <Text style={[styles.adoptionBadgeText, { color: colors.primary }]}>
                      Confirmado pelo Adopet
                    </Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.adoptionBadge,
                      {
                        backgroundColor: (colors.textSecondary || '#78716c') + '25',
                        alignSelf: 'flex-start',
                        marginBottom: spacing.md,
                      },
                    ]}
                  >
                    <Text style={[styles.adoptionBadgeText, { color: colors.textSecondary || '#78716c' }]}>
                      Aguardando confirmação Adopet
                    </Text>
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
                  {new Date(selectedAdoption.adoptedAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
                <View style={[styles.modalActions, { marginTop: spacing.lg }]}>
                  <TouchableOpacity
                    style={[
                      styles.modalBtn,
                      {
                        backgroundColor: colors.primary,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      },
                    ]}
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

      {toastMessage != null && (
        <Toast message={toastMessage} onHide={() => setToastMessage(null)} />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
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
  batchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  batchBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  loader: { marginVertical: spacing.md },
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
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkText: { fontSize: 13, fontWeight: '500' },
  registerAdoptionBtn: { padding: spacing.md, borderRadius: 10, alignItems: 'center', marginBottom: spacing.md },
  registerAdoptionBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  adoptionCard: {},
  adoptionCardTouchable: { flex: 1 },
  adoptionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: 2,
  },
  adoptionPetName: { fontSize: 16, fontWeight: '600', flex: 1, minWidth: 0 },
  adoptionCardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  adoptionCardBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  adoptionCardBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  adoptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  adoptionBadgeText: { fontSize: 12, fontWeight: '600' },
  adoptionBadgePending: {},
  adoptionBadgeConfirmed: {},
  detailRow: { fontSize: 15, marginBottom: spacing.sm },
  detailLabel: { fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: { borderRadius: 16, padding: spacing.lg, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  modalLabel: { fontSize: 12, fontWeight: '600', marginBottom: spacing.xs },
  searchInput: {
    padding: spacing.md,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
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
