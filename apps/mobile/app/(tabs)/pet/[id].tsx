import { useState, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
} from 'react-native';
import { Image } from 'expo-image';
import { ScreenContainer, PrimaryButton, SecondaryButton, StatusBadge, LoadingLogo, VerifiedBadge, TutorLevelBadge } from '../../../src/components';
import { useTheme } from '../../../src/hooks/useTheme';
import { useAuthStore } from '../../../src/stores/authStore';
import { getPetById } from '../../../src/api/pet';
import { addFavorite, removeFavorite, getFavorites } from '../../../src/api/favorites';
import { createConversation } from '../../../src/api/conversations';
import { createReport } from '../../../src/api/reports';
import { requestVerification, getVerificationStatus } from '../../../src/api/verification';
import { getFriendlyErrorMessage } from '../../../src/utils/errorMessage';
import { trackEvent } from '../../../src/analytics';
import { spacing } from '../../../src/theme';
import { Ionicons } from '@expo/vector-icons';

const REPORT_REASONS: { label: string; value: string }[] = [
  { label: 'Conteúdo inadequado', value: 'INAPPROPRIATE' },
  { label: 'Spam', value: 'SPAM' },
  { label: 'Informação falsa', value: 'MISLEADING' },
  { label: 'Outro', value: 'OTHER' },
];

const speciesLabel = { dog: 'Cachorro', cat: 'Gato' };
const sizeLabel = { small: 'Pequeno', medium: 'Médio', large: 'Grande', xlarge: 'Muito grande' };

