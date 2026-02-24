import { useState, useLayoutEffect } from 'react';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Pressable, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ScreenContainer, LoadingLogo, TutorLevelBadge, PrimaryButton, SecondaryButton, VerifiedBadge, UsuarioVerificadoModal } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { useAuthStore } from '../src/stores/authStore';
import { getMe } from '../src/api/me';
import { getOwnerProfileByPetId, getOwnerProfileByPetIdForAdmin, getOwnerProfileByUserId } from '../src/api/pet';
import { createReport } from '../src/api/reports';
import { getFriendlyErrorMessage } from '../src/utils/errorMessage';
import { spacing } from '../src/theme';

const HOUSING_LABEL: Record<string, string> = { CASA: 'Casa', APARTAMENTO: 'Apartamento' };
const TIME_AT_HOME_LABEL: Record<string, string> = { MOST_DAY: 'Maior parte do dia', HALF_DAY: 'Metade do dia', LITTLE: 'Pouco tempo' };
const PETS_ALLOWED_LABEL: Record<string, string> = { YES: 'Sim', NO: 'Não', UNSURE: 'Não sei' };
const EXPERIENCE_LABEL: Record<string, string> = { NEVER: 'Nunca tive', HAD_BEFORE: 'Já tive', HAVE_NOW: 'Tenho atualmente' };
const HOUSEHOLD_AGREES_LABEL: Record<string, string> = { YES: 'Sim, todos concordam', DISCUSSING: 'Ainda conversando' };

const USER_REPORT_REASONS: { label: string; value: string }[] = [
  { label: 'Comportamento inadequado', value: 'INAPPROPRIATE' },
  { label: 'Spam', value: 'SPAM' },
  { label: 'Assédio', value: 'HARASSMENT' },
  { label: 'Outro', value: 'OTHER' },
];

