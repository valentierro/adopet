import React, { useState, useCallback, useLayoutEffect, useRef, useEffect } from 'react';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  FlatList,
  TouchableOpacity,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Share,
  Modal,
  Pressable,
  TextInput,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { ScreenContainer, PrimaryButton, SecondaryButton, StatusBadge, LoadingLogo, VerifiedBadge, TutorLevelBadge, MatchScoreBadge, Toast } from '../../../src/components';
import { useTheme } from '../../../src/hooks/useTheme';
import { useAuthStore } from '../../../src/stores/authStore';
import { getPetById } from '../../../src/api/pet';
import { getSimilarPets, getMatchScore, recordPetView } from '../../../src/api/pets';
import { addFavorite, removeFavorite, getFavorites } from '../../../src/api/favorites';
import { undoPass } from '../../../src/api/swipes';
import { getMe, getPreferences } from '../../../src/api/me';
import { createConversation } from '../../../src/api/conversations';
import { createReport } from '../../../src/api/reports';
import { setPetPublication } from '../../../src/api/admin';
import { getMyPartner, approveOngPet, rejectOngPet } from '../../../src/api/partner';
import { getVerificationStatus } from '../../../src/api/verification';
import { getFriendlyErrorMessage } from '../../../src/utils/errorMessage';
import { getMatchScoreColor } from '../../../src/utils/matchScoreColor';
import { getSpeciesLabel, getSizeLabel, getSexLabel } from '../../../src/utils/petLabels';
import { addViewedPetId } from '../../../src/utils/viewedPets';
import { trackEvent } from '../../../src/analytics';
import { spacing } from '../../../src/theme';
import { configureExpandAnimation } from '../../../src/utils/layoutAnimation';
import { Ionicons } from '@expo/vector-icons';

const REPORT_REASONS: { label: string; value: string }[] = [
  { label: 'Conteúdo inadequado', value: 'INAPPROPRIATE' },
  { label: 'Spam', value: 'SPAM' },
  { label: 'Informação falsa', value: 'MISLEADING' },
  { label: 'Outro', value: 'OTHER' },
];

const FEEDING_LABEL: Record<string, string> = { dry: 'Ração seca', wet: 'Ração úmida', mixed: 'Mista', natural: 'Natural', other: 'Outra' };
const ENERGY_LABEL: Record<string, string> = { LOW: 'Calmo', MEDIUM: 'Moderado', HIGH: 'Agitado' };
const TEMPERAMENT_LABEL: Record<string, string> = { CALM: 'Tranquilo', PLAYFUL: 'Brincalhão', SHY: 'Tímido', SOCIABLE: 'Sociável', INDEPENDENT: 'Independente' };

const PETS_ALLOWED_LABEL: Record<string, string> = { YES: 'Sim', NO: 'Não', UNSURE: 'Não sei' };
const GOOD_WITH_LABEL: Record<string, string> = { YES: 'Sim', NO: 'Não', UNKNOWN: 'Não sei' };
const EXPERIENCE_LABEL: Record<string, string> = { NEVER: 'Nunca tive', HAD_BEFORE: 'Já tive', HAVE_NOW: 'Tenho atualmente' };
const HOUSEHOLD_AGREES_LABEL: Record<string, string> = { YES: 'Sim, todos concordam', DISCUSSING: 'Ainda conversando' };
const TIME_AT_HOME_LABEL: Record<string, string> = { MOST_DAY: 'Maior parte do dia', HALF_DAY: 'Metade do dia', LITTLE: 'Pouco tempo', INDIFERENTE: 'Indiferente' };
const HOUSING_LABEL: Record<string, string> = { CASA: 'Casa', APARTAMENTO: 'Apartamento', INDIFERENTE: 'Indiferente' };
const WALK_FREQ_LABEL: Record<string, string> = { DAILY: 'Diariamente', FEW_TIMES_WEEK: 'Algumas vezes por semana', RARELY: 'Raramente', INDIFERENTE: 'Indiferente' };
const SIM_NAO_INDIFERENTE_LABEL: Record<string, string> = { SIM: 'Sim', NAO: 'Não', INDIFERENTE: 'Indiferente' };

function CtaPulse({ children }: { children: React.ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.03, duration: 1200, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [scale]);
  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

function PetPhotoGallery({
  photos,
  onPhotoPress,
  verified,
}: {
  photos: string[];
  onPhotoPress?: (uri: string) => void;
  verified?: boolean;
}) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(Math.min(i, photos.length - 1));
  };
  const slide = (uri: string) => (
    <TouchableOpacity
      style={[styles.imageSlide, { width }]}
      onPress={() => onPhotoPress?.(uri)}
      activeOpacity={1}
    >
      <Image source={{ uri }} style={styles.image} contentFit="cover" />
    </TouchableOpacity>
  );
  const badgeOverlay = verified ? (
    <View style={styles.galleryVerifiedBadge} pointerEvents="none">
      <VerifiedBadge variant="pet" size={51} />
    </View>
  ) : null;
  if (photos.length === 0) return null;
  if (photos.length === 1) {
    return (
      <View style={styles.imageWrap}>
        <TouchableOpacity onPress={() => onPhotoPress?.(photos[0])} activeOpacity={1}>
          <Image source={{ uri: photos[0] }} style={styles.image} contentFit="cover" />
        </TouchableOpacity>
        {badgeOverlay}
      </View>
    );
  }
  return (
    <View style={styles.imageWrap}>
      <FlatList
        data={photos}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={styles.galleryList}
        keyExtractor={(uri, i) => `${i}-${uri.slice(-20)}`}
        renderItem={({ item }) => slide(item)}
      />
      <View style={styles.dots}>
        {photos.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
      {badgeOverlay}
    </View>
  );
}

