import { useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator, Share } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, PrimaryButton, SecondaryButton, LoadingLogo, PageIntro, VerifiedBadge, TutorLevelBadge } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/authStore';
import { getMe, getTutorStats, deactivateAccount, exportMyData } from '../../src/api/me';
import { requestVerification, getVerificationStatus } from '../../src/api/verification';
import { presign, confirmAvatarUpload } from '../../src/api/uploads';
import { getFriendlyErrorMessage } from '../../src/utils/errorMessage';
import { spacing } from '../../src/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const logout = useAuthStore((s) => s.logout);
  const setUser = useAuthStore((s) => s.setUser);

  const queryClient = useQueryClient();
  const { data: user, isLoading, refetch: refetchMe } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    staleTime: 60_000,
  });
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
  useFocusEffect(
    useCallback(() => {
      refetchMe();
      refetchVerification();
      refetchTutorStats();
    }, [refetchMe, refetchVerification, refetchTutorStats]),
  );
  const requestUserVerification = useMutation({
    mutationFn: () => requestVerification({ type: 'USER_VERIFIED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-status'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  useEffect(() => {
    if (user) setUser(user);
  }, [user, setUser]);

  const userVerificationRequest = verificationStatus?.requests?.find(
    (r) => r.type === 'USER_VERIFIED',
  );
  const canRequestUserVerification =
    !user?.verified && !userVerificationRequest && !requestUserVerification.isPending;
  const verificationFeedback =
    userVerificationRequest?.status === 'PENDING'
      ? 'Solicitação em análise'
      : userVerificationRequest?.status === 'REJECTED'
        ? 'Solicitação não aprovada'
        : null;

  const profileComplete = !!(user?.avatarUrl && user?.phone);
  const showCompleteProfileBanner = !profileComplete && !!user;

  const uploadAvatarMutation = useMutation({
    mutationFn: async (uri: string) => {
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `avatar.${ext === 'jpg' ? 'jpg' : ext}`;
      const { uploadUrl, key } = await presign(filename, `image/${ext === 'jpg' ? 'jpeg' : ext}`);
      const response = await fetch(uri);
      const blob = await response.blob();
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': blob.type || 'image/jpeg' },
      });
      if (!putRes.ok) throw new Error(`Upload falhou: ${putRes.status}`);
      return confirmAvatarUpload(key);
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
    try {
      await uploadAvatarMutation.mutateAsync(result.assets[0].uri);
    } catch (e: unknown) {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível atualizar a foto.'));
    }
  }, [uploadAvatarMutation]);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/welcome');
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
          onPress={() => router.push('/profile-edit')}
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
      <TouchableOpacity
        style={[styles.avatarWrap]}
        onPress={pickAndUploadAvatar}
        disabled={uploadAvatarMutation.isPending}
      >
        {user?.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
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
      <View style={styles.nameRow}>
        <Text style={[styles.name, { color: colors.textPrimary }]}>{user?.name ?? 'Carregando...'}</Text>
        {user?.verified && (
          <VerifiedBadge size={18} showLabel backgroundColor={colors.primary} />
        )}
      </View>
      <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email ?? ''}</Text>
      {user?.username ? (
        <Text style={[styles.username, { color: colors.textSecondary }]}>@{user.username}</Text>
      ) : null}
      {user?.city ? (
        <Text style={[styles.city, { color: colors.textSecondary }]}>{user.city}</Text>
      ) : null}
      {user?.bio ? (
        <Text style={[styles.bio, { color: colors.textSecondary }]}>{user.bio}</Text>
      ) : null}
      {(user?.housingType || user?.hasYard !== undefined || user?.hasOtherPets !== undefined || user?.hasChildren !== undefined || user?.timeAtHome) ? (
        <View style={[styles.housingWrap, { backgroundColor: colors.surface }]}>
          <Text style={[styles.housingTitle, { color: colors.textPrimary }]}>Informações para adoção</Text>
          <Text style={[styles.housingText, { color: colors.textSecondary }]}>
            {[
              user.housingType === 'CASA' ? 'Casa' : user.housingType === 'APARTAMENTO' ? 'Apartamento' : null,
              user.hasYard === true ? 'Tem quintal' : user.hasYard === false ? 'Sem quintal' : null,
              user.hasOtherPets === true ? 'Tem outros pets' : user.hasOtherPets === false ? 'Sem outros pets' : null,
              user.hasChildren === true ? 'Tem crianças' : user.hasChildren === false ? 'Sem crianças' : null,
              user.timeAtHome === 'MOST_DAY' ? 'Em casa a maior parte do dia' : user.timeAtHome === 'HALF_DAY' ? 'Em casa metade do dia' : user.timeAtHome === 'LITTLE' ? 'Pouco tempo em casa' : null,
            ].filter(Boolean).join(' • ')}
          </Text>
        </View>
      ) : null}
      {verificationFeedback && (
        <Text style={[styles.verificationFeedback, { color: colors.textSecondary }]}>
          {verificationFeedback}
        </Text>
      )}
      {canRequestUserVerification && (
        <View style={styles.verificationCta}>
          <SecondaryButton
            title="Solicitar verificação"
            onPress={() => requestUserVerification.mutate()}
            disabled={requestUserVerification.isPending}
          />
          {requestUserVerification.isError && (
            <Text style={[styles.errorText, { color: colors.error }]}>
              {getFriendlyErrorMessage(requestUserVerification.error, 'Não foi possível enviar.')}
            </Text>
          )}
        </View>
      )}
      {tutorStats && (
        <View style={styles.tutorStatsWrap}>
          <TutorLevelBadge tutorStats={tutorStats} showDetails compact={false} />
        </View>
      )}
      <TouchableOpacity
        style={[styles.menuItem, { borderBottomColor: colors.surface }]}
        onPress={() => router.push('/my-pets')}
      >
        <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Meus anúncios</Text>
        <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.menuItem, { borderBottomColor: colors.surface }]}
        onPress={() => router.push('/my-adoptions')}
      >
        <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Minhas adoções</Text>
        <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.menuItem, { borderBottomColor: colors.surface }]}
        onPress={() => router.push('/profile-edit')}
      >
        <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Editar perfil</Text>
        <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.menuItem, { borderBottomColor: colors.surface }]}
        onPress={() => router.push('/preferences')}
      >
        <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Preferências</Text>
        <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.menuItem, { borderBottomColor: colors.surface }]}
        onPress={() => router.push('/passed-pets')}
      >
        <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Pets que você passou</Text>
        <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.menuItem, { borderBottomColor: colors.surface }]}
        onPress={() => router.push('/map')}
      >
        <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Mapa de pets</Text>
        <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.menuItem, { borderBottomColor: colors.surface }]}
        onPress={() => router.push('/saved-searches')}
      >
        <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Buscas salvas</Text>
        <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
      </TouchableOpacity>
      {user?.partner?.isPaidPartner && (
        <TouchableOpacity
          style={[
            styles.menuItem,
            styles.menuItemPartner,
            { borderBottomColor: colors.surface, borderLeftColor: colors.primary },
          ]}
          onPress={() => router.push('/partner-portal')}
        >
          <Text style={[styles.menuLabel, { color: colors.primary }]}>Portal do parceiro</Text>
          <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
        </TouchableOpacity>
      )}
      {user?.partner && !user.partner.isPaidPartner && (
        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.surface }]}
          onPress={() => router.push('/partner-subscription')}
        >
          <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Renovar assinatura do parceiro</Text>
          <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={[styles.menuItem, { borderBottomColor: colors.surface }]}
        onPress={() => router.push('/partners')}
      >
        <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Parceiros Adopet</Text>
        <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.menuItem, { borderBottomColor: colors.surface }]}
        onPress={() => router.push('/terms')}
      >
        <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Termos de Uso</Text>
        <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.menuItem, { borderBottomColor: colors.surface }]}
        onPress={() => router.push('/privacy')}
      >
        <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Política de Privacidade</Text>
        <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.menuItem, { borderBottomColor: colors.surface }]}
        onPress={handleExportData}
      >
        <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Exportar meus dados (LGPD)</Text>
        <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
      </TouchableOpacity>
      {user?.isAdmin && (
        <TouchableOpacity
          style={[
            styles.menuItem,
            styles.menuItemAdmin,
            { borderBottomColor: colors.surface, borderLeftColor: colors.primary },
          ]}
          onPress={() => router.push('/admin')}
        >
          <Text style={[styles.menuLabel, { color: colors.primary }]}>Administração</Text>
          <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
        </TouchableOpacity>
      )}
      <View style={styles.footer}>
        <PrimaryButton title="Sair" onPress={handleLogout} />
        <TouchableOpacity
          style={[styles.deactivateBtn, { marginTop: spacing.lg }]}
          onPress={() => {
            Alert.alert(
              'Desativar conta',
              'Sua conta será desativada. Você não poderá fazer login até reativar. Deseja continuar?',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Desativar',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deactivateAccount();
                      await logout();
                      router.replace('/(auth)/welcome');
                    } catch (e: unknown) {
                      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível desativar a conta.'));
                    }
                  },
                },
              ],
            );
          }}
        >
          <Text style={[styles.deactivateText, { color: colors.textSecondary }]}>Desativar conta</Text>
        </TouchableOpacity>
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
  avatarWrap: {
    alignSelf: 'center',
    marginBottom: spacing.md,
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
    marginBottom: spacing.sm,
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
  username: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
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
  housingWrap: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
    marginHorizontal: spacing.lg,
  },
  housingTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  housingText: {
    fontSize: 14,
    lineHeight: 20,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  menuLabel: {
    fontSize: 16,
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
});
