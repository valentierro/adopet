import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, Pressable, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../src/hooks/useTheme';
import { getPendingAdoptionConfirmations, getMe } from '../../src/api/me';
import { confirmAdoption, declineAdoption } from '../../src/api/pets';
import { getFriendlyErrorMessage, isKycRequiredError } from '../../src/utils/errorMessage';
import { trackEvent } from '../../src/analytics';
import { ScreenContainer, EmptyState, StatusBadge, VerifiedBadge } from '../../src/components';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../../src/theme';

const speciesLabel: Record<string, string> = { dog: 'Cachorro', cat: 'Gato', DOG: 'Cachorro', CAT: 'Gato' };

/** Checklist obrigatório para o adotante antes de confirmar que realizou a adoção. */
const ADOPTER_CHECKLIST_ITEMS: { key: string; label: string }[] = [
  { key: 'care', label: 'Assumo a responsabilidade de cuidar do pet com zelo, oferecendo ambiente adequado, alimentação e cuidados veterinários.' },
  { key: 'noAbandon', label: 'Comprometo-me a não abandonar o animal e a não utilizá-lo para fins que impliquem maus-tratos ou crueldade.' },
  { key: 'contact', label: 'Estou ciente de que o doador ou o Adopet podem entrar em contato para acompanhar como o pet está e que responder é uma forma de demonstrar responsabilidade.' },
  { key: 'confirm', label: 'Confirmo que realizei a adoção e assumo todas as responsabilidades acima.' },
];

