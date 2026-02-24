import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, PrimaryButton, PageIntro, ProfileMenuFooter } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { createBugReport } from '../src/api/bugReports';
import { getFriendlyErrorMessage } from '../src/utils/errorMessage';
import { getLastRoute } from '../src/utils/lastRoute';
import { spacing } from '../src/theme';


type ReportType = 'BUG' | 'SUGGESTION';

export default function BugReportSuggestionScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [type, setType] = useState<ReportType>('BUG');
  const [content, setContent] = useState('');
  const [screenContext, setScreenContext] = useState(getLastRoute() || '');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      Alert.alert(
        type === 'BUG' ? 'Descreva o bug' : 'Conte sua sugestão',
        type === 'BUG'
          ? 'Descreva o que aconteceu para podermos investigar.'
          : 'Escreva sua sugestão antes de enviar.',
      );
      return;
    }
    setSending(true);
    try {
      const messageMax = trimmed.length > 2000 ? trimmed.slice(0, 1997) + '…' : trimmed;
      await createBugReport({
        type,
        message: messageMax,
        userComment: trimmed,
        ...(type === 'BUG' && screenContext.trim() ? { screen: screenContext.trim() } : {}),
      });
      setSent(true);
    } catch (e: unknown) {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível enviar. Tente novamente.'));
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <ScreenContainer scroll>
        <PageIntro
          title={type === 'BUG' ? 'Reporte enviado' : 'Sugestão enviada'}
          subtitle={
            type === 'BUG'
              ? 'Obrigado! Nossa equipe vai analisar o bug e trabalhar para corrigi-lo.'
              : 'Obrigado pela sua sugestão! Levaremos em consideração para melhorar o app.'
          }
        />
        <PrimaryButton title="Voltar às configurações" onPress={() => router.back()} />
        <ProfileMenuFooter />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <PageIntro
          title="Bug report / Sugestões"
          subtitle="Envie um reporte de bug ou uma sugestão para melhorarmos o app. Tudo é enviado para contato@appadopet.com.br."
        />
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[
              styles.typeBtn,
              { borderColor: colors.primary, backgroundColor: type === 'BUG' ? colors.primary + '20' : 'transparent' },
            ]}
            onPress={() => setType('BUG')}
          >
            <Ionicons name="bug-outline" size={20} color={type === 'BUG' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.typeBtnText, { color: type === 'BUG' ? colors.primary : colors.textSecondary }]}>
              Reportar bug
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeBtn,
              { borderColor: colors.primary, backgroundColor: type === 'SUGGESTION' ? colors.primary + '20' : 'transparent' },
            ]}
            onPress={() => setType('SUGGESTION')}
          >
            <Ionicons name="bulb-outline" size={20} color={type === 'SUGGESTION' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.typeBtnText, { color: type === 'SUGGESTION' ? colors.primary : colors.textSecondary }]}>
              Sugestão
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {type === 'BUG' ? 'O que aconteceu? Descreva o bug (obrigatório)' : 'Conte sua sugestão (obrigatório)'}
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
          placeholder={type === 'BUG' ? 'Ex.: ao clicar em X a tela ficou em branco...' : 'Ex.: seria útil ter um filtro por idade do pet...'}
          placeholderTextColor={colors.textSecondary}
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={4}
          maxLength={2000}
          editable={!sending}
        />
        {type === 'BUG' && (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Tela/contexto (opcional)</Text>
            <TextInput
              style={[styles.input, styles.inputShort, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
              placeholder="Ex.: feed, perfil, pet/123"
              placeholderTextColor={colors.textSecondary}
              value={screenContext}
              onChangeText={setScreenContext}
              editable={!sending}
            />
          </>
        )}
        <PrimaryButton
          title={sending ? 'Enviando...' : type === 'BUG' ? 'Enviar reporte' : 'Enviar sugestão'}
          onPress={handleSubmit}
          disabled={sending}
          style={{ marginTop: spacing.md }}
        />
      </KeyboardAvoidingView>
      <ProfileMenuFooter />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  inputShort: {
    minHeight: undefined,
    marginBottom: spacing.lg,
  },
});
