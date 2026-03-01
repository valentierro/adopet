import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, PrimaryButton, LoadingLogo, Toast, MatchScoreBadge } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { getAdoptionRequestForm, submitAdoptionForm } from '../../src/api/adoption-requests';
import { getFriendlyErrorMessage } from '../../src/utils/errorMessage';
import { spacing } from '../../src/theme';

type FormQuestion = {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string | null;
  options?: Array<{ value: string; label: string }>;
};

export default function AdoptionFormFillScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [answers, setAnswers] = useState<Record<string, string | string[] | boolean>>({});
  const [consent, setConsent] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<{
    matchScore?: number | null;
    petName?: string;
  } | null>(null);

  const { data: formData, isLoading } = useQuery({
    queryKey: ['adoption-form', requestId],
    queryFn: () => getAdoptionRequestForm(requestId!),
    enabled: !!requestId,
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      submitAdoptionForm(requestId!, {
        answers: answers as Record<string, unknown>,
        consentAt: new Date().toISOString(),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['adoption-form', requestId] });
      queryClient.invalidateQueries({ queryKey: ['my-adoption-requests'] });
      queryClient.invalidateQueries({ queryKey: ['conversation'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      if (data.conversationId) {
        queryClient.invalidateQueries({ queryKey: ['conversation', data.conversationId] });
        queryClient.invalidateQueries({ queryKey: ['messages', data.conversationId] });
      }
      setSubmittedResult({
        matchScore: data.submission?.matchScore ?? null,
        petName: data.pet?.name,
      });
      setSubmitSuccess(true);
    },
    onError: (e: unknown) => {
      setToastMessage(getFriendlyErrorMessage(e, 'Não foi possível enviar. Tente novamente.'));
    },
  });

  const updateAnswer = useCallback((questionId: string, value: string | string[] | boolean) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const toggleSelectMultiple = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => {
      const current = (prev[questionId] as string[] | undefined) ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [questionId]: next };
    });
  }, []);

  const handleSubmit = useCallback(() => {
    if (!formData?.template.questions) return;
    const missing = formData.template.questions.filter(
      (q) => q.required && (answers[q.id] === undefined || answers[q.id] === '' || (Array.isArray(answers[q.id]) && (answers[q.id] as string[]).length === 0)),
    );
    if (missing.length > 0) {
      setToastMessage('Preencha todos os campos obrigatórios.');
      return;
    }
    if (!consent) {
      setToastMessage('Aceite o uso dos dados para continuar.');
      return;
    }
    submitMutation.mutate();
  }, [formData, answers, consent, submitMutation]);

  const renderQuestion = (q: FormQuestion) => {
    const value = answers[q.id];
    const baseInputStyle = [
      styles.input,
      { backgroundColor: colors.surface, borderColor: colors.primary + '40', color: colors.textPrimary },
    ];

    switch (q.type) {
      case 'TEXT':
      case 'NUMBER':
        return (
          <TextInput
            key={q.id}
            style={baseInputStyle}
            placeholder={q.placeholder ?? ''}
            placeholderTextColor={colors.textSecondary}
            value={(value as string) ?? ''}
            onChangeText={(v) => updateAnswer(q.id, v)}
            keyboardType={q.type === 'NUMBER' ? 'numeric' : 'default'}
          />
        );
      case 'TEXTAREA':
        return (
          <TextInput
            key={q.id}
            style={[baseInputStyle, styles.textArea]}
            placeholder={q.placeholder ?? ''}
            placeholderTextColor={colors.textSecondary}
            value={(value as string) ?? ''}
            onChangeText={(v) => updateAnswer(q.id, v)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        );
      case 'CHECKBOX':
        return (
          <View key={q.id} style={styles.checkboxRow}>
            <Switch
              value={!!value}
              onValueChange={(v) => updateAnswer(q.id, v)}
              trackColor={{ false: colors.textSecondary + '40', true: colors.primary + '80' }}
              thumbColor={value ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.checkboxLabel, { color: colors.textPrimary }]}>Sim</Text>
          </View>
        );
      case 'SELECT_SINGLE':
        return (
          <View key={q.id} style={styles.optionsWrap}>
            {(q.options ?? []).map((opt: { value: string; label: string }) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.optionBtn,
                  { borderColor: value === opt.value ? colors.primary : colors.textSecondary + '50' },
                  value === opt.value && { backgroundColor: colors.primary + '15' },
                ]}
                onPress={() => updateAnswer(q.id, opt.value)}
              >
                <Text style={[styles.optionText, { color: colors.textPrimary }]}>{opt.label}</Text>
                {value === opt.value && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </Pressable>
            ))}
          </View>
        );
      case 'SELECT_MULTIPLE':
        return (
          <View key={q.id} style={styles.optionsWrap}>
            {(q.options ?? []).map((opt: { value: string; label: string }) => {
              const arr = (value as string[] | undefined) ?? [];
              const checked = arr.includes(opt.value);
              return (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.optionBtn,
                    { borderColor: checked ? colors.primary : colors.textSecondary + '50' },
                    checked && { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => toggleSelectMultiple(q.id, opt.value)}
                >
                  <Text style={[styles.optionText, { color: colors.textPrimary }]}>{opt.label}</Text>
                  {checked && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                </Pressable>
              );
            })}
          </View>
        );
      case 'DATE':
        return (
          <TextInput
            key={q.id}
            style={baseInputStyle}
            placeholder={q.placeholder ?? 'AAAA-MM-DD'}
            placeholderTextColor={colors.textSecondary}
            value={(value as string) ?? ''}
            onChangeText={(v) => updateAnswer(q.id, v)}
          />
        );
      case 'FILE':
        return (
          <View key={q.id} style={[styles.fileHint, { backgroundColor: colors.primary + '12' }]}>
            <Ionicons name="document-attach-outline" size={24} color={colors.primary} />
            <Text style={[styles.fileHintText, { color: colors.textSecondary }]}>
              Envie o arquivo por mensagem no chat após preencher o formulário.
            </Text>
          </View>
        );
      default:
        return (
          <TextInput
            key={q.id}
            style={baseInputStyle}
            placeholder={q.placeholder ?? ''}
            placeholderTextColor={colors.textSecondary}
            value={(value as string) ?? ''}
            onChangeText={(v) => updateAnswer(q.id, v)}
          />
        );
    }
  };

  if (isLoading || !formData) {
    return (
      <ScreenContainer>
        <LoadingLogo size={100} />
      </ScreenContainer>
    );
  }

  const questions = (formData.template.questions ?? []) as FormQuestion[];

  if (submitSuccess && submittedResult) {
    return (
      <ScreenContainer scroll>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Formulário enviado!</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
            A ONG irá analisar sua solicitação e retornar em breve.
            {submittedResult.petName ? ` O pet ${submittedResult.petName} aguarda análise.` : ''}
          </Text>
          {submittedResult.matchScore != null && (
            <View style={[styles.matchScoreSection, { backgroundColor: colors.primary + '12' }]}>
              <Text style={[styles.matchScoreLabel, { color: colors.textSecondary }]}>
                Sua compatibilidade com o formulário
              </Text>
              <MatchScoreBadge
                data={{
                  score: submittedResult.matchScore,
                  highlights: [],
                  concerns: [],
                  criteriaCount: 1,
                }}
                contextLabel="com o formulário"
              />
            </View>
          )}
          <PrimaryButton
            title="Voltar"
            onPress={() => router.back()}
            style={styles.submitBtn}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{formData.template.name}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Preencha os campos abaixo. As informações serão enviadas para a ONG analisar sua solicitação de adoção.
        </Text>
        {formData.expiresAt && (
          <View style={[styles.expiresHint, { backgroundColor: colors.primary + '12' }]}>
            <Ionicons name="time-outline" size={18} color={colors.primary} />
            <Text style={[styles.expiresText, { color: colors.textSecondary }]}>
              Prazo para preencher: até {new Date(formData.expiresAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </Text>
          </View>
        )}

        {questions.map((q) => (
          <View key={q.id} style={styles.questionBlock}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {q.label} {q.required ? '*' : ''}
            </Text>
            {renderQuestion(q)}
          </View>
        ))}

        <View style={[styles.consentWrap, { backgroundColor: colors.primary + '0c' }]}>
          <Switch
            value={consent}
            onValueChange={setConsent}
            trackColor={{ false: colors.textSecondary + '40', true: colors.primary + '80' }}
            thumbColor={consent ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.consentText, { color: colors.textPrimary }]}>
            Li e aceito o uso dos meus dados apenas para análise da solicitação de adoção pela ONG, em conformidade com a LGPD.
          </Text>
        </View>

        <PrimaryButton
          title={submitMutation.isPending ? 'Enviando...' : 'Enviar formulário'}
          onPress={handleSubmit}
          disabled={submitMutation.isPending}
          style={styles.submitBtn}
        />
      </View>
      <Toast
        message={toastMessage}
        duration={2000}
        onHide={() => setToastMessage(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
  },
  title: { fontSize: 20, fontWeight: '700', marginBottom: spacing.sm },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: spacing.sm },
  expiresHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.xl,
  },
  expiresText: { fontSize: 13, flex: 1 },
  questionBlock: { marginBottom: spacing.lg },
  label: { fontSize: 15, fontWeight: '600', marginBottom: spacing.xs },
  input: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  textArea: { minHeight: 100, paddingTop: spacing.md },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkboxLabel: { flex: 1, fontSize: 15 },
  optionsWrap: { gap: spacing.sm },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionText: { fontSize: 15 },
  fileHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
  },
  fileHintText: { flex: 1, fontSize: 14 },
  consentWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.xl,
  },
  consentText: { flex: 1, fontSize: 13, lineHeight: 20 },
  submitBtn: { width: '100%' },
  successIconWrap: { alignItems: 'center', marginBottom: spacing.md },
  matchScoreSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
  },
  matchScoreLabel: { fontSize: 14, marginBottom: spacing.sm },
});
