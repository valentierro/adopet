import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, PrimaryButton } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { createPartnerRecommendation } from '../../src/api/partner-recommendations';
import { getFriendlyErrorMessage } from '../../src/utils/errorMessage';
import { spacing } from '../../src/theme';

const TYPE_OPTIONS: { value: 'ONG' | 'CLINIC' | 'STORE'; label: string }[] = [
  { value: 'ONG', label: 'ONG ou instituição' },
  { value: 'CLINIC', label: 'Clínica veterinária' },
  { value: 'STORE', label: 'Pet shop ou loja' },
];

export default function IndiqueParceiroScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [suggestedName, setSuggestedName] = useState('');
  const [suggestedType, setSuggestedType] = useState<'ONG' | 'CLINIC' | 'STORE'>('ONG');
  const [suggestedCity, setSuggestedCity] = useState('');
  const [suggestedEmail, setSuggestedEmail] = useState('');
  const [suggestedPhone, setSuggestedPhone] = useState('');
  const [message, setMessage] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      createPartnerRecommendation({
        suggestedName: suggestedName.trim(),
        suggestedType,
        suggestedCity: suggestedCity.trim() || undefined,
        suggestedEmail: suggestedEmail.trim() || undefined,
        suggestedPhone: suggestedPhone.trim() || undefined,
        message: message.trim() || undefined,
      }),
    onSuccess: () => {
      Alert.alert(
        'Indicação enviada',
        'Obrigado! Nossa equipe entrará em contato com o indicado quando for possível.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível enviar a indicação.'));
    },
  });

  const canSubmit = suggestedName.trim().length >= 2;

  const handleSubmit = () => {
    if (!canSubmit) {
      Alert.alert('Preencha o nome', 'Informe o nome do estabelecimento ou ONG que deseja indicar (mín. 2 caracteres).');
      return;
    }
    mutation.mutate();
  };

  return (
    <ScreenContainer scroll={false}>
      <KeyboardAvoidingView
        style={styles.wrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.intro, { color: colors.textSecondary }]}>
            Conhece uma ONG, clínica ou loja que poderia ser parceira do Adopet? Envie a indicação e nossa equipe poderá entrar em contato.
          </Text>

          <Text style={[styles.label, { color: colors.textSecondary }]}>Nome do estabelecimento ou ONG *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.textSecondary + '40' }]}
            placeholder="Ex.: Clínica Amigo Fiel"
            placeholderTextColor={colors.textSecondary}
            value={suggestedName}
            onChangeText={setSuggestedName}
            maxLength={200}
            autoCapitalize="words"
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Tipo *</Text>
          <View style={styles.chipRow}>
            {TYPE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, { backgroundColor: suggestedType === opt.value ? colors.primary : colors.surface }]}
                onPress={() => setSuggestedType(opt.value)}
              >
                <Text style={[styles.chipText, { color: suggestedType === opt.value ? '#fff' : colors.textPrimary }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>Cidade (opcional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.textSecondary + '40' }]}
            placeholder="Ex.: São Paulo"
            placeholderTextColor={colors.textSecondary}
            value={suggestedCity}
            onChangeText={setSuggestedCity}
            maxLength={100}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>E-mail de contato do indicado (opcional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.textSecondary + '40' }]}
            placeholder="contato@estabelecimento.com"
            placeholderTextColor={colors.textSecondary}
            value={suggestedEmail}
            onChangeText={setSuggestedEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            maxLength={200}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Telefone de contato (opcional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.textSecondary + '40' }]}
            placeholder="(11) 99999-9999"
            placeholderTextColor={colors.textSecondary}
            value={suggestedPhone}
            onChangeText={setSuggestedPhone}
            keyboardType="phone-pad"
            maxLength={30}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Comentário ou motivo da indicação (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.textSecondary + '40' }]}
            placeholder="Ex.: Conheço o trabalho deles e acho que combinaria com o Adopet..."
            placeholderTextColor={colors.textSecondary}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            maxLength={1000}
          />

          <PrimaryButton
            title={mutation.isPending ? 'Enviando...' : 'Enviar indicação'}
            onPress={handleSubmit}
            disabled={!canSubmit || mutation.isPending}
            style={styles.submitBtn}
          />
          {mutation.isPending && (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  intro: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  chipText: { fontSize: 14, fontWeight: '500' },
  submitBtn: { marginTop: spacing.xl },
  loaderWrap: { marginTop: spacing.sm, alignItems: 'center' },
});
