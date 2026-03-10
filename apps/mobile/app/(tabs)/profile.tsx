import { useEffect, useCallback, useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Share, Linking, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, PrimaryButton, SecondaryButton, LoadingLogo, PageIntro, VerifiedBadge, TutorLevelBadge } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useClientConfig } from '../../src/hooks/useClientConfig';
import { useAuthStore } from '../../src/stores/authStore';
import { getMe, getTutorStats, getPendingAdoptionConfirmations, getPreferences, getMyNotificationsUnreadCount, deactivateAccount, exportMyData } from '../../src/api/me';
import { getAdminStats } from '../../src/api/admin';
import { getVerificationStatus } from '../../src/api/verification';
import { presign, confirmAvatarUpload } from '../../src/api/uploads';
import { getFriendlyErrorMessage } from '../../src/utils/errorMessage';
import { configureExpandAnimation } from '../../src/utils/layoutAnimation';
import { spacing } from '../../src/theme';

/** URL para doação/apoio ao app (pode usar deep link de volta ao app no futuro). */
const DONATION_URL = 'https://appadopet.com.br/#apoie';

const APP_VERSION = Constants.expoConfig?.version ?? '1.1.1';

const HOUSING_LABEL: Record<string, string> = { CASA: 'Casa', APARTAMENTO: 'Apartamento' };
const TIME_AT_HOME_LABEL: Record<string, string> = { MOST_DAY: 'Maior parte do dia', HALF_DAY: 'Metade do dia', LITTLE: 'Pouco tempo' };
const PETS_ALLOWED_LABEL: Record<string, string> = { YES: 'Sim', NO: 'Não', UNSURE: 'Não sei' };
const EXPERIENCE_LABEL: Record<string, string> = { NEVER: 'Nunca tive', HAD_BEFORE: 'Já tive', HAVE_NOW: 'Tenho atualmente' };
const HOUSEHOLD_AGREES_LABEL: Record<string, string> = { YES: 'Sim, todos concordam', DISCUSSING: 'Ainda conversando' };
const ACTIVITY_LEVEL_LABEL: Record<string, string> = { LOW: 'Calmo', MEDIUM: 'Moderado', HIGH: 'Ativo' };
const PREFERRED_PET_AGE_LABEL: Record<string, string> = { PUPPY: 'Filhote', ADULT: 'Adulto', SENIOR: 'Idoso', ANY: 'Qualquer' };
const COMMITS_TO_VET_CARE_LABEL: Record<string, string> = { YES: 'Sim', NO: 'Não' };
const WALK_FREQUENCY_LABEL: Record<string, string> = { DAILY: 'Diariamente', FEW_TIMES_WEEK: 'Algumas vezes por semana', RARELY: 'Raramente', NOT_APPLICABLE: 'Não se aplica' };
const MONTHLY_BUDGET_LABEL: Record<string, string> = { LOW: 'Até ~R$ 100/mês', MEDIUM: '~R$ 100–300/mês', HIGH: 'Acima de ~R$ 300/mês' };
const SPECIES_LABEL: Record<string, string> = { DOG: 'Cachorro', CAT: 'Gato', BOTH: 'Ambos' };
const SIZE_PREF_LABEL: Record<string, string> = { small: 'Pequeno', medium: 'Médio', large: 'Grande', xlarge: 'Muito grande', both: 'Qualquer' };
const SEX_PREF_LABEL: Record<string, string> = { male: 'Macho', female: 'Fêmea', both: 'Qualquer' };

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { config: clientConfig } = useClientConfig();
  const userId = useAuthStore((s) => s.user?.id);
  const logout = useAuthStore((s) => s.logout);
  const setShowLogoutToast = useAuthStore((s) => s.setShowLogoutToast);
  const setUser = useAuthStore((s) => s.setUser);

  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        const t = setTimeout(() => router.replace('/(auth)/welcome'), 0);
        return () => clearTimeout(t);
      }
    }, [userId, router]),
  );

  const queryClient = useQueryClient();
  const { data: user, isLoading, refetch: refetchMe } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    staleTime: 60_000,
  });
  useEffect(() => {
    if (user) setUser(user);
  }, [user, setUser]);
  const profileComplete = !!(user?.avatarUrl && user?.phone);
  const showCompleteProfileBanner = !profileComplete && !!user;

  const hapticThen = useCallback((fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  }, []);

  const avatarRingOpacity = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    if (!showCompleteProfileBanner) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(avatarRingOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(avatarRingOpacity, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [showCompleteProfileBanner, avatarRingOpacity]);

  const [menuContaExpanded, setMenuContaExpanded] = useState(false);
  const [menuAdocaoExpanded, setMenuAdocaoExpanded] = useState(false);
  const [menuParceiroExpanded, setMenuParceiroExpanded] = useState(false);
  const [menuSuporteExpanded, setMenuSuporteExpanded] = useState(false);
  const [menuLegalExpanded, setMenuLegalExpanded] = useState(false);
  const [menuApoioExpanded, setMenuApoioExpanded] = useState(false);
  const [menuAdminExpanded, setMenuAdminExpanded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetchMe();
    }, [refetchMe]),
  );

  useFocusEffect(
    useCallback(() => {
      setMenuContaExpanded(false);
      setMenuAdocaoExpanded(false);
      setMenuParceiroExpanded(false);
      setMenuSuporteExpanded(false);
      setMenuLegalExpanded(false);
      setMenuApoioExpanded(false);
      setMenuAdminExpanded(false);
    }, []),
  );
  const { data: verificationStatus, refetch: refetchVerification } = useQuery({
    queryKey: ['verification-status'],
    queryFn: getVerificationStatus,
    staleTime: 30_000,
  });
  const { data: tutorStats, refetch: refetchTutorStats } = useQuery({
    queryKey: ['me', 'tutor-stats'],
    queryFn: getTutorStats,
    staleTime: 60_000,
  });
  const { data: pendingConfirmations, refetch: refetchPendingConfirmations } = useQuery({
    queryKey: ['me', 'pending-adoption-confirmations'],
    queryFn: getPendingAdoptionConfirmations,
    staleTime: 30_000,
  });
  const pendingConfirmCount = pendingConfirmations?.items?.length ?? 0;
  const { data: adminStats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: getAdminStats,
    enabled: user?.isAdmin === true,
    staleTime: 60_000,
  });
  const { data: preferences } = useQuery({
    queryKey: ['me', 'preferences'],
    queryFn: getPreferences,
    enabled: !!user,
    staleTime: 60_000,
  });
  const { data: notificationsUnread } = useQuery({
    queryKey: ['me', 'notifications-unread-count'],
    queryFn: getMyNotificationsUnreadCount,
    enabled: !!user,
    staleTime: 60_000,
  });
  const notificationsUnreadCount = notificationsUnread?.count ?? 0;
  const adminPendingTotal =
    user?.isAdmin && adminStats
      ? (adminStats.pendingPetsCount ?? 0) +
        (adminStats.pendingReportsCount ?? 0) +
        (adminStats.pendingAdoptionsByTutorCount ?? 0) +
        (adminStats.adoptionsPendingAdopetConfirmationCount ?? 0) +
        (adminStats.pendingVerificationsCount ?? 0)
      : 0;

  useEffect(() => {
    if (user) setUser(user);
  }, [user, setUser]);

  const userVerificationRequest = verificationStatus?.requests?.find(
    (r) => r.type === 'USER_VERIFIED',
  );
  const canRequestUserVerification =
    !user?.isPartner &&
    !user?.verified &&
    !userVerificationRequest &&
    user?.kycStatus !== 'VERIFIED' &&
    user?.kycStatus !== 'PENDING';
  const verificationFeedback =
    userVerificationRequest?.status === 'PENDING'
      ? 'Solicitação de verificação de perfil em Análise'
      : userVerificationRequest?.status === 'REJECTED'
        ? userVerificationRequest.rejectionReason
          ? `Solicitação não aprovada: ${userVerificationRequest.rejectionReason}. Você pode solicitar novamente após ajustes.`
          : 'Solicitação não aprovada. Você pode solicitar novamente após ajustes.'
        : null;

  const [infoAdocaoExpanded, setInfoAdocaoExpanded] = useState(false);
  const [preferenciasBuscaExpanded, setPreferenciasBuscaExpanded] = useState(false);

  const uploadAvatarMutation = useMutation({
    mutationFn: async ({ uri, token }: { uri: string; token?: string | null }) => {
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `avatar.${ext === 'jpg' ? 'jpg' : ext}`;
      const t = token ?? useAuthStore.getState().getAccessToken();
      const { uploadUrl, key } = await presign(filename, `image/${ext === 'jpg' ? 'jpeg' : ext}`, t);
      const response = await fetch(uri);
      const blob = await response.blob();
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': blob.type || 'image/jpeg' },
      });
      if (!putRes.ok) throw new Error(`Upload falhou: ${putRes.status}`);
      return confirmAvatarUpload(key, t);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });

  const pickAndUploadAvatar = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão', 'Precisamos acessar suas fotos para definir a foto de perfil.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const token = useAuthStore.getState().getAccessToken();
    try {
      await uploadAvatarMutation.mutateAsync({ uri: result.assets[0].uri, token });
    } catch (e: unknown) {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível atualizar a foto.'));
    }
  }, [uploadAvatarMutation]);

  const handleLogout = async () => {
    await logout();
    setShowLogoutToast(true);
    router.replace('/(tabs)/feed');
  };

  const handleExportData = useCallback(async () => {
    try {
      const data = await exportMyData();
      const json = JSON.stringify(data, null, 2);
      await Share.share({
        message: json,
        title: 'Meus dados - Adopet (LGPD)',
      });
    } catch (e: unknown) {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível exportar os dados.'));
    }
  }, []);

  if (isLoading && !user) {
    return (
      <ScreenContainer>
        <LoadingLogo size={160} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <PageIntro title="Perfil" subtitle="Seus dados e configurações da conta." />
      {showCompleteProfileBanner && (
        <TouchableOpacity
          style={[styles.completeBanner, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
          onPress={() => hapticThen(() => router.push('/profile-edit'))}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add-outline" size={22} color={colors.primary} />
          <View style={styles.completeBannerText}>
            <Text style={[styles.completeBannerTitle, { color: colors.textPrimary }]}>Complete seu perfil</Text>
            <Text style={[styles.completeBannerSub, { color: colors.textSecondary }]}>
              Adicione uma foto e seu telefone para gerar mais confiança.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
      <View style={styles.avatarOuterWrap}>
        {showCompleteProfileBanner && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.avatarRing,
              {
                borderColor: colors.primary,
                opacity: avatarRingOpacity,
              },
            ]}
          />
        )}
        <TouchableOpacity
          style={[styles.avatarWrap]}
          onPress={() => hapticThen(pickAndUploadAvatar)}
          disabled={uploadAvatarMutation.isPending}
        >
        {user?.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} contentFit="cover" />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
            <Text style={[styles.avatarText, { color: colors.textSecondary }]}>
              {uploadAvatarMutation.isPending ? '' : (user?.name?.charAt(0) ?? '?').toUpperCase()}
            </Text>
            {uploadAvatarMutation.isPending && (
              <ActivityIndicator size="small" color={colors.primary} style={styles.avatarLoader} />
            )}
          </View>
        )}
        <View style={[styles.avatarBadge, { backgroundColor: colors.primary }]}>
          <Ionicons name="camera" size={14} color="#fff" />
        </View>
      </TouchableOpacity>
      </View>
      <View style={styles.nameRow}>
        <Text style={[styles.name, { color: colors.textPrimary }]}>{user?.name ?? 'Carregando...'}</Text>
        {(user?.verified || user?.kycStatus === 'VERIFIED') && (
          <VerifiedBadge variant="user" size={18} showLabel backgroundColor={colors.primary} />
        )}
      </View>
      <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email ?? ''}</Text>
      {user?.username ? (
        <Text style={[styles.username, { color: colors.textSecondary }]}>@{user.username}</Text>
      ) : null}
      {user?.kycStatus === 'VERIFIED' && !user?.isPartner ? (
        <View style={[styles.kycBlockWrap, { backgroundColor: colors.primary + '18' }]}>
          <View style={[styles.kycPendingRow, { marginBottom: 0, backgroundColor: 'transparent' }]}>
            <Ionicons name="shield-checkmark" size={18} color={colors.primary} style={styles.kycPendingIcon} />
            <Text style={[styles.kycPendingText, { color: colors.primary }]}>Identidade verificada</Text>
            <Text style={[styles.kycPendingSubtext, { color: colors.textSecondary }]}>Documento e selfie aprovados</Text>
          </View>
          <Text style={[styles.verificationHint, styles.kycBlockDisclaimer, { color: colors.textSecondary }]}>
            O selo "Verificado" indica que o perfil ou anúncio passou por análise da equipe Adopet (fotos e dados). O Adopet não garante identidade, posse do animal ou sucesso da adoção. O encontro responsável com o tutor continua essencial.
          </Text>
        </View>
      ) : null}
      {user?.kycStatus === 'PENDING' && !user?.isPartner ? (
        <View style={[styles.kycBlockWrap, { backgroundColor: (colors.warning || '#d97706') + '18' }]}>
          <View style={[styles.kycPendingRow, { marginBottom: 0, backgroundColor: 'transparent' }]}>
            <Ionicons name="time-outline" size={18} color={colors.warning || '#d97706'} style={styles.kycPendingIcon} />
            <Text style={[styles.kycPendingText, { color: colors.warning || '#d97706' }]}>Verificação em análise</Text>
            <Text style={[styles.kycPendingSubtext, { color: colors.textSecondary }]}>O resultado pode levar até 48 horas</Text>
          </View>
          <Text style={[styles.verificationHint, styles.kycBlockDisclaimer, { color: colors.textSecondary }]}>
            O selo "Verificado" indica que o perfil ou anúncio passou por análise da equipe Adopet (fotos e dados). O Adopet não garante identidade, posse do animal ou sucesso da adoção. O encontro responsável com o tutor continua essencial.
          </Text>
        </View>
      ) : null}
      {user?.kycStatus !== 'VERIFIED' && user?.kycStatus !== 'PENDING' && !user?.isPartner ? (
        <View style={[styles.kycBlockWrap, { backgroundColor: colors.primary + '18' }]}>
          <View style={[styles.kycPendingRow, { marginBottom: spacing.sm, backgroundColor: 'transparent' }]}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} style={styles.kycPendingIcon} />
            <Text style={[styles.kycPendingText, { color: colors.primary }]}>Verificação de identidade (KYC)</Text>
            <Text style={[styles.kycPendingSubtext, { color: colors.textSecondary }]}>Submeta a selfie para liberar adoções</Text>
          </View>
          <SecondaryButton title="Solicitar verificação" onPress={() => hapticThen(() => router.push('/kyc'))} />
        </View>
      ) : null}
      {user?.partnerMemberships && user.partnerMemberships.length > 0 ? (
        <View style={[styles.badgeRow, { backgroundColor: colors.primary + '18' }]}>
          <Ionicons name="people" size={16} color={colors.primary} style={styles.badgeRowIcon} />
          <Text style={[styles.badgeRowText, { color: colors.primary }]}>
            Membro da{user.partnerMemberships.length === 1 ? '' : 's'} ONG{user.partnerMemberships.length === 1 ? '' : 's'}: {user.partnerMemberships.map((m) => m.partnerName).join(', ')}
          </Text>
        </View>
      ) : null}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="document-text-outline" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Sobre mim</Text>
        </View>
        {user?.city ? (
          <View style={styles.profileFieldRow}>
            <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.profileFieldValue, { color: colors.textSecondary }]}>{user.city}</Text>
          </View>
        ) : null}
        {!user?.city && (
          <View style={styles.profileFieldRow}>
            <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.profileFieldValue, { color: colors.textSecondary, fontStyle: 'italic' }]}>Não informado</Text>
          </View>
        )}
        {user?.bio ? (
          <Text style={[styles.profileBio, { color: colors.textSecondary }]}>{user.bio}</Text>
        ) : (
          <Text style={[styles.profileBio, { color: colors.textSecondary, fontStyle: 'italic' }]}>Não informado</Text>
        )}
      </View>

      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.sectionTitleRow}
          onPress={() => hapticThen(() => { configureExpandAnimation(); setInfoAdocaoExpanded((e) => !e); })}
          activeOpacity={0.7}
        >
          <Ionicons name="paw-outline" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, flex: 1 }]}>Informações para adoção</Text>
          <Ionicons name={infoAdocaoExpanded ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        {infoAdocaoExpanded && (
          <>
        <Text style={[styles.profileBio, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
          Usadas no cálculo de compatibilidade (match) com os pets.
        </Text>
        <View style={styles.triageGrid}>
          <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Moradia</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{user?.housingType ? (HOUSING_LABEL[user.housingType] ?? user.housingType) : 'Não informado'}</Text>
          </View>
          <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Quintal</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{user?.hasYard === true ? 'Sim' : user?.hasYard === false ? 'Não' : 'Não informado'}</Text>
          </View>
          <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Outros pets</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{user?.hasOtherPets === true ? 'Sim' : user?.hasOtherPets === false ? 'Não' : 'Não informado'}</Text>
          </View>
          <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Crianças em casa</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{user?.hasChildren === true ? 'Sim' : user?.hasChildren === false ? 'Não' : 'Não informado'}</Text>
          </View>
          <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Tempo em casa</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{user?.timeAtHome ? (TIME_AT_HOME_LABEL[user.timeAtHome] ?? user.timeAtHome) : 'Não informado'}</Text>
          </View>
          <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Pets permitidos no local</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{user?.petsAllowedAtHome ? (PETS_ALLOWED_LABEL[user.petsAllowedAtHome] ?? user.petsAllowedAtHome) : 'Não informado'}</Text>
          </View>
          <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Experiência com cachorro</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{user?.dogExperience ? (EXPERIENCE_LABEL[user.dogExperience] ?? user.dogExperience) : 'Não informado'}</Text>
          </View>
          <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Experiência com gato</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{user?.catExperience ? (EXPERIENCE_LABEL[user.catExperience] ?? user.catExperience) : 'Não informado'}</Text>
          </View>
          <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Concordância em casa</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{user?.householdAgreesToAdoption ? (HOUSEHOLD_AGREES_LABEL[user.householdAgreesToAdoption] ?? user.householdAgreesToAdoption) : 'Não informado'}</Text>
          </View>
          <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Nível de atividade</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{user?.activityLevel ? (ACTIVITY_LEVEL_LABEL[user.activityLevel] ?? user.activityLevel) : 'Não informado'}</Text>
          </View>
          <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Idade preferida do pet</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{user?.preferredPetAge ? (PREFERRED_PET_AGE_LABEL[user.preferredPetAge] ?? user.preferredPetAge) : 'Não informado'}</Text>
          </View>
          <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Cuidados veterinários</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{user?.commitsToVetCare ? (COMMITS_TO_VET_CARE_LABEL[user.commitsToVetCare] ?? user.commitsToVetCare) : 'Não informado'}</Text>
          </View>
          <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Frequência de passeios</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{user?.walkFrequency ? (WALK_FREQUENCY_LABEL[user.walkFrequency] ?? user.walkFrequency) : 'Não informado'}</Text>
          </View>
          <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Orçamento mensal para o pet</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{user?.monthlyBudgetForPet ? (MONTHLY_BUDGET_LABEL[user.monthlyBudgetForPet] ?? user.monthlyBudgetForPet) : 'Não informado'}</Text>
          </View>
        </View>
        <View style={[styles.whyAdoptBlock, { borderTopColor: colors.border ?? colors.textSecondary + '25' }]}>
          <Text style={[styles.triageItemLabel, { color: colors.textSecondary, marginBottom: 4 }]}>Por que quer adotar</Text>
          <Text style={[styles.profileBio, { color: colors.textPrimary }]}>{user?.whyAdopt || 'Não informado'}</Text>
        </View>
          </>
        )}
      </View>

      {preferences && (
        <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.sectionTitleRow}
            onPress={() => hapticThen(() => { configureExpandAnimation(); setPreferenciasBuscaExpanded((e) => !e); })}
            activeOpacity={0.7}
          >
            <Ionicons name="search-outline" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, flex: 1 }]}>Preferências de busca</Text>
            <Ionicons name={preferenciasBuscaExpanded ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          {preferenciasBuscaExpanded && (
          <>
          <Text style={[styles.profileBio, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
            Filtros e preferências usados no feed e no match. Edite em Editar perfil.
          </Text>
          <View style={styles.triageGrid}>
            <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
              <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Espécie</Text>
              <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{SPECIES_LABEL[preferences.species] ?? preferences.species}</Text>
            </View>
            <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
              <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Porte preferido</Text>
              <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{preferences.sizePref ? (SIZE_PREF_LABEL[preferences.sizePref] ?? preferences.sizePref) : 'Não informado'}</Text>
            </View>
            <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
              <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Sexo preferido do pet</Text>
              <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{preferences.sexPref ? (SEX_PREF_LABEL[preferences.sexPref] ?? preferences.sexPref) : 'Não informado'}</Text>
            </View>
            <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
              <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Castração</Text>
              <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>
                {preferences.neuteredPref === 'YES' ? 'Prefiro castrado' : preferences.neuteredPref === 'NO' ? 'Aceito não castrado' : preferences.neuteredPref ? 'Indiferente' : 'Não informado'}
              </Text>
            </View>
          </View>
          </>
          )}
        </View>
      )}
      {!user?.isPartner && verificationFeedback && (
        <Text style={[styles.verificationFeedback, { color: colors.textSecondary }]}>
          {verificationFeedback}
        </Text>
      )}
      {canRequestUserVerification && (
        <View style={styles.verificationCta}>
          <SecondaryButton
            title="Solicitar verificação"
            onPress={() => {
              if (!profileComplete) {
                Alert.alert(
                  'Complete seu perfil',
                  'Para solicitar verificação é preciso ter foto e telefone no perfil. Você será levado à página de edição, onde pode adicionar a foto e preencher o telefone. Depois, volte aqui e solicite a verificação.',
                  [{ text: 'Completar perfil', onPress: () => router.push('/profile-edit') }],
                );
                return;
              }
              router.push('/verification-request?type=USER_VERIFIED');
            }}
          />
        </View>
      )}
      {tutorStats && (
        <View style={styles.tutorStatsWrap}>
          <TutorLevelBadge tutorStats={tutorStats} showDetails compact={false} />
        </View>
      )}
      {/* Conta */}
      <View style={[styles.menuSection, { borderBottomColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.menuSectionHeader, { borderBottomColor: colors.surface }]}
          onPress={() => hapticThen(() => { configureExpandAnimation(); setMenuContaExpanded((e) => !e); })}
          activeOpacity={0.7}
        >
          <Ionicons name="person-circle-outline" size={22} color={colors.primary} />
          <Text style={[styles.menuSectionHeaderText, { color: colors.textPrimary }]}>Conta</Text>
          <Ionicons name={menuContaExpanded ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        {menuContaExpanded && (
          <>
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.surface }]}
              onPress={() => hapticThen(() => router.push('/profile-edit'))}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="person-outline" size={22} color={colors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Editar perfil</Text>
              </View>
              <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.surface }]}
              onPress={() => hapticThen(() => router.push('/change-password'))}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="lock-closed-outline" size={22} color={colors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Segurança (alterar senha)</Text>
              </View>
              <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
            </TouchableOpacity>
            {!user?.isPartner &&
              (user?.kycStatus === 'PENDING' ? null : user?.kycStatus === 'VERIFIED' ? (
                <TouchableOpacity
                  style={[styles.menuItem, { borderBottomColor: colors.surface }]}
                  onPress={() => hapticThen(() => router.push('/kyc'))}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons name="shield-checkmark" size={22} color={colors.primary} style={styles.menuIcon} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Verificação concluída</Text>
                      <Text style={[styles.menuItemSubtext, { color: colors.textSecondary }]}>Documento e selfie aprovados</Text>
                    </View>
                  </View>
                  <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.menuItem, { borderBottomColor: colors.surface }]}
                  onPress={() => hapticThen(() => router.push('/kyc'))}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} style={styles.menuIcon} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Solicitar verificação (KYC)</Text>
                      <Text style={[styles.menuItemSubtext, { color: colors.textSecondary }]}>Documento e selfie para adoções</Text>
                    </View>
                  </View>
                  <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
                </TouchableOpacity>
              ))}
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.surface }]}
              onPress={() => hapticThen(() => router.push('/notifications'))}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="notifications-outline" size={22} color={colors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Notificações</Text>
                {notificationsUnreadCount > 0 && (
                  <View style={[styles.pendingBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.pendingBadgeText}>{notificationsUnreadCount > 99 ? '99+' : notificationsUnreadCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.surface }]}
              onPress={() => hapticThen(() => router.push('/saved-searches'))}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="search-outline" size={22} color={colors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Buscas salvas</Text>
              </View>
              <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Adoção */}
      <View style={[styles.menuSection, { borderBottomColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.menuSectionHeader, { borderBottomColor: colors.surface }]}
          onPress={() => hapticThen(() => { configureExpandAnimation(); setMenuAdocaoExpanded((e) => !e); })}
          activeOpacity={0.7}
        >
          <Ionicons name="heart-outline" size={22} color={colors.primary} />
          <Text style={[styles.menuSectionHeaderText, { color: colors.textPrimary }]}>Adoção</Text>
          <Ionicons name={menuAdocaoExpanded ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        {menuAdocaoExpanded && (
          <>
            {pendingConfirmCount > 0 && (
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: colors.surface }]}
                onPress={() => hapticThen(() => router.push('/adoption-confirm'))}
              >
                <View style={styles.menuItemLeft}>
                  <Ionicons name="checkmark-done-outline" size={22} color={colors.primary} style={styles.menuIcon} />
                  <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Confirmar adoção</Text>
                  <View style={[styles.pendingBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.pendingBadgeText}>{pendingConfirmCount}</Text>
                  </View>
                </View>
                <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.surface }]}
              onPress={() => hapticThen(() => router.push('/my-adoption-requests'))}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="document-text-outline" size={22} color={colors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Minhas solicitações</Text>
              </View>
              <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Parceiro — apenas para usuários parceiros (comercial ou ONG) */}
      {(user?.partner || user?.isPartner) && (
        <View style={[styles.menuSection, { borderBottomColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.menuSectionHeader, { borderBottomColor: colors.surface }]}
            onPress={() => hapticThen(() => { configureExpandAnimation(); setMenuParceiroExpanded((e) => !e); })}
            activeOpacity={0.7}
          >
            <Ionicons name="people-outline" size={22} color={colors.primary} />
            <Text style={[styles.menuSectionHeaderText, { color: colors.textPrimary }]}>Parceiro</Text>
            <Ionicons name={menuParceiroExpanded ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          {menuParceiroExpanded && (
            <>
              {user?.partner && (user.partner.isPaidPartner || user.partner.type === 'ONG') && (
                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    styles.menuItemPartner,
                    { borderBottomColor: colors.surface, borderLeftColor: colors.primary },
                  ]}
                  onPress={() => hapticThen(() => router.push('/partner-portal'))}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons name="business-outline" size={22} color={colors.primary} style={styles.menuIcon} />
                    <Text style={[styles.menuLabel, { color: colors.primary }]}>Portal do parceiro</Text>
                  </View>
                  <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
                </TouchableOpacity>
              )}
              {user?.partner && !user.partner.isPaidPartner && user.partner.type !== 'ONG' && (
                <TouchableOpacity
                  style={[styles.menuItem, { borderBottomColor: colors.surface }]}
                  onPress={() => hapticThen(() => router.push('/partner-subscription'))}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons name="card-outline" size={22} color={colors.primary} style={styles.menuIcon} />
                    <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Renovar assinatura do parceiro</Text>
                  </View>
                  <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: colors.surface }]}
                onPress={() => hapticThen(() => router.push('/partners'))}
              >
                <View style={styles.menuItemLeft}>
                  <Ionicons name="people-outline" size={22} color={colors.primary} style={styles.menuIcon} />
                  <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Parceiros Adopet</Text>
                </View>
                <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Suporte */}
      <View style={[styles.menuSection, { borderBottomColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.menuSectionHeader, { borderBottomColor: colors.surface }]}
          onPress={() => hapticThen(() => { configureExpandAnimation(); setMenuSuporteExpanded((e) => !e); })}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.primary} />
          <Text style={[styles.menuSectionHeaderText, { color: colors.textPrimary }]}>Suporte</Text>
          <Ionicons name={menuSuporteExpanded ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        {menuSuporteExpanded && (
          <>
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.surface }]}
              onPress={() => hapticThen(() => router.push('/bug-report-suggestion'))}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="bug-outline" size={22} color={colors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Bug report / Sugestões</Text>
              </View>
              <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.surface }]}
              onPress={() => hapticThen(() => router.push('/survey'))}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="stats-chart-outline" size={22} color={colors.primary} style={styles.menuIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Avaliar o app</Text>
                  <Text style={[styles.menuItemSubtext, { color: colors.textSecondary }]}>Pesquisa de satisfação</Text>
                </View>
              </View>
              <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Legal e privacidade */}
      <View style={[styles.menuSection, { borderBottomColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.menuSectionHeader, { borderBottomColor: colors.surface }]}
          onPress={() => hapticThen(() => { configureExpandAnimation(); setMenuLegalExpanded((e) => !e); })}
          activeOpacity={0.7}
        >
          <Ionicons name="document-text-outline" size={22} color={colors.primary} />
          <Text style={[styles.menuSectionHeaderText, { color: colors.textPrimary }]}>Legal e privacidade</Text>
          <Ionicons name={menuLegalExpanded ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        {menuLegalExpanded && (
          <>
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.surface }]}
              onPress={() => hapticThen(() => router.push('/terms'))}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="document-text-outline" size={22} color={colors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Termos de Uso</Text>
              </View>
              <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.surface }]}
              onPress={() => hapticThen(() => router.push('/privacy'))}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Política de Privacidade</Text>
              </View>
              <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.surface }]}
              onPress={() => hapticThen(handleExportData)}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="download-outline" size={22} color={colors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Exportar meus dados (LGPD)</Text>
              </View>
              <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Apoio (visível apenas com flag DONATIONS_UI_ENABLED) */}
      {clientConfig.donationsUiEnabled && (
        <View style={[styles.menuSection, { borderBottomColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.menuSectionHeader, { borderBottomColor: colors.surface }]}
            onPress={() => hapticThen(() => { configureExpandAnimation(); setMenuApoioExpanded((e) => !e); })}
            activeOpacity={0.7}
          >
            <Ionicons name="heart" size={22} color={colors.primary} />
            <Text style={[styles.menuSectionHeaderText, { color: colors.textPrimary }]}>Apoio</Text>
            <Ionicons name={menuApoioExpanded ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          {menuApoioExpanded && (
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.surface }]}
              onPress={() => hapticThen(() => {
                Linking.canOpenURL(DONATION_URL).then((supported) => {
                  if (supported) Linking.openURL(DONATION_URL);
                  else Alert.alert('Abrir link', 'Não foi possível abrir a página. Tente acessar pelo navegador: ' + DONATION_URL);
                });
              })}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="heart" size={22} color={colors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Apoiar o Adopet</Text>
              </View>
              <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Administração */}
      {user?.isAdmin && (
        <View style={[styles.menuSection, { borderBottomColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.menuSectionHeader, styles.menuItemPartner, { borderBottomColor: colors.surface, borderLeftColor: colors.primary }]}
            onPress={() => hapticThen(() => { configureExpandAnimation(); setMenuAdminExpanded((e) => !e); })}
            activeOpacity={0.7}
          >
            <Ionicons name="shield-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={[styles.menuSectionHeaderText, { color: colors.primary }]}>Administração</Text>
              {adminPendingTotal > 0 && (
                <View style={[styles.pendingBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.pendingBadgeText}>{adminPendingTotal > 99 ? '99+' : adminPendingTotal}</Text>
                </View>
              )}
            </View>
            <Ionicons name={menuAdminExpanded ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          {menuAdminExpanded && (
            <TouchableOpacity
              style={[
                styles.menuItem,
                styles.menuItemAdmin,
                { borderBottomColor: colors.surface, borderLeftColor: colors.primary },
              ]}
              onPress={() => hapticThen(() => router.push('/admin'))}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="shield-outline" size={22} color={colors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuLabel, { color: colors.primary }]}>Painel de administração</Text>
              </View>
              <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <Text style={[styles.versionText, { color: colors.textSecondary }]}>
        Adopet v{APP_VERSION}
      </Text>
      <View style={styles.footer}>
        <PrimaryButton
          title="Sair"
          onPress={() => hapticThen(handleLogout)}
          accessibilityLabel="Sair da conta"
          accessibilityHint="Toque duas vezes para encerrar sua sessão"
        />
        {user?.partner ? (
          <View style={[styles.deactivateBtn, { marginTop: spacing.lg }]}>
            <Text style={[styles.deactivateText, { color: colors.textSecondary, textAlign: 'center' }]}>
              Desativar conta e excluir meus dados
            </Text>
            <Text style={[styles.deactivateHint, { color: colors.textSecondary, marginTop: spacing.xs }]}>
              Você é responsável por uma conta parceira (ONG). Transfira a administração no portal do parceiro ou entre em contato com o suporte antes de desativar sua conta.
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.deactivateBtn, { marginTop: spacing.lg }]}
            onPress={() => hapticThen(() => {
              Alert.alert(
                'Desativar conta e excluir dados',
                'Sua conta será desativada e seus dados pessoais serão excluídos ou anonimizados (nome, e-mail, telefone, favoritos, preferências etc.). Você não poderá fazer login novamente. Esta ação não pode ser desfeita. Deseja continuar?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Sim, desativar e excluir',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await deactivateAccount();
                        await logout();
                        setShowLogoutToast(true);
                        router.replace('/(tabs)/feed');
                      } catch (e: unknown) {
                        Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível desativar a conta.'));
                      }
                    },
                  },
                ],
              );
            })}
            accessibilityRole="button"
            accessibilityLabel="Desativar conta e excluir meus dados"
            accessibilityHint="Toque duas vezes para desativar sua conta permanentemente. Esta ação não pode ser desfeita."
          >
            <Text style={[styles.deactivateText, { color: colors.textSecondary }]}>Desativar conta e excluir meus dados</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  completeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  completeBannerText: { flex: 1, marginLeft: spacing.sm },
  completeBannerTitle: { fontSize: 16, fontWeight: '700' },
  completeBannerSub: { fontSize: 13, marginTop: 2 },
  avatarOuterWrap: {
    alignSelf: 'center',
    marginBottom: spacing.md,
    position: 'relative',
  },
  avatarRing: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    top: -4,
    left: -4,
    zIndex: 1,
  },
  avatarWrap: {
    alignSelf: 'center',
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarLoader: {
    position: 'absolute',
  },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  verificationFeedback: {
    fontSize: 14,
    textAlign: 'center',
  },
  verificationDisclaimer: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
  },
  verificationHint: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  verificationCta: {
    marginBottom: spacing.md,
  },
  tutorStatsWrap: {
    marginBottom: spacing.lg,
  },
  errorText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  email: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 6,
    marginBottom: spacing.md,
  },
  badgeRowIcon: { marginRight: 6 },
  badgeRowText: { fontSize: 13, fontWeight: '600', flex: 1 },
  username: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  kycBlockWrap: {
    borderRadius: 10,
    marginBottom: spacing.sm,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  kycBlockDisclaimer: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  kycPendingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    marginBottom: spacing.sm,
    gap: 6,
  },
  kycPendingIcon: { marginRight: 2 },
  kycPendingText: { fontSize: 14, fontWeight: '600' },
  kycPendingSubtext: { fontSize: 12, width: '100%', textAlign: 'center' },
  city: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  bio: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sectionCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  profileFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  profileFieldValue: {
    fontSize: 14,
  },
  profileBio: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  triageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  triageItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    minWidth: '45%',
    maxWidth: '100%',
  },
  triageItemLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  triageItemValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  whyAdoptBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  menuSection: {
    marginBottom: spacing.sm,
  },
  menuSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingRight: spacing.xs,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  menuSectionHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  menuItemStatic: {
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    marginRight: spacing.sm,
  },
  menuLabel: {
    fontSize: 16,
  },
  menuItemSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  pendingBadge: {
    marginLeft: 8,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pendingBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  menuArrow: {
    fontSize: 20,
  },
  menuItemAdmin: {
    borderLeftWidth: 3,
    borderLeftColor: '#0D9488',
    paddingLeft: spacing.md - 3,
  },
  menuItemPartner: {
    borderLeftWidth: 3,
    paddingLeft: spacing.md - 3,
  },
  versionText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  footer: {
    marginTop: spacing.xl,
  },
  deactivateBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  deactivateText: {
    fontSize: 14,
  },
  deactivateHint: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
});
