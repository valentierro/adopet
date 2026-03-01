import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, PrimaryButton, SecondaryButton, Toast } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { submitSatisfactionSurvey } from '../src/api/me';
import { getFriendlyErrorMessage } from '../src/utils/errorMessage';
import { spacing } from '../src/theme';

const PILLARS = [
  { key: 'trustScore' as const, label: 'Confiança no app', icon: 'shield-checkmark-outline' as const },
  { key: 'easeOfUseScore' as const, label: 'Facilidade de uso', icon: 'phone-portrait-outline' as const },
  { key: 'communicationScore' as const, label: 'Comunicação / clareza', icon: 'chatbubbles-outline' as const },
  { key: 'overallScore' as const, label: 'Satisfação geral', icon: 'heart-outline' as const },
];

export default function SurveyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ adoptionId?: string; role?: string }>();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [scores, setScores] = useState<Record<string, number>>({
    trustScore: 0,
    easeOfUseScore: 0,
    communicationScore: 0,
    overallScore: 0,
  });
  const [comment, setComment] = useState('');
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const updateScore = useCallback((key: string, value: number) => {
    setScores((prev) => ({ ...prev, [key]: value }));
  }, []);

  const mutation = useMutation({
    mutationFn: (payload: { scores: Record<string, number>; comment: string }) => {
      const role = (params.role === 'TUTOR' || params.role === 'ADOPTER' ? params.role : 'ADOPTER') as 'ADOPTER' | 'TUTOR';
      return submitSatisfactionSurvey({
        adoptionId: params.adoptionId?.trim() || undefined,
        role,
        trustScore: payload.scores.trustScore,
        easeOfUseScore: payload.scores.easeOfUseScore,
        communicationScore: payload.scores.communicationScore,
        overallScore: payload.scores.overallScore,
        comment: payload.comment.trim() || undefined,
      });
    },
    onSuccess: () => {
      setSummaryModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'adoptions'] });
      setToastMessage('Obrigado! Sua avaliação foi enviada e nos ajuda a melhorar o app.');
      router.back();
    },
    onError: (e: unknown) => {
      setToastMessage(getFriendlyErrorMessage(e, 'Não foi possível enviar. Tente novamente.'));
    },
  });

  const allFilled = PILLARS.every((p) => scores[p.key] >= 1 && scores[p.key] <= 5);
  const canSubmit = allFilled;

  return (
    <ScreenContainer scroll>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Pesquisa de satisfação</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Avalie sua experiência no app. Sua opinião nos ajuda a melhorar.
        </Text>

        {PILLARS.map(({ key, label, icon }) => (
          <View key={key} style={[styles.pillar, { backgroundColor: colors.surface, borderColor: colors.textSecondary + '30' }]}>
            <View style={styles.pillarHeader}>
              <Ionicons name={icon} size={22} color={colors.primary} />
              <Text style={[styles.pillarLabel, { color: colors.textPrimary }]}>{label}</Text>
            </View>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.starBtn,
                    { borderColor: colors.textSecondary + '50' },
                    scores[key] === n && { backgroundColor: colors.primary + '25', borderColor: colors.primary },
                  ]}
                  onPress={() => updateScore(key, n)}
                >
                  <Ionicons
                    name={scores[key] >= n ? 'star' : 'star-outline'}
                    size={28}
                    color={scores[key] >= n ? (colors.warning || '#eab308') : colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={[styles.commentWrap, { backgroundColor: colors.surface, borderColor: colors.textSecondary + '30' }]}>
          <Text style={[styles.commentLabel, { color: colors.textSecondary }]}>Comentário (opcional)</Text>
          <TextInput
            style={[styles.commentInput, { color: colors.textPrimary, borderColor: colors.textSecondary + '40' }]}
            placeholder="Algo que podemos melhorar?"
            placeholderTextColor={colors.textSecondary}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
            maxLength={500}
          />
        </View>

        <PrimaryButton
          title="Enviar avaliação"
          onPress={() => setSummaryModalVisible(true)}
          disabled={!canSubmit}
          style={styles.submitBtn}
        />

        <Modal visible={summaryModalVisible} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => !mutation.isPending && setSummaryModalVisible(false)}>
            <Pressable style={[styles.summaryModal, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
              <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>Resumo da avaliação</Text>
              <Text style={[styles.summarySubtitle, { color: colors.textSecondary }]}>Confira antes de enviar:</Text>
              <View style={styles.summaryScores}>
                {PILLARS.map(({ key, label }) => (
                  <View key={key} style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
                    <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{scores[key]}/5</Text>
                  </View>
                ))}
              </View>
              {comment.trim() ? (
                <View style={styles.summaryCommentWrap}>
                  <Text style={[styles.summaryCommentLabel, { color: colors.textSecondary }]}>Comentário:</Text>
                  <Text style={[styles.summaryCommentText, { color: colors.textPrimary }]} numberOfLines={4}>
                    {comment.trim()}
                  </Text>
                </View>
              ) : null}
              <View style={styles.summaryActions}>
                <SecondaryButton
                  title="Cancelar"
                  onPress={() => setSummaryModalVisible(false)}
                  disabled={mutation.isPending}
                  style={styles.summaryBtn}
                />
                <PrimaryButton
                  title={mutation.isPending ? 'Enviando...' : 'Enviar'}
                  onPress={() => mutation.mutate({ scores, comment })}
                  disabled={mutation.isPending}
                  style={styles.summaryBtn}
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>

      </ScrollView>
      <Toast message={toastMessage} onHide={() => setToastMessage(null)} duration={3000} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: 22, fontWeight: '800', marginBottom: spacing.sm },
  subtitle: { fontSize: 14, lineHeight: 22, marginBottom: spacing.lg },
  pillar: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  pillarHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  pillarLabel: { fontSize: 16, fontWeight: '600' },
  starsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  starBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  commentWrap: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  commentLabel: { fontSize: 13, marginBottom: spacing.sm },
  commentInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitBtn: { marginBottom: spacing.sm },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  summaryModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: spacing.lg,
  },
  summaryTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  summarySubtitle: { fontSize: 14, marginBottom: spacing.md },
  summaryScores: { marginBottom: spacing.md },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 15, fontWeight: '600' },
  summaryCommentWrap: {
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.3)',
  },
  summaryCommentLabel: { fontSize: 13, marginBottom: 4 },
  summaryCommentText: { fontSize: 14, lineHeight: 20 },
  summaryActions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
  summaryBtn: { flex: 1 },
});