export default function PetDetailsScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const userId = useAuthStore((s) => s.user?.id);
  const isGuest = !userId;

  useLayoutEffect(() => {
    if (from === 'passed-pets') {
      navigation.setOptions({
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.replace('/passed-pets')}
            style={{ padding: 8, marginLeft: 4 }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ),
      });
    } else if (isGuest && from === 'map') {
      navigation.setOptions({
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/map')}
            style={{ padding: 8, marginLeft: 4 }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ),
      });
    } else if (isGuest) {
      navigation.setOptions({
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/feed')}
            style={{ padding: 8, marginLeft: 4 }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ),
      });
    }
  }, [from, isGuest, navigation, colors.textPrimary, router]);
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: getMe, enabled: !!userId });
  const profileComplete = !!(user?.avatarUrl && user?.phone);
  const { data: pet, isLoading, isError, refetch: refetchPet } = useQuery({
    queryKey: ['pet', id],
    queryFn: () => getPetById(id!),
    enabled: !!id,
  });

  const { data: matchScoreData } = useQuery({
    queryKey: ['match-score', id, userId],
    queryFn: () => getMatchScore(id!, userId!),
    enabled: !!id && !!userId,
  });
  const { data: prefs } = useQuery({
    queryKey: ['me', 'preferences'],
    queryFn: getPreferences,
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
  const completionPercent = prefs && typeof (prefs as { completionPercent?: number }).completionPercent === 'number'
    ? (prefs as { completionPercent: number }).completionPercent
    : null;

  useFocusEffect(
    useCallback(() => {
      if (id) {
        refetchPet();
        addViewedPetId(id, userId);
      }
    }, [id, refetchPet, userId]),
  );
  const { data: favoritesData } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => getFavorites(),
    enabled: !!userId,
  });
  const favorites = favoritesData?.items ?? [];
  const isFavorited = !!id && favorites.some((f) => f.petId === id);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const addFavMutation = useMutation({
    mutationFn: () => addFavorite(id!),
    onSuccess: () => {
      setToastMessage('Adicionado aos favoritos!');
      if (id) trackEvent({ name: 'favorite_added', properties: { petId: id } });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      if (from === 'passed-pets') {
        undoPass(id!).then(() => {
          queryClient.invalidateQueries({ queryKey: ['swipes', 'passed'] });
          queryClient.invalidateQueries({ queryKey: ['feed'] });
        }).catch(() => {});
      }
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível adicionar aos favoritos.'));
    },
  });
  const removeFavMutation = useMutation({
    mutationFn: () => removeFavorite(id!),
    onSuccess: () => {
      setToastMessage('Removido dos favoritos');
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível remover dos favoritos.'));
    },
  });
  const reportMutation = useMutation({
    mutationFn: ({ reason, description }: { reason: string; description?: string }) =>
      createReport({ targetType: 'PET', targetId: id!, reason, description: description?.trim() || undefined }),
    onSuccess: () => {
      setReportModalVisible(false);
      setReportReason(null);
      setReportDescription('');
      Alert.alert('Denúncia enviada', 'Obrigado. Nossa equipe analisará o conteúdo.');
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível enviar a denúncia.'));
    },
  });
  const { data: verificationStatus } = useQuery({
    queryKey: ['verification-status'],
    queryFn: getVerificationStatus,
    staleTime: 30_000,
    enabled: !!userId && userId === pet?.ownerId,
  });
  const isOwner = !!userId && !!pet && userId === pet.ownerId;
  const isAdmin = user?.isAdmin === true;
  const isPendingPublication = pet?.publicationStatus === 'PENDING';
  const isPendingOngApproval = pet?.publicationStatus === 'PENDING_ONG_APPROVAL';
  const { data: partner } = useQuery({
    queryKey: ['me', 'partner'],
    queryFn: getMyPartner,
    enabled: !!userId && !!pet?.partner?.id,
  });
  const isOngAdminOfPet =
    isPendingOngApproval &&
    !!partner?.isOngAdmin &&
    partner?.type === 'ONG' &&
    partner?.id === (pet as { partner?: { id?: string } })?.partner?.id;
  const setPublicationMutation = useMutation({
    mutationFn: (status: 'APPROVED' | 'REJECTED') => setPetPublication(id!, status),
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ['pet', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-pets'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      if (status === 'APPROVED') {
        Alert.alert('Anúncio aprovado', 'O anúncio foi aprovado e já aparece no feed.', [{ text: 'OK', onPress: () => router.back() }]);
      } else {
        Alert.alert('Anúncio reprovado', 'O anúncio foi reprovado. O tutor será notificado.', [{ text: 'OK', onPress: () => router.back() }]);
      }
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível atualizar o anúncio.'));
    },
  });
  const approveOngMutation = useMutation({
    mutationFn: () => approveOngPet(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pet', id] });
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'ong-pets'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'ong-pets', 'pending-count'] });
      Alert.alert('Sucesso', 'Anúncio aprovado com sucesso. O pet já aparece no feed.', [{ text: 'OK', onPress: () => router.back() }]);
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível aprovar o anúncio.'));
    },
  });
  const rejectOngMutation = useMutation({
    mutationFn: (reason: string) => rejectOngPet(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pet', id] });
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'ong-pets'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'ong-pets', 'pending-count'] });
      setShowRejectOngModal(false);
      setRejectOngReason('');
      Alert.alert('Sucesso', 'Anúncio rejeitado. O membro será notificado com o motivo informado.', [{ text: 'OK', onPress: () => router.back() }]);
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível rejeitar o anúncio.'));
    },
  });
  const { data: similarPets = [] } = useQuery({
    queryKey: ['pet', id, 'similar'],
    queryFn: () => getSimilarPets(id!),
    enabled: !!id && !!pet,
  });

  const viewRecordedRef = useRef(false);
  useEffect(() => {
    if (!id || !userId || !pet || viewRecordedRef.current) return;
    viewRecordedRef.current = true;
    trackEvent({ name: 'pet_viewed', properties: { petId: id } });
    const fromPassedScreen = from === 'passed-pets';
    recordPetView(id, { fromPassedScreen }).catch(() => {});
  }, [id, userId, pet, from]);

  const petVerificationRequest = verificationStatus?.requests?.find(
    (r) => r.type === 'PET_VERIFIED' && r.petId === id,
  );
  const canRequestPetVerification =
    isOwner && !pet?.verified && !petVerificationRequest;
  const petVerificationFeedback =
    petVerificationRequest?.status === 'PENDING'
      ? 'Solicitação de verificação em análise'
      : petVerificationRequest?.status === 'REJECTED'
        ? petVerificationRequest.rejectionReason
          ? `Solicitação não aprovada: ${petVerificationRequest.rejectionReason}. Você pode solicitar novamente após ajustes.`
          : 'Solicitação de verificação não aprovada. Você pode solicitar novamente após ajustes.'
        : null;

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportDescription, setReportDescription] = useState('');
  const [fullScreenPhoto, setFullScreenPhoto] = useState<string | null>(null);
  const [sobreExpanded, setSobreExpanded] = useState(false);
  const [alimentacaoExpanded, setAlimentacaoExpanded] = useState(false);
  const [porQueDoandoExpanded, setPorQueDoandoExpanded] = useState(false);
  const [comportamentoSaudeExpanded, setComportamentoSaudeExpanded] = useState(false);
  const [preferenciasTutorExpanded, setPreferenciasTutorExpanded] = useState(false);

  const handleDenunciar = () => {
    Alert.alert(
      'Denunciar anúncio',
      'Selecione o motivo da denúncia:',
      [
        ...REPORT_REASONS.map((r) => ({
          text: r.label,
          onPress: () => {
            setReportReason(r.value);
            setReportModalVisible(true);
          },
        })),
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const handleEnviarDenuncia = () => {
    if (!reportReason) return;
    reportMutation.mutate({ reason: reportReason, description: reportDescription || undefined });
  };

  const [tutorModalVisible, setTutorModalVisible] = useState(false);
  const [showCompleteProfileModal, setShowCompleteProfileModal] = useState(false);
  const [showRejectOngModal, setShowRejectOngModal] = useState(false);
  const [rejectOngReason, setRejectOngReason] = useState('');
  const [showMatchScoreModal, setShowMatchScoreModal] = useState(false);
  const [matchSectionExpanded, setMatchSectionExpanded] = useState(true);
  const [mismatchSectionExpanded, setMismatchSectionExpanded] = useState(true);
  const [neutralSectionExpanded, setNeutralSectionExpanded] = useState(false);
  const [conversarLoading, setConversarLoading] = useState(false);

  const handleConversar = async () => {
    if (!profileComplete) {
      setShowCompleteProfileModal(true);
      return;
    }
    if (!isFavorited) {
      Alert.alert('Favoritar primeiro', 'Adicione aos favoritos para poder conversar com o tutor.');
      return;
    }
    setConversarLoading(true);
    try {
      const { id: convId } = await createConversation(id!);
      trackEvent({ name: 'open_chat', properties: { petId: id!, conversationId: convId } });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.refetchQueries({ queryKey: ['conversations'] });
      router.push(`/chat/${convId}`);
    } catch (e: unknown) {
      Alert.alert('Conversar', getFriendlyErrorMessage(e, 'Não foi possível abrir a conversa. Tente novamente.'));
    } finally {
      setConversarLoading(false);
    }
  };


  const handleCompartilhar = async () => {
    try {
      const url = `https://appadopet.com.br/pet/${id}`;
      await Share.share({
        message: `${pet?.name} está disponível para adoção no Adopet. ${url}`,
        title: `Adopet – ${pet?.name}`,
        url,
      });
    } catch {
      // user cancelled or error
    }
  };

  if (isLoading || !pet) {
    if (isError && !pet) {
      return (
        <ScreenContainer>
          <View style={styles.errorWrap}>
            <Ionicons name="warning-outline" size={48} color={colors.textSecondary} style={{ marginBottom: spacing.md }} />
            <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Não foi possível carregar este anúncio</Text>
            <Text style={[styles.errorSub, { color: colors.textSecondary }]}>
              O anúncio pode não existir ou você está sem conexão. Tente novamente ou volte ao início.
            </Text>
            <PrimaryButton title="Tentar novamente" onPress={() => refetchPet()} style={{ marginBottom: spacing.sm }} />
            <SecondaryButton title="Ir ao início" onPress={() => router.replace('/(tabs)')} />
          </View>
        </ScreenContainer>
      );
    }
    return (
      <ScreenContainer>
        <LoadingLogo size={160} />
      </ScreenContainer>
    );
  }

  const photos = pet.photos?.length ? pet.photos : ['https://picsum.photos/seed/pet/400/400'];

  const matchScoreModalContent = showMatchScoreModal && matchScoreData && matchScoreData.score != null ? (() => {
        const criteria = matchScoreData.criteria ?? [];
        const matchItems = criteria.length > 0
          ? criteria.filter((c) => c.status === 'match').map((c) => c.message)
          : (matchScoreData.highlights ?? []);
        const mismatchItems = criteria.length > 0
          ? criteria.filter((c) => c.status === 'mismatch').map((c) => c.message)
          : (matchScoreData.concerns ?? []);
        const neutralItems = criteria.length > 0
          ? criteria.filter((c) => c.status === 'neutral').map((c) => c.message)
          : [];
        const hex = getMatchScoreColor(matchScoreData.score);
        return (
          <Modal visible transparent animationType="fade" onRequestClose={() => setShowMatchScoreModal(false)}>
            <View style={styles.matchScoreModalOverlayWrap}>
              <Pressable style={styles.modalOverlay} onPress={() => setShowMatchScoreModal(false)}>
                <Pressable style={[styles.modalCard, styles.matchScoreModalCard, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
                <View style={[styles.matchScoreModalHeader, { backgroundColor: hex + '20' }]}>
                  <View style={styles.matchScoreModalHeaderInner}>
                    <Ionicons name="speedometer-outline" size={40} color={hex} style={styles.matchScoreModalHeaderIcon} />
                    <Text style={[styles.matchScoreModalScore, { color: hex }]}>{matchScoreData.score}%</Text>
                    <Text style={[styles.matchScoreModalSubtitle, { color: colors.textSecondary }]}>compatibilidade com você</Text>
                  </View>
                </View>
                <ScrollView style={styles.matchScoreModalScroll} contentContainerStyle={styles.matchScoreModalScrollContent} showsVerticalScrollIndicator={true} bounces={true}>
                  {matchItems.length > 0 ? (
                    <View style={styles.matchScoreModalSection}>
                      <TouchableOpacity
                        style={styles.matchScoreModalSectionHeader}
                        onPress={() => { configureExpandAnimation(); setMatchSectionExpanded((e) => !e); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.matchScoreModalSectionTitle, { color: hex }]}>Pontos em comum</Text>
                        <Text style={[styles.matchScoreModalSectionCount, { color: colors.textSecondary }]}>{matchItems.length}</Text>
                        <Ionicons name={matchSectionExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                      {matchSectionExpanded && matchItems.map((msg, i) => (
                        <View key={i} style={styles.matchScoreModalRow}>
                          <View style={styles.matchScoreModalRowIcon}>
                            <Ionicons name="checkmark-circle" size={18} color={hex} />
                          </View>
                          <Text style={[styles.matchScoreModalItem, { color: colors.textPrimary }]}>{String(msg).replace(/\n/g, ' ')}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  {mismatchItems.length > 0 ? (
                    <View style={styles.matchScoreModalSection}>
                      <TouchableOpacity
                        style={styles.matchScoreModalSectionHeader}
                        onPress={() => { configureExpandAnimation(); setMismatchSectionExpanded((e) => !e); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.matchScoreModalSectionTitle, { color: colors.textSecondary }]}>Pontos de atenção</Text>
                        <Text style={[styles.matchScoreModalSectionCount, { color: colors.textSecondary }]}>{mismatchItems.length}</Text>
                        <Ionicons name={mismatchSectionExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                      {mismatchSectionExpanded && mismatchItems.map((msg, i) => (
                        <View key={i} style={styles.matchScoreModalRow}>
                          <View style={styles.matchScoreModalRowIcon}>
                            <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
                          </View>
                          <Text style={[styles.matchScoreModalItem, { color: colors.textSecondary }]}>{String(msg).replace(/\n/g, ' ')}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  {neutralItems.length > 0 ? (
                    <View style={styles.matchScoreModalSection}>
                      <TouchableOpacity
                        style={styles.matchScoreModalSectionHeader}
                        onPress={() => { configureExpandAnimation(); setNeutralSectionExpanded((e) => !e); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.matchScoreModalSectionTitle, { color: colors.textSecondary }]}>Não informado no perfil</Text>
                        <Text style={[styles.matchScoreModalSectionCount, { color: colors.textSecondary }]}>{neutralItems.length}</Text>
                        <Ionicons name={neutralSectionExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                      {neutralSectionExpanded && neutralItems.map((msg, i) => (
                        <View key={i} style={styles.matchScoreModalRow}>
                          <View style={styles.matchScoreModalRowIcon}>
                            <Ionicons name="help-circle-outline" size={18} color={colors.textSecondary} />
                          </View>
                          <Text style={[styles.matchScoreModalItem, { color: colors.textSecondary }]}>{String(msg).replace(/\n/g, ' ')}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </ScrollView>
                <TouchableOpacity
                  style={[styles.matchScoreModalCloseBtn, { backgroundColor: hex }]}
                  onPress={() => setShowMatchScoreModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.matchScoreModalCloseText}>Fechar</Text>
                </TouchableOpacity>
                </Pressable>
              </Pressable>
            </View>
          </Modal>
        );
      })() : null;

  return (
    <>
    <ScreenContainer scroll>
      <PetPhotoGallery photos={photos} onPhotoPress={setFullScreenPhoto} verified={pet.verified} />
      <Modal
        visible={!!fullScreenPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setFullScreenPhoto(null)}
      >
        <Pressable style={styles.fullScreenOverlay} onPress={() => setFullScreenPhoto(null)}>
          {fullScreenPhoto ? (
            <Image source={{ uri: fullScreenPhoto }} style={styles.fullScreenImage} contentFit="contain" />
          ) : null}
        </Pressable>
      </Modal>

      <Text style={[styles.name, { color: colors.textPrimary }]}>{pet.name}</Text>
      <Text style={[styles.meta, { color: colors.textSecondary }]}>
        {getSpeciesLabel(pet.species)}
        {pet.breed ? ` • ${pet.breed}` : ''} • {pet.age} ano(s) • {getSizeLabel(pet.size) || '—'} •{' '}
        {pet.sex === 'male' ? 'Macho' : pet.sex === 'female' ? 'Fêmea' : getSexLabel(pet.sex) || '—'}
      </Text>
      <View style={styles.badges}>
        {pet.verified && (
          <VerifiedBadge variant="pet" size={14} iconBackgroundColor={colors.primary} />
        )}
        <StatusBadge
          label={pet.vaccinated ? 'Vacinado' : 'Não vacinado'}
          variant={pet.vaccinated ? 'success' : 'warning'}
        />
        <StatusBadge
          label={pet.neutered ? 'Castrado' : 'Não castrado'}
          variant="neutral"
        />
        {pet.distanceKm != null && (
          <StatusBadge label={`${pet.distanceKm.toFixed(1)} km`} variant="neutral" />
        )}
        {userId && matchScoreData && matchScoreData.score != null && (
          <TouchableOpacity
            onPress={() => setShowMatchScoreModal(true)}
            activeOpacity={0.8}
            style={styles.matchBadgeTouchable}
            accessibilityLabel={`Match ${matchScoreData.score}% com você. Toque para ver detalhes.`}
            accessibilityRole="button"
          >
            <MatchScoreBadge data={matchScoreData} contextLabel="com você" />
            <Ionicons name="chevron-down" size={14} color="#fff" style={styles.matchBadgeChevron} />
          </TouchableOpacity>
        )}
      </View>
      {userId && (matchScoreData != null || completionPercent != null) && (
        <View style={styles.matchProfileCompleteRow}>
          <Text style={[styles.matchProfileCompleteText, { color: colors.textSecondary }]}>
            Seu perfil está {completionPercent ?? 0}% completo para o match.
          </Text>
          <TouchableOpacity onPress={() => router.push('/profile-edit')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.matchProfileEditLink, { color: colors.primary }]}>Editar perfil</Text>
          </TouchableOpacity>
        </View>
      )}
      {(pet as { city?: string | null }).city && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 }}>
          <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.viewCountText, { color: colors.textSecondary, marginTop: 0 }]}>
            {(pet as { city?: string | null }).city}
            {pet.distanceKm != null && ` • ${pet.distanceKm.toFixed(1)} km de você`}
          </Text>
        </View>
      )}
      {pet.viewCountLast24h != null && pet.viewCountLast24h >= 1 && (
        <Text style={[styles.viewCountText, { color: colors.textSecondary }]}>
          {pet.viewCountLast24h} {pet.viewCountLast24h === 1 ? 'pessoa viu' : 'pessoas viram'} nas últimas 24h
        </Text>
      )}
      {(pet.verified || pet.owner?.verified) && (
        <View style={[styles.verifiedDisclaimer, { backgroundColor: colors.surface, borderColor: colors.textSecondary + '40' }]}>
          <Text style={[styles.verifiedDisclaimerText, { color: colors.textSecondary }]}>
            O selo indica que este perfil/anúncio passou por análise da equipe Adopet. O Adopet não garante autenticidade nem substitui o encontro responsável com o tutor.
          </Text>
        </View>
      )}
      {(pet.partner || (pet as { partners?: Array<{ id: string; name: string; logoUrl?: string }> }).partners?.length) && (
        <TouchableOpacity
          style={[styles.partnerBanner, { backgroundColor: '#f9731618', borderColor: '#f9731650' }]}
          onPress={() => {
            const p = pet.partner ?? (pet as { partners?: Array<{ id: string; name: string }> }).partners?.[0];
            if (!p) return;
            const q = new URLSearchParams();
            q.set('fromPet', id!);
            if (from === 'map') q.set('from', 'map');
            router.push(`/partners/${p.id}?${q.toString()}`);
          }}
          activeOpacity={0.8}
        >
          {(() => {
            const partnerData = pet.partner ?? (pet as { partners?: Array<{ logoUrl?: string; isPaidPartner?: boolean }> }).partners?.[0];
            const logoUrl = partnerData?.logoUrl;
            if (logoUrl) {
              return (
                <View style={styles.partnerBannerLogoWrap}>
                  <Image source={{ uri: logoUrl }} style={styles.partnerBannerLogo} contentFit="contain" />
                </View>
              );
            }
            return <Ionicons name={(pet.partner as { isPaidPartner?: boolean })?.isPaidPartner ? 'star' : 'heart'} size={18} color="#ea580c" />;
          })()}
          <View style={styles.partnerBannerTextWrap}>
            <Text style={[styles.partnerBannerLabel, { color: colors.textSecondary }]}>Anúncio em parceria</Text>
            <Text style={[styles.partnerBannerText, { color: colors.textPrimary }]}>
              {(pet as { partners?: Array<{ name: string }> }).partners?.length
                ? `Em parceria com ${(pet as { partners: Array<{ name: string }> }).partners.map((x) => x.name).join(', ')}`
                : `${pet.partner!.name}${(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? ' • Destaque' : ''}`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
      {pet.status === 'ADOPTED' && (
        <View style={[styles.adoptedBanner, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
          <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
          <Text style={[styles.adoptedBannerText, { color: colors.textPrimary }]}>
            Este pet já foi adotado e não está mais disponível no feed.
          </Text>
        </View>
      )}
      {isOwner && petVerificationFeedback && (
        <Text style={[styles.verificationFeedback, { color: colors.textSecondary }]}>
          {petVerificationFeedback}
        </Text>
      )}
      {canRequestPetVerification && (
        <View style={styles.verificationCta}>
          <SecondaryButton
            title="Solicitar verificação deste pet"
            onPress={() => {
              if (!profileComplete) {
                Alert.alert(
                  'Complete seu perfil',
                  'Para solicitar verificação é preciso ter foto e telefone no perfil. Você será levado à página de edição para completar. Depois, volte aqui e solicite a verificação.',
                  [{ text: 'Completar perfil', onPress: () => router.push('/profile-edit') }],
                );
                return;
              }
              const q = new URLSearchParams({ type: 'PET_VERIFIED', petId: id ?? '' });
              if (pet?.name) q.set('petName', pet.name);
              router.push(`/verification-request?${q.toString()}`);
            }}
          />
        </View>
      )}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.sectionTitleRow}
          onPress={() => { configureExpandAnimation(); setSobreExpanded((e) => !e); }}
          activeOpacity={0.7}
        >
          <Ionicons name="document-text-outline" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0, flex: 1 }]}>Sobre</Text>
          <Ionicons name={sobreExpanded ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        {sobreExpanded && (
          <Text style={[styles.description, { color: colors.textSecondary }]}>{pet.description}</Text>
        )}
      </View>

      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.sectionTitleRow}
          onPress={() => { configureExpandAnimation(); setAlimentacaoExpanded((e) => !e); }}
          activeOpacity={0.7}
        >
          <Ionicons name="nutrition-outline" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0, flex: 1 }]}>Alimentação</Text>
          <Ionicons name={alimentacaoExpanded ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        {alimentacaoExpanded && (
          <>
        {pet.feedingType ? (
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {FEEDING_LABEL[pet.feedingType] ?? pet.feedingType}
          </Text>
        ) : null}
        {pet.feedingNotes ? (
          <Text style={[styles.description, { color: colors.textSecondary, marginTop: pet.feedingType ? spacing.sm : 0 }]}>
            {pet.feedingNotes}
          </Text>
        ) : null}
        {!pet.feedingType && !pet.feedingNotes && (
          <Text style={[styles.description, { color: colors.textSecondary, fontStyle: 'italic' }]}>Não informado</Text>
        )}
          </>
        )}
      </View>

      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.sectionTitleRow}
          onPress={() => { configureExpandAnimation(); setPorQueDoandoExpanded((e) => !e); }}
          activeOpacity={0.7}
        >
          <Ionicons name="heart-outline" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0, flex: 1 }]}>Por que está doando?</Text>
          <Ionicons name={porQueDoandoExpanded ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        {porQueDoandoExpanded && (
          pet.adoptionReason ? (
            <Text style={[styles.description, { color: colors.textSecondary }]}>{pet.adoptionReason}</Text>
          ) : (
            <Text style={[styles.description, { color: colors.textSecondary, fontStyle: 'italic' }]}>Não informado</Text>
          )
        )}
      </View>

      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.sectionTitleRow}
          onPress={() => { configureExpandAnimation(); setComportamentoSaudeExpanded((e) => !e); }}
          activeOpacity={0.7}
        >
          <Ionicons name="paw-outline" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0, flex: 1 }]}>Comportamento e saúde</Text>
          <Ionicons name={comportamentoSaudeExpanded ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        {comportamentoSaudeExpanded && (
        <>
        <View style={styles.triageGrid}>
          <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Energia</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{pet.energyLevel ? (ENERGY_LABEL[pet.energyLevel] ?? pet.energyLevel) : 'Não informado'}</Text>
          </View>
          <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Temperamento</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{pet.temperament ? (TEMPERAMENT_LABEL[pet.temperament] ?? pet.temperament) : 'Não informado'}</Text>
          </View>
          <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Dócil</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{pet.isDocile === true ? 'Sim' : pet.isDocile === false ? 'Não' : 'Não informado'}</Text>
          </View>
          <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Adestrado</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{pet.isTrained === true ? 'Sim' : pet.isTrained === false ? 'Não' : 'Não informado'}</Text>
          </View>
          <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Necessidades especiais</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{pet.hasSpecialNeeds === true ? 'Sim' : pet.hasSpecialNeeds === false ? 'Não' : 'Não informado'}</Text>
          </View>
        </View>
        <View style={[styles.goodWithBlock, { borderTopColor: colors.border ?? colors.textSecondary + '25' }]}>
          <Text style={[styles.triageItemLabel, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Se dá bem com</Text>
          <View style={styles.goodWithRow}>
            <View style={[styles.goodWithChip, { backgroundColor: colors.background }]}>
              <Text style={[styles.goodWithChipText, { color: colors.textPrimary }]}>Crianças: {pet.goodWithChildren ? (GOOD_WITH_LABEL[pet.goodWithChildren] ?? pet.goodWithChildren) : 'Não informado'}</Text>
            </View>
            <View style={[styles.goodWithChip, { backgroundColor: colors.background }]}>
              <Text style={[styles.goodWithChipText, { color: colors.textPrimary }]}>Cachorros: {pet.goodWithDogs ? (GOOD_WITH_LABEL[pet.goodWithDogs] ?? pet.goodWithDogs) : 'Não informado'}</Text>
            </View>
            <View style={[styles.goodWithChip, { backgroundColor: colors.background }]}>
              <Text style={[styles.goodWithChipText, { color: colors.textPrimary }]}>Gatos: {pet.goodWithCats ? (GOOD_WITH_LABEL[pet.goodWithCats] ?? pet.goodWithCats) : 'Não informado'}</Text>
            </View>
          </View>
        </View>
        <View style={[styles.healthNotesBlock, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
          <Text style={[styles.triageItemLabel, { color: colors.textSecondary, marginBottom: 4 }]}>Observações de saúde</Text>
          <Text style={[styles.description, { color: colors.textPrimary }]}>{pet.healthNotes || 'Nenhuma'}</Text>
        </View>
        {pet.hasOngoingCosts != null && (
          <View style={[styles.triageItem, { backgroundColor: colors.background, marginTop: spacing.sm }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Gastos contínuos (medicação, ração especial)</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{pet.hasOngoingCosts ? 'Sim' : 'Não'}</Text>
          </View>
        )}
        </>
        )}
      </View>

      {(pet.preferredTutorHousingType || pet.preferredTutorHasYard || pet.preferredTutorHasOtherPets || pet.preferredTutorHasChildren || pet.preferredTutorTimeAtHome || pet.preferredTutorPetsAllowedAtHome || pet.preferredTutorDogExperience || pet.preferredTutorCatExperience || pet.preferredTutorHouseholdAgrees || pet.preferredTutorWalkFrequency) ? (
        <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.sectionTitleRow}
            onPress={() => { configureExpandAnimation(); setPreferenciasTutorExpanded((e) => !e); }}
            activeOpacity={0.7}
          >
            <Ionicons name="people-outline" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0, flex: 1 }]}>Preferências de tutor (compatibilidade)</Text>
            <Ionicons name={preferenciasTutorExpanded ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          {preferenciasTutorExpanded && (
          <>
          <Text style={[styles.description, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
            Critérios usados no cálculo de match com adotantes.
          </Text>
          <View style={styles.triageGrid}>
            {pet.preferredTutorHousingType ? (
              <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Prefere tutor em</Text>
                <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{HOUSING_LABEL[pet.preferredTutorHousingType] ?? pet.preferredTutorHousingType}</Text>
              </View>
            ) : null}
            {pet.preferredTutorHasYard ? (
              <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Prefere tutor com quintal?</Text>
                <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{SIM_NAO_INDIFERENTE_LABEL[pet.preferredTutorHasYard] ?? pet.preferredTutorHasYard}</Text>
              </View>
            ) : null}
            {pet.preferredTutorHasOtherPets ? (
              <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Prefere tutor com outros pets?</Text>
                <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{SIM_NAO_INDIFERENTE_LABEL[pet.preferredTutorHasOtherPets] ?? pet.preferredTutorHasOtherPets}</Text>
              </View>
            ) : null}
            {pet.preferredTutorHasChildren ? (
              <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Prefere tutor com crianças?</Text>
                <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{SIM_NAO_INDIFERENTE_LABEL[pet.preferredTutorHasChildren] ?? pet.preferredTutorHasChildren}</Text>
              </View>
            ) : null}
            {pet.preferredTutorTimeAtHome ? (
              <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Tempo em casa do tutor</Text>
                <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{TIME_AT_HOME_LABEL[pet.preferredTutorTimeAtHome] ?? pet.preferredTutorTimeAtHome}</Text>
              </View>
            ) : null}
            {pet.preferredTutorWalkFrequency ? (
              <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Prefere tutor que passeie</Text>
                <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{WALK_FREQ_LABEL[pet.preferredTutorWalkFrequency] ?? pet.preferredTutorWalkFrequency}</Text>
              </View>
            ) : null}
            {pet.preferredTutorPetsAllowedAtHome ? (
              <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Pets permitidos no local</Text>
                <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{PETS_ALLOWED_LABEL[pet.preferredTutorPetsAllowedAtHome] ?? pet.preferredTutorPetsAllowedAtHome}</Text>
              </View>
            ) : null}
            {pet.preferredTutorDogExperience ? (
              <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Experiência com cachorro</Text>
                <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{EXPERIENCE_LABEL[pet.preferredTutorDogExperience] ?? pet.preferredTutorDogExperience}</Text>
              </View>
            ) : null}
            {pet.preferredTutorCatExperience ? (
              <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Experiência com gato</Text>
                <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{EXPERIENCE_LABEL[pet.preferredTutorCatExperience] ?? pet.preferredTutorCatExperience}</Text>
              </View>
            ) : null}
            {pet.preferredTutorHouseholdAgrees ? (
              <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Concordância em casa</Text>
                <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{HOUSEHOLD_AGREES_LABEL[pet.preferredTutorHouseholdAgrees] ?? pet.preferredTutorHouseholdAgrees}</Text>
              </View>
            ) : null}
          </View>
          </>
          )}
        </View>
      ) : null}

      {similarPets.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: spacing.lg }]}>
            Pets similares
          </Text>
          <FlatList
            data={similarPets}
            horizontal
            keyExtractor={(item) => item.pet.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.similarList}
            renderItem={({ item }) => {
              const similar = item.pet;
              const photo = similar.photos?.[0];
              return (
                <TouchableOpacity
                  style={[styles.similarCard, { backgroundColor: colors.surface }]}
                  onPress={() => router.push(`/pet/${similar.id}`)}
                  activeOpacity={0.8}
                >
                  <View style={styles.similarThumbWrap}>
                    <Image
                      source={{ uri: photo ?? 'https://picsum.photos/seed/pet/200/200' }}
                      style={styles.similarThumb}
                    />
                    {userId && typeof item.matchScore === 'number' && (
                      <View
                        style={[
                          styles.similarScoreBadge,
                          { backgroundColor: getMatchScoreColor(item.matchScore) + 'e6' },
                        ]}
                      >
                        <Text style={styles.similarScoreText}>{item.matchScore}%</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.similarName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {similar.name}
                  </Text>
                  <Text style={[styles.similarMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                    {getSpeciesLabel(similar.species)}
                    {similar.breed ? ` • ${similar.breed}` : ''} • {similar.age} ano(s)
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </>
      )}

      {pet.owner && (
        <>
          {isOwner ? (
            <>
              <View style={[styles.ownerCard, { backgroundColor: colors.surface }]}>
                <View style={styles.ownerRow}>
                  {pet.owner.avatarUrl ? (
                    <TouchableOpacity onPress={() => setFullScreenPhoto(pet.owner!.avatarUrl!)} activeOpacity={0.9} accessibilityLabel="Ver foto do tutor em tamanho real">
                      <Image source={{ uri: pet.owner.avatarUrl }} style={styles.ownerAvatar} />
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.ownerAvatarPlaceholder, { backgroundColor: colors.background }]}>
                      <Text style={[styles.ownerAvatarText, { color: colors.textSecondary }]}>
                        {(pet.owner?.name ?? '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.ownerInfo}>
                    <Text style={[styles.ownerLabel, { color: colors.textSecondary }]}>Tutor anunciante</Text>
                    <Text style={[styles.ownerName, { color: colors.textPrimary }]}>Você</Text>
                    {(pet.owner.verified || pet.owner.tutorStats) && (
                      <View style={styles.ownerBadgesRow}>
                        {pet.owner.verified && <VerifiedBadge variant="user" size={20} showLabel backgroundColor={colors.primary} />}
                        {pet.owner.tutorStats && <TutorLevelBadge tutorStats={pet.owner.tutorStats} compact />}
                      </View>
                    )}
                    <Text style={[styles.ownerPets, { color: colors.textSecondary }]}>
                      {(pet.owner?.petsCount ?? 0)} pet(s) anunciados
                    </Text>
                  </View>
                </View>
              </View>
              {pet.status !== 'ADOPTED' && (
                <TouchableOpacity
                  style={[styles.priorityCard, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}
                  onPress={() => router.push({ pathname: '/pet-priority/[id]', params: { id: id! } })}
                  activeOpacity={0.8}
                >
                  <Ionicons name="people" size={24} color={colors.primary} />
                  <View style={styles.priorityCardText}>
                    <Text style={[styles.priorityCardTitle, { color: colors.textPrimary }]}>Ver interessados</Text>
                    <Text style={[styles.priorityCardSub, { color: colors.textSecondary }]}>
                      Quem favoritou e quem priorizar (match e perfil)
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <TouchableOpacity
              style={[styles.ownerCard, { backgroundColor: colors.surface }]}
              onPress={() => setTutorModalVisible(true)}
              activeOpacity={0.8}
            >
              <View style={styles.ownerRow}>
                {pet.owner.avatarUrl ? (
                  <TouchableOpacity onPress={() => setFullScreenPhoto(pet.owner!.avatarUrl!)} activeOpacity={0.9} accessibilityLabel="Ver foto do tutor em tamanho real">
                    <Image source={{ uri: pet.owner.avatarUrl }} style={styles.ownerAvatar} />
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.ownerAvatarPlaceholder, { backgroundColor: colors.background }]}>
                    <Text style={[styles.ownerAvatarText, { color: colors.textSecondary }]}>
                      {(pet.owner?.name ?? '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.ownerInfo}>
                  <Text style={[styles.ownerLabel, { color: colors.textSecondary }]}>Tutor anunciante</Text>
                  <Text style={[styles.ownerName, { color: colors.textPrimary }]}>{pet.owner?.name ?? 'Tutor'}</Text>
                  {(pet.owner.verified || pet.owner.tutorStats) && (
                    <View style={styles.ownerBadgesRow}>
                      {pet.owner.verified && <VerifiedBadge variant="user" size={20} showLabel backgroundColor={colors.primary} />}
                      {pet.owner.tutorStats && <TutorLevelBadge tutorStats={pet.owner.tutorStats} compact />}
                    </View>
                  )}
                  <Text style={[styles.ownerPets, { color: colors.textSecondary }]}>
                    {(pet.owner?.petsCount ?? 0)} pet(s) anunciados
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          )}
          <Modal
            visible={tutorModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setTutorModalVisible(false)}
          >
            <Pressable style={styles.modalOverlay} onPress={() => setTutorModalVisible(false)}>
              <Pressable style={[styles.modalCard, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Perfil do tutor</Text>
                {pet.owner.avatarUrl ? (
                  <TouchableOpacity onPress={() => setFullScreenPhoto(pet.owner!.avatarUrl!)} activeOpacity={0.9} accessibilityLabel="Ver foto do tutor em tamanho real">
                    <Image source={{ uri: pet.owner.avatarUrl }} style={styles.modalAvatar} />
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.modalAvatarPlaceholder, { backgroundColor: colors.background }]}>
                    <Text style={[styles.modalAvatarText, { color: colors.textSecondary }]}>
                      {(pet.owner?.name ?? '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={[styles.modalName, { color: colors.textPrimary }]}>{pet.owner?.name ?? 'Tutor'}</Text>
                {(pet.owner.verified || pet.owner.tutorStats) && (
                  <View style={styles.modalBadgesRow}>
                    {pet.owner.verified && <VerifiedBadge variant="user" size={20} showLabel backgroundColor={colors.primary} />}
                    {pet.owner.tutorStats && <TutorLevelBadge tutorStats={pet.owner.tutorStats} compact />}
                  </View>
                )}
                <Text style={[styles.modalPets, { color: colors.textSecondary }]}>
                  {pet.owner?.petsCount ?? 0} pet(s) anunciados
                </Text>
                {(pet.owner?.city ?? pet.owner?.bio ?? pet.owner?.housingType ?? pet.owner?.petsAllowedAtHome ?? pet.owner?.dogExperience ?? pet.owner?.catExperience ?? pet.owner?.householdAgreesToAdoption ?? pet.owner?.whyAdopt) && (
                  <View style={[styles.modalTriageSection, { borderTopColor: colors.textSecondary + '30' }]}>
                    <Text style={[styles.modalTriageTitle, { color: colors.textSecondary }]}>Informações para triagem</Text>
                    <View style={styles.modalTriageList}>
                      {pet.owner?.city ? (
                        <View style={styles.modalTriageRow}>
                          <Text style={[styles.modalTriageLabel, { color: colors.textSecondary }]}>Cidade</Text>
                          <Text style={[styles.modalTriageValue, { color: colors.textPrimary }]}>{pet.owner.city}</Text>
                        </View>
                      ) : null}
                      {pet.owner?.bio ? (
                        <View style={styles.modalTriageRow}>
                          <Text style={[styles.modalTriageLabel, { color: colors.textSecondary }]}>Sobre</Text>
                          <Text style={[styles.modalTriageValue, { color: colors.textPrimary }]}>{pet.owner.bio}</Text>
                        </View>
                      ) : null}
                      {pet.owner?.housingType ? (
                        <View style={styles.modalTriageRow}>
                          <Text style={[styles.modalTriageLabel, { color: colors.textSecondary }]}>Moradia</Text>
                          <Text style={[styles.modalTriageValue, { color: colors.textPrimary }]}>{HOUSING_LABEL[pet.owner.housingType] ?? pet.owner.housingType}</Text>
                        </View>
                      ) : null}
                      {pet.owner?.hasYard === true ? (
                        <View style={styles.modalTriageRow}>
                          <Text style={[styles.modalTriageLabel, { color: colors.textSecondary }]}>Quintal</Text>
                          <Text style={[styles.modalTriageValue, { color: colors.textPrimary }]}>Sim</Text>
                        </View>
                      ) : pet.owner?.hasYard === false ? (
                        <View style={styles.modalTriageRow}>
                          <Text style={[styles.modalTriageLabel, { color: colors.textSecondary }]}>Quintal</Text>
                          <Text style={[styles.modalTriageValue, { color: colors.textPrimary }]}>Não</Text>
                        </View>
                      ) : null}
                      {pet.owner?.hasOtherPets === true ? (
                        <View style={styles.modalTriageRow}>
                          <Text style={[styles.modalTriageLabel, { color: colors.textSecondary }]}>Outros pets</Text>
                          <Text style={[styles.modalTriageValue, { color: colors.textPrimary }]}>Sim</Text>
                        </View>
                      ) : null}
                      {pet.owner?.hasChildren === true ? (
                        <View style={styles.modalTriageRow}>
                          <Text style={[styles.modalTriageLabel, { color: colors.textSecondary }]}>Crianças em casa</Text>
                          <Text style={[styles.modalTriageValue, { color: colors.textPrimary }]}>Sim</Text>
                        </View>
                      ) : null}
                      {pet.owner?.timeAtHome ? (
                        <View style={styles.modalTriageRow}>
                          <Text style={[styles.modalTriageLabel, { color: colors.textSecondary }]}>Tempo em casa</Text>
                          <Text style={[styles.modalTriageValue, { color: colors.textPrimary }]}>{TIME_AT_HOME_LABEL[pet.owner.timeAtHome] ?? pet.owner.timeAtHome}</Text>
                        </View>
                      ) : null}
                      {pet.owner?.petsAllowedAtHome ? (
                        <View style={styles.modalTriageRow}>
                          <Text style={[styles.modalTriageLabel, { color: colors.textSecondary }]}>Pets permitidos no local</Text>
                          <Text style={[styles.modalTriageValue, { color: colors.textPrimary }]}>{PETS_ALLOWED_LABEL[pet.owner.petsAllowedAtHome] ?? pet.owner.petsAllowedAtHome}</Text>
                        </View>
                      ) : null}
                      {pet.owner?.dogExperience ? (
                        <View style={styles.modalTriageRow}>
                          <Text style={[styles.modalTriageLabel, { color: colors.textSecondary }]}>Experiência com cachorro</Text>
                          <Text style={[styles.modalTriageValue, { color: colors.textPrimary }]}>{EXPERIENCE_LABEL[pet.owner.dogExperience] ?? pet.owner.dogExperience}</Text>
                        </View>
                      ) : null}
                      {pet.owner?.catExperience ? (
                        <View style={styles.modalTriageRow}>
                          <Text style={[styles.modalTriageLabel, { color: colors.textSecondary }]}>Experiência com gato</Text>
                          <Text style={[styles.modalTriageValue, { color: colors.textPrimary }]}>{EXPERIENCE_LABEL[pet.owner.catExperience] ?? pet.owner.catExperience}</Text>
                        </View>
                      ) : null}
                      {pet.owner?.householdAgreesToAdoption ? (
                        <View style={styles.modalTriageRow}>
                          <Text style={[styles.modalTriageLabel, { color: colors.textSecondary }]}>Concordância em casa</Text>
                          <Text style={[styles.modalTriageValue, { color: colors.textPrimary }]}>{HOUSEHOLD_AGREES_LABEL[pet.owner.householdAgreesToAdoption] ?? pet.owner.householdAgreesToAdoption}</Text>
                        </View>
                      ) : null}
                      {pet.owner?.whyAdopt ? (
                        <View style={styles.modalTriageRow}>
                          <Text style={[styles.modalTriageLabel, { color: colors.textSecondary }]}>Por que quer adotar</Text>
                          <Text style={[styles.modalTriageValue, { color: colors.textPrimary }]}>{pet.owner.whyAdopt}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                )}
                <View style={styles.modalActions}>
                  <SecondaryButton
                    title="Ver perfil completo"
                    onPress={() => {
                      setTutorModalVisible(false);
                      router.push({ pathname: '/tutor-profile', params: { petId: id! } });
                    }}
                  />
                  <SecondaryButton title="Fechar" onPress={() => setTutorModalVisible(false)} />
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        </>
      )}

      <View style={styles.cta}>
        {isPendingPublication ? (
          isAdmin ? (
            <>
              <Text style={[styles.pendingPublicationHint, { color: colors.textSecondary }]}>
                Anúncio aguardando aprovação. Aprove ou reprove para publicar no feed.
              </Text>
              <View style={styles.pendingPublicationActions}>
                <PrimaryButton
                  title={setPublicationMutation.isPending ? 'Aprovando...' : 'Aprovar anúncio'}
                  onPress={() => setPublicationMutation.mutate('APPROVED')}
                  disabled={setPublicationMutation.isPending}
                  style={styles.pendingPublicationBtn}
                />
                <SecondaryButton
                  title={setPublicationMutation.isPending ? 'Reprovando...' : 'Reprovar anúncio'}
                  onPress={() => {
                    Alert.alert(
                      'Reprovar anúncio',
                      'O tutor será notificado. Deseja reprovar este anúncio?',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Reprovar', style: 'destructive', onPress: () => setPublicationMutation.mutate('REJECTED') },
                      ]
                    );
                  }}
                  disabled={setPublicationMutation.isPending}
                  style={[styles.pendingPublicationBtn, { borderColor: colors.error || '#DC2626' }]}
                />
              </View>
            </>
          ) : (
            <View style={[styles.pendingPublicationInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="time-outline" size={24} color={colors.textSecondary} />
              <Text style={[styles.pendingPublicationInfoText, { color: colors.textSecondary }]}>
                Este anúncio está em análise e ainda não foi publicado.
              </Text>
            </View>
          )
        ) : isOngAdminOfPet ? (
          <>
            <PrimaryButton
              title={approveOngMutation.isPending ? 'Aprovando...' : `Aprovar anúncio de ${pet.owner?.name ?? 'membro'}`}
              onPress={() => approveOngMutation.mutate()}
              disabled={approveOngMutation.isPending}
            />
            <SecondaryButton
              title={rejectOngMutation.isPending ? 'Rejeitando...' : 'Rejeitar anúncio'}
              onPress={() => {
                setRejectOngReason('');
                setShowRejectOngModal(true);
              }}
              disabled={rejectOngMutation.isPending}
              style={[styles.pendingPublicationBtn, { borderColor: colors.error || '#DC2626' }]}
            />
          </>
        ) : isPendingOngApproval ? (
          <View style={[styles.pendingPublicationInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="time-outline" size={24} color={colors.textSecondary} />
            <Text style={[styles.pendingPublicationInfoText, { color: colors.textSecondary }]}>
              Este anúncio está aguardando aprovação da ONG e ainda não foi publicado.
            </Text>
          </View>
        ) : pet.status === 'ADOPTED' ? (
          <TouchableOpacity
            style={[styles.adoptedCta, { backgroundColor: '#d97706' }]}
            onPress={() => router.push('/(tabs)/feed')}
            activeOpacity={0.85}
          >
            <Ionicons name="paw" size={22} color="#fff" style={styles.adoptedCtaIcon} />
            <Text style={styles.adoptedCtaText}>Ver mais pets no feed</Text>
          </TouchableOpacity>
        ) : isOwner ? (
          <PrimaryButton
            title="Editar anúncio"
            onPress={() => router.push(`/pet-edit/${id}`)}
          />
        ) : isGuest ? (
          <>
            <PrimaryButton
              title="Adicionar aos favoritos"
              onPress={() => router.replace(`/(auth)/welcome?redirectPetId=${encodeURIComponent(id!)}`)}
            />
            <SecondaryButton
              title="Entrar"
              onPress={() => router.replace(`/(auth)/welcome?redirectPetId=${encodeURIComponent(id!)}`)}
            />
            <SecondaryButton
              title="Criar conta"
              onPress={() => router.replace(`/(auth)/welcome?redirectPetId=${encodeURIComponent(id!)}`)}
            />
          </>
                ) : isFavorited ? (
          <>
            <CtaPulse>
              <PrimaryButton
                title="Quero adotar / Chat"
                onPress={handleConversar}
                loading={conversarLoading}
                disabled={conversarLoading}
              />
            </CtaPulse>
            <SecondaryButton
              title={removeFavMutation.isPending ? 'Removendo...' : 'Remover dos favoritos'}
              onPress={() => removeFavMutation.mutate()}
              disabled={removeFavMutation.isPending}
            />
          </>
        ) : (
          <PrimaryButton
            title={addFavMutation.isPending ? 'Adicionando...' : 'Adicionar aos favoritos'}
            onPress={() => addFavMutation.mutate()}
            disabled={addFavMutation.isPending}
          />
        )}
        {!isPendingPublication && !isPendingOngApproval && pet.status !== 'ADOPTED' && (
          <>
            <TouchableOpacity onPress={handleCompartilhar} style={styles.shareLink}>
              <Ionicons name="share-outline" size={20} color={colors.primary} />
              <Text style={[styles.shareLinkText, { color: colors.primary }]}>Compartilhar anúncio</Text>
            </TouchableOpacity>
            {!isGuest && !isOwner && (
              <TouchableOpacity onPress={handleDenunciar} disabled={reportMutation.isPending} style={styles.reportLink}>
                <Text style={[styles.reportLinkText, { color: colors.textSecondary }]}>
                  {reportMutation.isPending ? 'Enviando...' : 'Denunciar este anúncio'}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      <Modal visible={showCompleteProfileModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowCompleteProfileModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Complete seu perfil</Text>
            <Text style={[styles.completeProfileModalMessage, { color: colors.textSecondary }]}>
              Para conversar com o tutor é preciso ter foto e telefone no perfil. Assim o tutor sabe com quem está falando. Você será levado à página de edição para completar.
            </Text>
            <TouchableOpacity
              onPress={() => setShowCompleteProfileModal(false)}
              activeOpacity={0.8}
              style={styles.completeProfileModalLinkWrap}
            >
              <Text style={[styles.completeProfileModalLink, { color: colors.primary }]}>Completar depois</Text>
            </TouchableOpacity>
            <PrimaryButton
              title="Completar perfil"
              onPress={() => {
                setShowCompleteProfileModal(false);
                router.push('/profile-edit');
              }}
              style={styles.completeProfileModalBtn}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={reportModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setReportModalVisible(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Detalhes da denúncia (opcional)</Text>
            <TextInput
              style={[styles.reportModalInput, { color: colors.textPrimary, borderColor: colors.textSecondary }]}
              placeholder="Descreva o que aconteceu, se quiser"
              placeholderTextColor={colors.textSecondary}
              value={reportDescription}
              onChangeText={setReportDescription}
              multiline
              numberOfLines={3}
              maxLength={2000}
            />
            <View style={styles.modalActions}>
              <SecondaryButton title="Cancelar" onPress={() => setReportModalVisible(false)} />
              <PrimaryButton
                title={reportMutation.isPending ? 'Enviando...' : 'Enviar'}
                onPress={handleEnviarDenuncia}
                disabled={reportMutation.isPending}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showRejectOngModal} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !rejectOngMutation.isPending && setShowRejectOngModal(false)}
        >
          <Pressable style={[styles.modalCard, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Rejeitar anúncio</Text>
            <Text style={[styles.rejectOngModalSubtitle, { color: colors.textSecondary }]}>
              Informe o motivo da rejeição para {pet.owner?.name ?? 'o membro'}. O membro será notificado.
            </Text>
            <TextInput
              style={[styles.reportModalInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
              value={rejectOngReason}
              onChangeText={setRejectOngReason}
              placeholder="Motivo da rejeição (obrigatório)"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
            <View style={styles.modalActions}>
              <SecondaryButton
                title="Cancelar"
                onPress={() => !rejectOngMutation.isPending && setShowRejectOngModal(false)}
              />
              <PrimaryButton
                title={rejectOngMutation.isPending ? 'Rejeitando...' : 'Rejeitar'}
                onPress={() => {
                  const reason = rejectOngReason.trim();
                  if (reason) rejectOngMutation.mutate(reason);
                }}
                disabled={!rejectOngReason.trim() || rejectOngMutation.isPending}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />
    </ScreenContainer>
    {matchScoreModalContent}
    </>
  );
}

const styles = StyleSheet.create({
  imageWrap: {
    height: 280,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: spacing.md,
    position: 'relative',
  },
  galleryList: { height: 280 },
  imageSlide: {
    height: 280,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  galleryVerifiedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
  },
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  meta: {
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  viewCountText: {
    fontSize: 12,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  matchBadgeTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  matchBadgeChevron: {
    marginLeft: 2,
  },
  matchProfileCompleteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  matchProfileCompleteText: {
    fontSize: 13,
  },
  matchProfileEditLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  partnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  partnerBannerLogoWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerBannerLogo: {
    width: 28,
    height: 28,
  },
  partnerBannerTextWrap: { flex: 1, minWidth: 0 },
  partnerBannerLabel: { fontSize: 12, marginBottom: 2 },
  partnerBannerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  adoptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  adoptedBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  verificationFeedback: {
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  verifiedDisclaimer: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
  },
  verifiedDisclaimerText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  verificationCta: {
    marginBottom: spacing.lg,
  },
  errorText: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  errorSub: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  sectionCard: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  triageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  triageItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    minWidth: 100,
  },
  triageItemLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  triageItemValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  goodWithBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  goodWithRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  goodWithChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
  },
  goodWithChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  healthNotesBlock: {
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  ownerCard: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  priorityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  priorityCardText: { flex: 1, marginLeft: spacing.md },
  priorityCardTitle: { fontSize: 16, fontWeight: '600' },
  priorityCardSub: { fontSize: 12, marginTop: 2, opacity: 0.9 },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  ownerAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerAvatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  ownerInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  ownerLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  ownerBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  ownerPets: {
    fontSize: 13,
    marginTop: 2,
  },
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  matchScoreModalOverlayWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
    alignSelf: 'center',
  },
  matchScoreModalCard: {
    maxWidth: 340,
    width: '100%',
    alignItems: 'stretch',
    maxHeight: '85%',
    alignSelf: 'center',
  },
  matchScoreModalHeader: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    marginBottom: spacing.md,
    width: '100%',
  },
  matchScoreModalHeaderInner: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchScoreModalHeaderIcon: {
    marginBottom: spacing.sm,
  },
  matchScoreModalScore: {
    fontSize: 48,
    fontWeight: '700',
  },
  matchScoreModalSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  matchScoreModalScroll: {
    flexGrow: 1,
    flexShrink: 1,
    maxHeight: 320,
    marginBottom: spacing.sm,
    alignSelf: 'stretch',
  },
  matchScoreModalScrollContent: {
    paddingBottom: spacing.sm,
  },
  matchScoreModalSection: {
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    paddingBottom: spacing.sm,
    alignItems: 'flex-start',
    width: '100%',
  },
  matchScoreModalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  matchScoreModalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  matchScoreModalSectionCount: {
    fontSize: 13,
  },
  matchScoreModalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    width: '100%',
  },
  matchScoreModalRowIcon: {
    width: 22,
    marginRight: spacing.sm,
  },
  matchScoreModalItem: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'left',
  },
  matchScoreModalCloseBtn: {
    alignSelf: 'stretch',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  matchScoreModalCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  completeProfileModalMessage: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  completeProfileModalLinkWrap: { marginBottom: spacing.lg },
  completeProfileModalLink: { fontSize: 15, fontWeight: '600', textDecorationLine: 'underline' },
  completeProfileModalBtn: { alignSelf: 'stretch' },
  reportModalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  rejectOngModalSubtitle: {
    fontSize: 14,
    marginBottom: spacing.md,
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: spacing.md,
  },
  modalAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  modalAvatarText: {
    fontSize: 32,
    fontWeight: '700',
  },
  modalName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  modalBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.xs,
  },
  modalPets: {
    fontSize: 14,
    marginBottom: spacing.lg,
  },
  modalTriageSection: {
    width: '100%',
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  modalTriageTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  modalTriageList: {
    width: '100%',
    gap: spacing.sm,
  },
  modalTriageRow: {
    width: '100%',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  modalTriageLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  modalTriageValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalTriageLine: {
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  modalActions: {
    width: '100%',
    gap: spacing.sm,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  cta: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  adoptedCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  adoptedCtaIcon: {
    marginRight: spacing.sm,
  },
  adoptedCtaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  shareLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  shareLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reportLink: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  reportLinkText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  pendingPublicationHint: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  pendingPublicationActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  pendingPublicationBtn: {
    flex: 1,
  },
  pendingPublicationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  pendingPublicationInfoText: {
    flex: 1,
    fontSize: 14,
  },
  similarList: {
    paddingVertical: spacing.sm,
    gap: spacing.md,
    paddingRight: spacing.md,
  },
  similarCard: {
    width: 140,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: spacing.md,
  },
  similarThumbWrap: {
    position: 'relative',
    width: '100%',
  },
  similarThumb: {
    width: '100%',
    height: 120,
    backgroundColor: '#eee',
  },
  similarScoreBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  similarScoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  similarName: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  similarMeta: {
    fontSize: 12,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  loading: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  matchScoreModalCard: {
    maxWidth: 340,
    alignSelf: 'stretch',
  },
  matchScoreModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
});