function PetPhotoGallery({ photos }: { photos: string[] }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(Math.min(i, photos.length - 1));
  };
  if (photos.length === 0) return null;
  if (photos.length === 1) {
    return (
      <View style={styles.imageWrap}>
        <Image source={{ uri: photos[0] }} style={styles.image} contentFit="cover" />
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
        renderItem={({ item }) => (
          <View style={[styles.imageSlide, { width }]}>
            <Image source={{ uri: item }} style={styles.image} contentFit="cover" />
          </View>
        )}
      />
      <View style={styles.dots}>
        {photos.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

export default function PetDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const userId = useAuthStore((s) => s.user?.id);
  const { data: pet, isLoading, refetch: refetchPet } = useQuery({
    queryKey: ['pet', id],
    queryFn: () => getPetById(id!),
    enabled: !!id,
  });

  useFocusEffect(
    useCallback(() => {
      if (id) refetchPet();
    }, [id, refetchPet]),
  );
  const { data: favoritesData } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => getFavorites(),
  });
  const favorites = favoritesData?.items ?? [];
  const isFavorited = !!id && favorites.some((f) => f.petId === id);
  const addFavMutation = useMutation({
    mutationFn: () => addFavorite(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  });
  const removeFavMutation = useMutation({
    mutationFn: () => removeFavorite(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  });
  const reportMutation = useMutation({
    mutationFn: (reason: string) =>
      createReport({ targetType: 'PET', targetId: id!, reason, description: undefined }),
    onSuccess: () => {
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
  const requestPetVerification = useMutation({
    mutationFn: () => requestVerification({ type: 'PET_VERIFIED', petId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-status'] });
      queryClient.invalidateQueries({ queryKey: ['pet', id] });
    },
  });
  const isOwner = !!userId && !!pet && userId === pet.ownerId;
  const petVerificationRequest = verificationStatus?.requests?.find(
    (r) => r.type === 'PET_VERIFIED' && r.petId === id,
  );
  const canRequestPetVerification =
    isOwner && !pet?.verified && !petVerificationRequest && !requestPetVerification.isPending;
  const petVerificationFeedback =
    petVerificationRequest?.status === 'PENDING'
      ? 'Solicitação de verificação em análise'
      : petVerificationRequest?.status === 'REJECTED'
        ? 'Solicitação de verificação não aprovada'
        : null;

  const handleDenunciar = () => {
    Alert.alert(
      'Denunciar anúncio',
      'Selecione o motivo da denúncia:',
      [
        ...REPORT_REASONS.map((r) => ({
          text: r.label,
          onPress: () => reportMutation.mutate(r.value),
        })),
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const handleConversar = async () => {
    if (!isFavorited) {
      Alert.alert('Favoritar primeiro', 'Adicione aos favoritos para poder conversar com o tutor.');
      return;
    }
    try {
      const { id: convId } = await createConversation(id!);
      trackEvent({ name: 'open_chat', properties: { petId: id!, conversationId: convId } });
      router.push(`/chat/${convId}`);
    } catch (e: unknown) {
      Alert.alert('Conversar', getFriendlyErrorMessage(e, 'Não foi possível abrir a conversa. Tente novamente.'));
    }
  };

  const [tutorModalVisible, setTutorModalVisible] = useState(false);

  const handleCompartilhar = async () => {
    try {
      const url = `https://adopet.app/pet/${id}`;
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
    return (
      <ScreenContainer>
        <LoadingLogo size={160} />
      </ScreenContainer>
    );
  }

  const photos = pet.photos?.length ? pet.photos : ['https://placedog.net/400/400'];

  return (
    <ScreenContainer scroll>
      <PetPhotoGallery photos={photos} />
      <Text style={[styles.name, { color: colors.textPrimary }]}>{pet.name}</Text>
      <Text style={[styles.meta, { color: colors.textSecondary }]}>
        {speciesLabel[String(pet.species).toLowerCase()] ?? pet.species}
        {pet.breed ? ` • ${pet.breed}` : ''} • {pet.age} ano(s) • {sizeLabel[pet.size]} •{' '}
        {pet.sex === 'male' ? 'Macho' : 'Fêmea'}
      </Text>
      <View style={styles.badges}>
        {pet.verified && (
          <VerifiedBadge size={14} showLabel backgroundColor={colors.primary} />
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
      </View>
      {pet.partner && (
        <TouchableOpacity
          style={[styles.partnerBanner, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}
          onPress={() => router.push('/partners')}
          activeOpacity={0.8}
        >
          <Ionicons name={(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? 'star' : 'heart'} size={18} color={colors.primary} />
          <Text style={[styles.partnerBannerText, { color: colors.textPrimary }]}>
            Em parceria com {pet.partner.name}{(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? ' (destaque)' : ''}
          </Text>
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
            onPress={() => requestPetVerification.mutate()}
            disabled={requestPetVerification.isPending}
          />
          {requestPetVerification.isError && (
            <Text style={[styles.errorText, { color: colors.error }]}>
              {getFriendlyErrorMessage(requestPetVerification.error, 'Não foi possível enviar.')}
            </Text>
          )}
        </View>
      )}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Sobre</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>{pet.description}</Text>
      {pet.adoptionReason ? (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: spacing.lg }]}>Por que está doando?</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{pet.adoptionReason}</Text>
        </>
      ) : null}
      {pet.owner && !isOwner && (
        <>
          <TouchableOpacity
            style={[styles.ownerCard, { backgroundColor: colors.surface }]}
            onPress={() => setTutorModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.ownerRow}>
              {pet.owner.avatarUrl ? (
                <Image source={{ uri: pet.owner.avatarUrl }} style={styles.ownerAvatar} />
              ) : (
                <View style={[styles.ownerAvatarPlaceholder, { backgroundColor: colors.background }]}>
                  <Text style={[styles.ownerAvatarText, { color: colors.textSecondary }]}>
                    {pet.owner.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.ownerInfo}>
                <Text style={[styles.ownerLabel, { color: colors.textSecondary }]}>Tutor</Text>
                <View style={styles.ownerNameRow}>
                  <Text style={[styles.ownerName, { color: colors.textPrimary }]}>{pet.owner.name}</Text>
                  {pet.owner.verified && <VerifiedBadge size={20} showLabel backgroundColor={colors.primary} />}
                  {pet.owner.tutorStats && <TutorLevelBadge tutorStats={pet.owner.tutorStats} compact />}
                </View>
                <Text style={[styles.ownerPets, { color: colors.textSecondary }]}>
                  {pet.owner.petsCount} pet(s) no anúncio
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
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
                  <Image source={{ uri: pet.owner.avatarUrl }} style={styles.modalAvatar} />
                ) : (
                  <View style={[styles.modalAvatarPlaceholder, { backgroundColor: colors.background }]}>
                    <Text style={[styles.modalAvatarText, { color: colors.textSecondary }]}>
                      {pet.owner.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.modalNameRow}>
                  <Text style={[styles.modalName, { color: colors.textPrimary }]}>{pet.owner.name}</Text>
                  {pet.owner.verified && <VerifiedBadge size={20} showLabel backgroundColor={colors.primary} />}
                  {pet.owner.tutorStats && <TutorLevelBadge tutorStats={pet.owner.tutorStats} compact />}
                </View>
                <Text style={[styles.modalPets, { color: colors.textSecondary }]}>
                  {pet.owner.petsCount} pet(s) no anúncio
                </Text>
                <View style={styles.modalActions}>
                  <SecondaryButton
                    title="Ver perfil completo"
                    onPress={() => {
                      setTutorModalVisible(false);
                      router.push({ pathname: '/tutor-profile', params: { petId: id! } });
                    }}
                  />
                  <PrimaryButton
                    title="Conversar"
                    onPress={() => {
                      setTutorModalVisible(false);
                      handleConversar();
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
        {isFavorited ? (
          <>
            <PrimaryButton title="Conversar" onPress={handleConversar} />
            <SecondaryButton title="Remover dos favoritos" onPress={() => removeFavMutation.mutate()} />
          </>
        ) : (
          <PrimaryButton
            title="Adicionar aos favoritos"
            onPress={() => addFavMutation.mutate()}
            disabled={addFavMutation.isPending}
          />
        )}
        <TouchableOpacity onPress={handleCompartilhar} style={styles.shareLink}>
          <Ionicons name="share-outline" size={20} color={colors.primary} />
          <Text style={[styles.shareLinkText, { color: colors.primary }]}>Compartilhar anúncio</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDenunciar} disabled={reportMutation.isPending} style={styles.reportLink}>
          <Text style={[styles.reportLinkText, { color: colors.textSecondary }]}>
            {reportMutation.isPending ? 'Enviando...' : 'Denunciar este anúncio'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
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
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
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
  partnerBannerText: {
    flex: 1,
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
  verificationCta: {
    marginBottom: spacing.lg,
  },
  errorText: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  ownerCard: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
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
  ownerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  ownerPets: {
    fontSize: 13,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.lg,
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
  modalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.xs,
  },
  modalName: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalPets: {
    fontSize: 14,
    marginBottom: spacing.lg,
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
  loading: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
