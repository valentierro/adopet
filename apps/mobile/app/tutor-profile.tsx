import { useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer, LoadingLogo, TutorLevelBadge } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { useAuthStore } from '../src/stores/authStore';
import { getOwnerProfileByPetId, getOwnerProfileByPetIdForAdmin } from '../src/api/pet';
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
  const { colors } = useTheme();
  const isAdmin = useAuthStore((s) => s.user?.isAdmin);
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['owner-profile', petId, isAdmin ? 'admin' : 'public'],
    queryFn: () => (isAdmin ? getOwnerProfileByPetIdForAdmin(petId!) : getOwnerProfileByPetId(petId!)),
    enabled: !!petId,
  });

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
          {profile.petsCount} pet(s) no anúncio
        </Text>
        {profile.tutorStats && (
          <View style={styles.tutorBadgeWrap}>
            <TutorLevelBadge tutorStats={profile.tutorStats} showDetails compact={false} />
          </View>
        )}
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
      {profile.phone != null && profile.phone !== '' && (
        <View style={[styles.phoneRow, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
          <Ionicons name="call" size={20} color={colors.primary} />
          <View>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Telefone (contato admin)</Text>
            <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>{profile.phone}</Text>
          </View>
        </View>
      )}
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
});