export default function AdoptionConfirmScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [checklistByPet, setChecklistByPet] = useState<Record<string, Record<string, boolean>>>({});
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [declineConfirmPetId, setDeclineConfirmPetId] = useState<string | null>(null);
  const [declineMessage, setDeclineMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['me', 'pending-adoption-confirmations'],
    queryFn: getPendingAdoptionConfirmations,
  });
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe });
  const items = data?.items ?? [];
  const isPartner = me?.isPartner === true;
  const needsKyc = items.length > 0 && me?.kycStatus !== 'VERIFIED' && !isPartner;

  const toggleChecklistItem = (petId: string, key: string) => {
    setChecklistByPet((prev) => ({
      ...prev,
      [petId]: {
        ...(prev[petId] ?? {}),
        [key]: !(prev[petId]?.[key] ?? false),
      },
    }));
  };

  const isChecklistComplete = (petId: string) =>
    ADOPTER_CHECKLIST_ITEMS.every((item) => checklistByPet[petId]?.[item.key] === true);

  const declineMutation = useMutation({
    mutationFn: (petId: string) => declineAdoption(petId),
    onSuccess: async (_, petId) => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['me', 'pending-adoption-confirmations'] }),
        queryClient.refetchQueries({ queryKey: ['conversations'] }),
        queryClient.refetchQueries({
          predicate: (q) => q.queryKey[0] === 'me' && q.queryKey[1] === 'adoptions',
        }),
        queryClient.refetchQueries({ queryKey: ['me', 'tutor-stats'] }),
      ]);
      if (Platform.OS === 'web') {
        setDeclineMessage({ type: 'success', text: 'O pet voltou a ficar disponível. O tutor foi notificado.' });
      } else {
        Alert.alert('Você desistiu', 'O pet voltou a ficar disponível. O tutor foi notificado.');
      }
    },
    onError: (e: unknown) => {
      const msg = getFriendlyErrorMessage(e, 'Não foi possível desistir. Tente novamente.');
      if (Platform.OS === 'web') {
        setDeclineMessage({ type: 'error', text: msg });
      } else {
        Alert.alert('Erro', msg);
      }
    },
  });

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
      setShowThankYouModal(true);
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
    <>
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
                {item.verified === true && <VerifiedBadge variant="pet" size={14} iconBackgroundColor={colors.primary} />}
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
            <Text style={[styles.termLabel, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
              Marque todos os itens para confirmar que realizou a adoção:
            </Text>
            {ADOPTER_CHECKLIST_ITEMS.map((checkItem) => (
              <TouchableOpacity
                key={checkItem.key}
                style={styles.termRow}
                onPress={() => toggleChecklistItem(item.petId, checkItem.key)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    checklistByPet[item.petId]?.[checkItem.key] && { backgroundColor: colors.primary },
                  ]}
                >
                  {checklistByPet[item.petId]?.[checkItem.key] && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </View>
                <Text style={[styles.termText, { color: colors.textSecondary, flex: 1 }]}>{checkItem.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: colors.primary },
                !isChecklistComplete(item.petId) && { opacity: 0.6 },
              ]}
              onPress={() => {
                if (!isChecklistComplete(item.petId)) {
                  Alert.alert(
                    'Checklist obrigatório',
                    'Marque todos os itens da lista antes de confirmar a adoção.',
                  );
                  return;
                }
                confirmMutation.mutate({ petId: item.petId, responsibilityTermAccepted: true });
              }}
              disabled={
                (confirmMutation.isPending && confirmMutation.variables?.petId === item.petId) ||
                (declineMutation.isPending && declineMutation.variables === item.petId) ||
                !isChecklistComplete(item.petId)
              }
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
            <TouchableOpacity
              style={[styles.declineBtn, { borderColor: (colors.error || '#dc2626') + '80' }]}
              onPress={() => setDeclineConfirmPetId(item.petId)}
              disabled={
                (confirmMutation.isPending && confirmMutation.variables?.petId === item.petId) ||
                (declineMutation.isPending && declineMutation.variables === item.petId)
              }
            >
              {declineMutation.isPending && declineMutation.variables === item.petId ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={18} color={colors.error || '#dc2626'} />
                  <Text style={[styles.declineBtnText, { color: colors.error || '#dc2626' }]}>Desistir</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>

    <Modal visible={showThankYouModal} transparent animationType="fade">
      <Pressable style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={() => setShowThankYouModal(false)}>
        <Pressable style={[styles.thankYouModal, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.thankYouIconWrap, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="heart" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.thankYouTitle, { color: colors.textPrimary }]}>Obrigado! Adoção confirmada</Text>
          <Text style={[styles.thankYouText, { color: colors.textSecondary }]}>
            Sua confirmação foi registrada com sucesso. A adoção seguirá para validação da equipe Adopet.
            {'\n\n'}
            Isso não atrapalha o processo: você pode seguir o combinado com o tutor para concretizar a adoção (encontro, entrega do pet, etc.).
          </Text>
          <TouchableOpacity
            style={[styles.thankYouBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowThankYouModal(false)}
            activeOpacity={0.8}
          >
            <Text style={styles.thankYouBtnText}>Entendi</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>

    <Modal visible={declineConfirmPetId != null} transparent animationType="fade">
      <Pressable style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={() => setDeclineConfirmPetId(null)}>
        <Pressable style={[styles.thankYouModal, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.thankYouTitle, { color: colors.textPrimary, marginBottom: spacing.sm }]}>Desistir da adoção</Text>
          <Text style={[styles.thankYouText, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
            O pet voltará a ficar disponível e o tutor será notificado. Deseja continuar?
          </Text>
          <View style={styles.declineModalActions}>
            <TouchableOpacity
              style={[styles.declineModalBtn, { borderColor: colors.textSecondary + '80' }]}
              onPress={() => setDeclineConfirmPetId(null)}
              disabled={declineMutation.isPending}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Não</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.declineModalBtn, { backgroundColor: colors.error || '#dc2626', borderWidth: 0 }]}
              onPress={() => {
                if (declineConfirmPetId) {
                  declineMutation.mutate(declineConfirmPetId);
                  setDeclineConfirmPetId(null);
                }
              }}
              disabled={declineMutation.isPending}
            >
              {declineMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '600' }}>Sim, desistir</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>

    {Platform.OS === 'web' && declineMessage && (
      <Modal visible transparent animationType="fade">
        <Pressable style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={() => setDeclineMessage(null)}>
          <Pressable style={[styles.thankYouModal, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.thankYouTitle, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
              {declineMessage.type === 'success' ? 'Você desistiu' : 'Erro'}
            </Text>
            <Text style={[styles.thankYouText, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
              {declineMessage.text}
            </Text>
            <TouchableOpacity
              style={[styles.thankYouBtn, { backgroundColor: colors.primary }]}
              onPress={() => setDeclineMessage(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.thankYouBtnText}>OK</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    )}
    </>
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
  termText: { fontSize: 12, lineHeight: 20 },
  termRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
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
  cardActions: { gap: spacing.sm, marginTop: spacing.xs },
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
  declineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    borderWidth: 2,
  },
  declineBtnText: { fontSize: 15, fontWeight: '600' },
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
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  thankYouModal: { width: '100%', maxWidth: 340, borderRadius: 16, padding: spacing.xl, alignItems: 'center' },
  thankYouIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  thankYouTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: spacing.md },
  thankYouText: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: spacing.lg },
  thankYouBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: 12, alignSelf: 'stretch', alignItems: 'center' },
  thankYouBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  declineModalActions: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch', marginTop: spacing.sm },
  declineModalBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
