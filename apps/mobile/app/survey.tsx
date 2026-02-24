import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, PrimaryButton } from '../src/components';
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
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'adoptions'] });
      Alert.alert('Obrigado!', 'Sua avaliação foi enviada e nos ajuda a melhorar o app.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível enviar. Tente novamente.'));
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
          title={mutation.isPending ? 'Enviando...' : 'Enviar avaliação'}
          onPress={() => mutation.mutate({ scores, comment })}
          disabled={!canSubmit || mutation.isPending}
          style={styles.submitBtn}
        />
        {mutation.isPending && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </ScrollView>
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
  loadingWrap: { alignItems: 'center', padding: spacing.sm },
});
