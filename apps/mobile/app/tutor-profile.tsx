import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Pressable, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ScreenContainer, LoadingLogo, TutorLevelBadge, PrimaryButton, SecondaryButton } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { useAuthStore } from '../src/stores/authStore';
import { getOwnerProfileByPetId, getOwnerProfileByPetIdForAdmin } from '../src/api/pet';
import { createReport } from '../src/api/reports';
import { getFriendlyErrorMessage } from '../src/utils/errorMessage';
import { spacing } from '../src/theme';

const HOUSING_LABEL: Record<string, string> = {
  CASA: 'Casa',
  APARTAMENTO: 'Apartamento',
};

const TIME_AT_HOME_LABEL: Record<string, string> = {
  MOST_DAY: 'Maior parte do dia',
  HALF_DAY: 'Metade do dia',
  LITTLE: 'Pouco tempo',
};

const USER_REPORT_REASONS: { label: string; value: string }[] = [
  { label: 'Comportamento inadequado', value: 'INAPPROPRIATE' },
  { label: 'Spam', value: 'SPAM' },
  { label: 'Assédio', value: 'HARASSMENT' },
  { label: 'Outro', value: 'OTHER' },
];

function LabelValue({
  label,
  value,
  colors,
}: {
  label: string;
  value: string | undefined | null;
  colors: { textPrimary: string; textSecondary: string };
}) {
  if (value == null || value === '') return null;
  return (
    <View style={styles.labelValue}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

function BoolLabel({ value, colors }: { value: boolean | undefined; colors: { textPrimary: string; textSecondary: string } }) {
  if (value === undefined) return null;
  return (
    <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>
      {value ? 'Sim' : 'Não'}
    </Text>
  );
}

export default function TutorProfileScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const isAdmin = useAuthStore((s) => s.user?.isAdmin);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportDescription, setReportDescription] = useState('');

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['owner-profile', petId, isAdmin ? 'admin' : 'public'],
    queryFn: () => (isAdmin ? getOwnerProfileByPetIdForAdmin(petId!) : getOwnerProfileByPetId(petId!)),
    enabled: !!petId,
  });

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
        <Text style={[styles.name, { color: colors.textPrimary }]}>{profile.name}</Text>
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
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary, { borderColor: colors.textSecondary }]}
            onPress={handleDenunciarPerfil}
          >
            <Ionicons name="flag-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.actionBtnTextSecondary, { color: colors.textSecondary }]}>Denunciar perfil</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        Informações para adoção
      </Text>
      <Text style={[styles.sectionNote, { color: colors.textSecondary }]}>
        Dados que o anunciante compartilha (sem contato).
      </Text>

      <LabelValue label="Cidade" value={profile.city} colors={colors} />
      <LabelValue label="Sobre" value={profile.bio} colors={colors} />
      <LabelValue
        label="Tipo de moradia"
        value={profile.housingType ? HOUSING_LABEL[profile.housingType] ?? profile.housingType : undefined}
        colors={colors}
      />

      {profile.hasYard !== undefined && (
        <View style={styles.labelValue}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Tem quintal?</Text>
          <BoolLabel value={profile.hasYard} colors={colors} />
        </View>
      )}
      {profile.hasOtherPets !== undefined && (
        <View style={styles.labelValue}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Tem outros pets?</Text>
          <BoolLabel value={profile.hasOtherPets} colors={colors} />
        </View>
      )}
      {profile.hasChildren !== undefined && (
        <View style={styles.labelValue}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Tem crianças em casa?</Text>
          <BoolLabel value={profile.hasChildren} colors={colors} />
        </View>
      )}
      <LabelValue
        label="Tempo em casa"
        value={profile.timeAtHome ? TIME_AT_HOME_LABEL[profile.timeAtHome] ?? profile.timeAtHome : undefined}
        colors={colors}
      />
      {isAdmin && profile.phone != null && profile.phone !== '' && (
        <View style={[styles.phoneRow, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
          <Ionicons name="call" size={20} color={colors.primary} />
          <View>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Telefone (contato admin)</Text>
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
  name: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  petsCount: {
    fontSize: 14,
  },
  tutorBadgeWrap: {
    marginTop: spacing.md,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  sectionNote: {
    fontSize: 13,
    marginBottom: spacing.lg,
  },
  labelValue: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 12,
    marginBottom: 2,
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