export default function TutorProfileScreen() {
  const { petId, userId } = useLocalSearchParams<{ petId?: string; userId?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const isAdmin = useAuthStore((s) => s.user?.isAdmin);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportDescription, setReportDescription] = useState('');
  const [showVerifiedModal, setShowVerifiedModal] = useState(false);

  const navigation = useNavigation();
  useLayoutEffect(() => {
    if (userId) navigation.setOptions({ title: 'Perfil' });
  }, [userId, navigation]);

  const currentUserId = useAuthStore((s) => s.user?.id);
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['owner-profile', petId ?? userId, userId ? 'by-user' : isAdmin ? 'admin' : 'public'],
    queryFn: () =>
      userId
        ? getOwnerProfileByUserId(userId)
        : isAdmin
          ? getOwnerProfileByPetIdForAdmin(petId!)
          : getOwnerProfileByPetId(petId!),
    enabled: !!petId || !!userId,
  });
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    enabled: !!currentUserId && !!profile && currentUserId === profile.id,
  });
  /** Mostrar aviso de KYC apenas no próprio perfil; não exibir nada sobre KYC ao visitar perfil de outro usuário. */
  const showKycHint = !!currentUserId && !!profile && currentUserId === profile.id && me?.kycStatus !== 'VERIFIED';

  const reportProfileMutation = useMutation({
    mutationFn: ({ reason, description }: { reason: string; description?: string }) =>
      createReport({ targetType: 'USER', targetId: profile!.id, reason, description: description?.trim() || undefined }),
    onSuccess: () => {
      setReportModalVisible(false);
      setReportReason(null);
      setReportDescription('');
      Alert.alert('Denúncia enviada', 'Obrigado. Nossa equipe analisará.');
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível enviar a denúncia.'));
    },
  });

  const handleDenunciarPerfil = () => {
    Alert.alert(
      'Denunciar perfil',
      'Selecione o motivo:',
      [
        ...USER_REPORT_REASONS.map((r) => ({
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
    reportProfileMutation.mutate({ reason: reportReason, description: reportDescription || undefined });
  };

  if (isLoading || !profile) {
    return (
      <ScreenContainer>
        <LoadingLogo size={160} />
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <Text style={[styles.error, { color: colors.textSecondary }]}>
          Não foi possível carregar o perfil do anunciante.
        </Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        {profile.avatarUrl ? (
          <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
            <Text style={[styles.avatarLetter, { color: colors.textSecondary }]}>
              {profile.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{profile.name}</Text>
          {profile.verified && (
            <TouchableOpacity
              onPress={() => setShowVerifiedModal(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.8}
            >
              <VerifiedBadge size={20} iconBackgroundColor={colors.primary} accessibilityLabel="Tutor verificado pela equipe Adopet" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.petsCount, { color: colors.textSecondary }]}>
          {profile.petsCount} pet(s) anunciados
        </Text>
        {profile.tutorStats && (
          <View style={styles.tutorBadgeWrap}>
            <TutorLevelBadge tutorStats={profile.tutorStats} showDetails compact={false} />
          </View>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push({ pathname: '/owner-pets', params: { ownerId: profile.id, ownerName: profile.name } })}
          >
            <Ionicons name="paw" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Ver anúncios</Text>
          </TouchableOpacity>
          {profile.partner && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary + '22', borderWidth: 1, borderColor: colors.primary }]}
              onPress={() => router.push(`/partners/${profile.partner!.id}`)}
            >
              <Ionicons name="business-outline" size={20} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>Ver página do parceiro</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary, { borderColor: colors.textSecondary }]}
            onPress={handleDenunciarPerfil}
          >
            <Ionicons name="flag-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.actionBtnTextSecondary, { color: colors.textSecondary }]}>Denunciar perfil</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showKycHint && (
        <TouchableOpacity
          style={[styles.kycHintBlock, { backgroundColor: (colors.warning || '#d97706') + '18', borderColor: (colors.warning || '#d97706') + '50' }]}
          onPress={() => router.push('/kyc')}
          activeOpacity={0.85}
        >
          <Ionicons name="shield-checkmark-outline" size={24} color={colors.warning || '#d97706'} />
          <View style={styles.kycHintTextWrap}>
            <Text style={[styles.kycHintTitle, { color: colors.textPrimary }]}>Você ainda não fez a verificação de identidade (KYC)</Text>
            <Text style={[styles.kycHintSub, { color: colors.textSecondary }]}>
              Isso pode ser feito durante o processo de adoção. Necessário para confirmar a adoção no app.
            </Text>
            <Text style={[styles.kycHintLink, { color: colors.primary }]}>Solicitar verificação →</Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="document-text-outline" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>Sobre</Text>
        </View>
        <View style={styles.profileFieldRow}>
          <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.fieldValue, { color: colors.textSecondary }]}>{profile.city || 'Não informado'}</Text>
        </View>
        <Text style={[styles.profileBio, { color: colors.textSecondary }]}>{profile.bio || 'Não informado'}</Text>
      </View>

      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="paw-outline" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>Informações para adoção</Text>
        </View>
        <Text style={[styles.sectionNote, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
          Dados que o anunciante compartilha (sem contato). Usados no match com os pets.
        </Text>
        <View style={styles.triageGrid}>
          <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Moradia</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{profile.housingType ? (HOUSING_LABEL[profile.housingType] ?? profile.housingType) : 'Não informado'}</Text>
          </View>
          <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Quintal</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{profile.hasYard === true ? 'Sim' : profile.hasYard === false ? 'Não' : 'Não informado'}</Text>
          </View>
          <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Outros pets</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{profile.hasOtherPets === true ? 'Sim' : profile.hasOtherPets === false ? 'Não' : 'Não informado'}</Text>
          </View>
          <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Crianças em casa</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{profile.hasChildren === true ? 'Sim' : profile.hasChildren === false ? 'Não' : 'Não informado'}</Text>
          </View>
          <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Tempo em casa</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{profile.timeAtHome ? (TIME_AT_HOME_LABEL[profile.timeAtHome] ?? profile.timeAtHome) : 'Não informado'}</Text>
          </View>
          <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Pets permitidos no local</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{profile.petsAllowedAtHome ? (PETS_ALLOWED_LABEL[profile.petsAllowedAtHome] ?? profile.petsAllowedAtHome) : 'Não informado'}</Text>
          </View>
          <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Experiência com cachorro</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{profile.dogExperience ? (EXPERIENCE_LABEL[profile.dogExperience] ?? profile.dogExperience) : 'Não informado'}</Text>
          </View>
          <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Experiência com gato</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{profile.catExperience ? (EXPERIENCE_LABEL[profile.catExperience] ?? profile.catExperience) : 'Não informado'}</Text>
          </View>
          <View style={[styles.triageItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Concordância em casa</Text>
            <Text style={[styles.triageItemValue, { color: colors.textPrimary }]}>{profile.householdAgreesToAdoption ? (HOUSEHOLD_AGREES_LABEL[profile.householdAgreesToAdoption] ?? profile.householdAgreesToAdoption) : 'Não informado'}</Text>
          </View>
        </View>
        <View style={[styles.whyAdoptBlock, { borderTopColor: colors.border ?? colors.textSecondary + '25' }]}>
          <Text style={[styles.triageItemLabel, { color: colors.textSecondary, marginBottom: 4 }]}>Por que quer adotar</Text>
          <Text style={[styles.profileBio, { color: colors.textPrimary }]}>{profile.whyAdopt || 'Não informado'}</Text>
        </View>
      </View>

      {isAdmin && profile.phone != null && profile.phone !== '' && (
        <View style={[styles.sectionCard, styles.phoneRow, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30', borderWidth: 1 }]}>
          <Ionicons name="call" size={20} color={colors.primary} />
          <View>
            <Text style={[styles.triageItemLabel, { color: colors.textSecondary }]}>Telefone (contato admin)</Text>
            <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>{profile.phone}</Text>
          </View>
        </View>
      )}

      <Modal visible={reportModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setReportModalVisible(false)}>
          <Pressable style={[styles.modalBox, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Detalhes da denúncia (opcional)</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.textSecondary }]}
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
                title={reportProfileMutation.isPending ? 'Enviando...' : 'Enviar'}
                onPress={handleEnviarDenuncia}
                disabled={reportProfileMutation.isPending}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <UsuarioVerificadoModal visible={showVerifiedModal} onClose={() => setShowVerifiedModal(false)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: spacing.md,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarLetter: {
    fontSize: 36,
    fontWeight: '700',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
  },
  petsCount: {
    fontSize: 14,
  },
  tutorBadgeWrap: {
    marginTop: spacing.md,
    width: '100%',
  },
  sectionCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
  },
  kycHintBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
  },
  kycHintTextWrap: { flex: 1 },
  kycHintTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  kycHintSub: { fontSize: 13, lineHeight: 20 },
  kycHintLink: { fontSize: 13, fontWeight: '600', marginTop: 6 },
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
  sectionNote: {
    fontSize: 13,
  },
  profileFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
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
  fieldValue: {
    fontSize: 15,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  error: {
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    width: '100%',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  actionBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  actionBtnTextSecondary: {
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalBox: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 12,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
});