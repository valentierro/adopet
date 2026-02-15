import { useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Share } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, PrimaryButton, SecondaryButton, LoadingLogo, PageIntro, VerifiedBadge, TutorLevelBadge } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/authStore';
import { getMe, getTutorStats, getPendingAdoptionConfirmations, deactivateAccount, exportMyData } from '../../src/api/me';
import { getAdminStats } from '../../src/api/admin';
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
  const adminPendingTotal =
    user?.isAdmin && adminStats
      ? (adminStats.pendingPetsCount ?? 0) +
        (adminStats.pendingReportsCount ?? 0) +
        (adminStats.pendingAdoptionsByTutorCount ?? 0) +
        (adminStats.pendingVerificationsCount ?? 0)
      : 0;
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
        onPress={() => router.push('/profile-edit')}
      >
        <View style={styles.menuItemLeft}>
          <Ionicons name="person-outline" size={22} color={colors.primary} style={styles.menuIcon} />
          <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Editar perfil</Text>
        </View>
        <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.menuItem, { borderBottomColor: colors.surface }]}
        onPress={() => router.push('/change-password')}
      >
        <View style={styles.menuItemLeft}>
          <Ionicons name="lock-closed-outline" size={22} color={colors.primary} style={styles.menuIcon} />
          <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Segurança (alterar senha)</Text>
        </View>
        <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.menuItem, { borderBottomColor: colors.surface }]}
        onPress={() => router.push('/preferences')}
      >
        <View style={styles.menuItemLeft}>
          <Ionicons name="settings-outline" size={22} color={colors.primary} style={styles.menuIcon} />
          <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Preferências</Text>
        </View>
        <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.menuItem, { borderBottomColor: colors.surface }]}
        onPress={() => router.push('/bug-report-suggestion')}
      >
        <View style={styles.menuItemLeft}>
          <Ionicons name="bug-outline" size={22} color={colors.primary} style={styles.menuIcon} />
          <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Bug report / Sugestões</Text>
        </View>
        <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.menuItem, { borderBottomColor: colors.surface }]}
        onPress={() => router.push('/saved-searches')}
      >
        <View style={styles.menuItemLeft}>
          <Ionicons name="search-outline" size={22} color={colors.primary} style={styles.menuIcon} />
          <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Buscas salvas</Text>
        </View>
        <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
      </TouchableOpacity>
      {pendingConfirmCount > 0 && (
        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.surface }]}
          onPress={() => router.push('/adoption-confirm')}
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
      {user?.partner?.isPaidPartner && (
        <TouchableOpacity
          style={[
            styles.menuItem,
            styles.menuItemPartner,
            { borderBottomColor: colors.surface, borderLeftColor: colors.primary },
          ]}
          onPress={() => router.push('/partner-portal')}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="business-outline" size={22} color={colors.primary} style={styles.menuIcon} />
            <Text style={[styles.menuLabel, { color: colors.primary }]}>Portal do parceiro</Text>
          </View>
          <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
        </TouchableOpacity>
      )}
      {user?.partner && !user.partner.isPaidPartner && (
        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.surface }]}
          onPress={() => router.push('/partner-subscription')}
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
        onPress={() => router.push('/partners')}
      >
        <View style={styles.menuItemLeft}>
          <Ionicons name="people-outline" size={22} color={colors.primary} style={styles.menuIcon} />
          <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Parceiros Adopet</Text>
        </View>
        <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.menuItem, { borderBottomColor: colors.surface }]}
        onPress={() => router.push('/terms')}
      >
        <View style={styles.menuItemLeft}>
          <Ionicons name="document-text-outline" size={22} color={colors.primary} style={styles.menuIcon} />
          <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Termos de Uso</Text>
        </View>
        <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.menuItem, { borderBottomColor: colors.surface }]}
        onPress={() => router.push('/privacy')}
      >
        <View style={styles.menuItemLeft}>
          <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} style={styles.menuIcon} />
          <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Política de Privacidade</Text>
        </View>
        <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.menuItem, { borderBottomColor: colors.surface }]}
        onPress={handleExportData}
      >
        <View style={styles.menuItemLeft}>
          <Ionicons name="download-outline" size={22} color={colors.primary} style={styles.menuIcon} />
          <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Exportar meus dados (LGPD)</Text>
        </View>
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
          <View style={styles.menuItemLeft}>
            <Ionicons name="shield-outline" size={22} color={colors.primary} style={styles.menuIcon} />
            <Text style={[styles.menuLabel, { color: colors.primary }]}>Administração</Text>
            {adminPendingTotal > 0 && (
              <View style={[styles.pendingBadge, { backgroundColor: colors.primary, marginLeft: spacing.sm }]}>
                <Text style={styles.pendingBadgeText}>
                  {adminPendingTotal > 99 ? '99+' : adminPendingTotal}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
        </TouchableOpacity>
      )}
      <View style={styles.footer}>
        <PrimaryButton
          title="Sair"
          onPress={handleLogout}
          accessibilityLabel="Sair da conta"
          accessibilityHint="Toque duas vezes para encerrar sua sessão"
        />
        <TouchableOpacity
          style={[styles.deactivateBtn, { marginTop: spacing.lg }]}
          onPress={() => {
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
                      router.replace('/(auth)/welcome');
                    } catch (e: unknown) {
                      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível desativar a conta.'));
                    }
                  },
                },
              ],
            );
          }}
          accessibilityRole="button"
          accessibilityLabel="Desativar conta e excluir meus dados"
          accessibilityHint="Toque duas vezes para desativar sua conta permanentemente. Esta ação não pode ser desfeita."
        >
          <Text style={[styles.deactivateText, { color: colors.textSecondary }]}>Desativar conta e excluir meus dados</Text>
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
