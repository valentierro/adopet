import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../src/hooks/useTheme';
import { getPendingAdoptionConfirmations, getMe } from '../../src/api/me';
import { confirmAdoption } from '../../src/api/pets';
import { getFriendlyErrorMessage, isKycRequiredError } from '../../src/utils/errorMessage';
import { trackEvent } from '../../src/analytics';
import { ScreenContainer, EmptyState, StatusBadge, VerifiedBadge } from '../../src/components';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../../src/theme';

const speciesLabel: Record<string, string> = { dog: 'Cachorro', cat: 'Gato', DOG: 'Cachorro', CAT: 'Gato' };

const RESPONSIBILITY_TERM = `Ao confirmar, você declara que:
• Assume a responsabilidade de cuidar do pet com zelo, oferecendo ambiente adequado, alimentação, cuidados veterinários e bem-estar.
• Compromete-se a não abandonar o animal e a não utilizá-lo para fins que impliquem maus-tratos ou crueldade.
• Sabe que o doador ou o Adopet podem entrar em contato para acompanhar como o pet está e que responder é uma forma de demonstrar responsabilidade.`;

export default function AdoptionConfirmScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [termAcceptedPetIds, setTermAcceptedPetIds] = useState<Set<string>>(new Set());
  const { data, isLoading } = useQuery({
    queryKey: ['me', 'pending-adoption-confirmations'],
    queryFn: getPendingAdoptionConfirmations,
  });
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe });
  const items = data?.items ?? [];
  const needsKyc = items.length > 0 && me?.kycStatus !== 'VERIFIED';

  const toggleTermForPet = (petId: string) => {
    setTermAcceptedPetIds((prev) => {
      const next = new Set(prev);
      if (next.has(petId)) next.delete(petId);
      else next.add(petId);
      return next;
    });
  };

  const confirmMutation = useMutation({
    mutationFn: ({ petId, responsibilityTermAccepted }: { petId: string; responsibilityTermAccepted: boolean }) =>
      confirmAdoption(petId, { responsibilityTermAccepted }),
    onSuccess: async (_, { petId }) => {
      trackEvent({ name: 'adoption_confirmed', properties: { petId } });
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['me', 'pending-adoption-confirmations'] }),
        queryClient.refetchQueries({ queryKey: ['conversations'] }),
        queryClient.refetchQueries({
          predicate: (q) => q.queryKey[0] === 'me' && q.queryKey[1] === 'adoptions',
        }),
        queryClient.refetchQueries({ queryKey: ['me', 'tutor-stats'] }),
      ]);
      Alert.alert('Adoção confirmada', 'Sua confirmação foi registrada. A adoção seguirá para validação do Adopet.');
    },
    onError: (e: unknown) => {
      if (isKycRequiredError(e)) {
        Alert.alert(
          'Verificação necessária',
          'Para confirmar a adoção é preciso completar a verificação de identidade (KYC).',
          [
            { text: 'Fazer verificação', onPress: () => router.push('/kyc') },
            { text: 'Depois' },
          ],
        );
        return;
      }
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível confirmar. Tente novamente.'));
    },
  });

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (items.length === 0) {
    return (
      <ScreenContainer scroll>
        <EmptyState
          title="Nenhuma confirmação pendente"
          message="Quando um tutor indicar você como adotante de um pet, você poderá confirmar aqui ou na conversa com o tutor."
          icon={<Ionicons name="checkmark-done-outline" size={56} color={colors.textSecondary} />}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScrollView style={[styles.scroll, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Confirmar adoção</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        O tutor indicou você como adotante. Leia o termo de responsabilidade e confirme abaixo.
      </Text>
      {needsKyc && (
        <TouchableOpacity
          style={[styles.kycBanner, { backgroundColor: (colors.warning || '#d97706') + '22', borderColor: (colors.warning || '#d97706') + '60' }]}
          onPress={() => router.push('/kyc')}
          activeOpacity={0.8}
        >
          <Ionicons name="shield-checkmark-outline" size={24} color={colors.warning || '#d97706'} />
          <View style={styles.kycBannerText}>
            <Text style={[styles.kycBannerTitle, { color: colors.textPrimary }]}>Verificação de identidade</Text>
            <Text style={[styles.kycBannerSub, { color: colors.textSecondary }]}>
              Complete a verificação para poder confirmar adoções.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
      {items.map((item) => (
        <View key={item.petId} style={[styles.card, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.cardRow}
            onPress={() => router.push(`/pet/${item.petId}`)}
            activeOpacity={0.7}
          >
            {item.photos[0] ? (
              <Image source={{ uri: item.photos[0] }} style={styles.thumb} contentFit="cover" />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: colors.background }]}>
                <Ionicons name="paw" size={32} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.cardInfo}>
              <View style={styles.petNameRow}>
                <Text style={[styles.petName, { color: colors.textPrimary }]}>{item.petName}</Text>
                {item.verified === true && <VerifiedBadge size={14} iconBackgroundColor={colors.primary} />}
              </View>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>
                {speciesLabel[item.species] ?? item.species}
                {item.breed ? ` · ${item.breed}` : ''} · {item.age} ano(s)
              </Text>
              <Text style={[styles.tutor, { color: colors.textSecondary }]}>Tutor: {item.tutorName}</Text>
              {(item.partner != null || item.vaccinated !== undefined || item.neutered !== undefined) && (
                <View style={styles.badgesRow}>
                  {item.partner != null && (
                    <View style={[styles.partnerBadge, { backgroundColor: item.partner?.isPaidPartner ? (colors.warning || '#d97706') + '30' : (colors.primary + '25') }]}>
                      <Ionicons name={item.partner?.isPaidPartner ? 'star' : 'heart'} size={10} color={item.partner?.isPaidPartner ? (colors.warning || '#d97706') : colors.primary} />
                      <Text style={[styles.partnerBadgeText, { color: item.partner?.isPaidPartner ? (colors.warning || '#d97706') : colors.primary }]}>
                        {item.partner?.isPaidPartner ? 'Patrocinado' : 'Parceiro'}
                      </Text>
                    </View>
                  )}
                  {item.vaccinated !== undefined && (
                    <StatusBadge label={item.vaccinated ? 'Vacinado' : 'Não vacinado'} variant={item.vaccinated ? 'success' : 'warning'} />
                  )}
                  {item.neutered !== undefined && (
                    <StatusBadge label={item.neutered ? 'Castrado' : 'Não castrado'} variant={item.neutered ? 'success' : 'warning'} />
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>
          <View style={[styles.termBlock, { backgroundColor: colors.background + 'cc', borderColor: colors.primary + '40' }]}>
            <Text style={[styles.termText, { color: colors.textSecondary }]}>{RESPONSIBILITY_TERM}</Text>
            <TouchableOpacity
              style={styles.termRow}
              onPress={() => toggleTermForPet(item.petId)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, termAcceptedPetIds.has(item.petId) && { backgroundColor: colors.primary }]}>
                {termAcceptedPetIds.has(item.petId) && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <Text style={[styles.termLabel, { color: colors.textPrimary }]}>Li e aceito o termo de responsabilidade</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              { backgroundColor: colors.primary },
              !termAcceptedPetIds.has(item.petId) && { opacity: 0.6 },
            ]}
            onPress={() => {
              if (!termAcceptedPetIds.has(item.petId)) {
                Alert.alert('Termo obrigatório', 'Leia e aceite o termo de responsabilidade para confirmar a adoção.');
                return;
              }
              confirmMutation.mutate({ petId: item.petId, responsibilityTermAccepted: true });
            }}
            disabled={(confirmMutation.isPending && confirmMutation.variables?.petId === item.petId) || !termAcceptedPetIds.has(item.petId)}
          >
            {confirmMutation.isPending && confirmMutation.variables?.petId === item.petId ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.confirmBtnText}>Confirmar que fui eu quem adotou</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: spacing.xs },
  subtitle: { fontSize: 14, marginBottom: spacing.lg },
  card: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardRow: { flexDirection: 'row', marginBottom: spacing.md },
  thumb: { width: 72, height: 72, borderRadius: 10 },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, marginLeft: spacing.md, justifyContent: 'center', minWidth: 0 },
  petNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  petName: { fontSize: 16, fontWeight: '600', flex: 1 },
  meta: { fontSize: 13, marginBottom: 2 },
  tutor: { fontSize: 12, marginBottom: 6 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  partnerBadgeText: { fontSize: 10, fontWeight: '600' },
  termBlock: {
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  termText: { fontSize: 12, lineHeight: 20, marginBottom: spacing.sm },
  termRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  termLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
  },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  kycBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  kycBannerText: { flex: 1, marginLeft: spacing.sm },
  kycBannerTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  kycBannerSub: { fontSize: 12 },
});
