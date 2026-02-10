import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { spacing } from '../theme';

const LogoLight = require('../../assets/brand/logo/logo_horizontal_light.png');
const LogoDark = require('../../assets/brand/logo/logo_dark.png');

type Props = {
  errorMessage: string;
  stack?: string | null;
  onReport: (payload: { message: string; stack?: string; screen?: string; userComment?: string }) => Promise<void>;
  onRetry?: () => void;
};

export function ErrorFallbackScreen({ errorMessage, stack, onReport, onRetry }: Props) {
  const { colors, isDark } = useTheme();
  const [userComment, setUserComment] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReport = async () => {
    if (sending || sent) return;
    setSending(true);
    try {
      await onReport({
        message: errorMessage,
        stack: stack ?? undefined,
        userComment: userComment.trim() || undefined,
      });
      setSent(true);
    } catch {
      setSending(false);
    }
    setSending(false);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={isDark ? LogoDark : LogoLight}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Ops! Algo deu errado
        </Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          Aconteceu um erro inesperado no app. Pode ser um bug nosso — e a sua ajuda
          faz toda a diferença para melhorar o Adopet.
        </Text>
        <View style={[styles.betaBadge, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.betaText, { color: colors.primary }]}>
            O app está em fase de testes (beta). Agradecemos a paciência e qualquer
            reporte de problema.
          </Text>
        </View>
        {sent ? (
          <View style={[styles.sentWrap, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.sentText, { color: colors.primary }]}>
              Reporte enviado. Obrigado! A equipe vai analisar.
            </Text>
          </View>
        ) : (
          <>
            <Text style={[styles.commentLabel, { color: colors.textSecondary }]}>
              Quer adicionar um comentário? (opcional)
            </Text>
            <TextInput
              style={[
                styles.commentInput,
                {
                  backgroundColor: colors.surface,
                  color: colors.textPrimary,
                  borderColor: colors.primary + '40',
                },
              ]}
              placeholder="Ex.: estava na tela do feed quando..."
              placeholderTextColor={colors.textSecondary}
              value={userComment}
              onChangeText={setUserComment}
              multiline
              numberOfLines={3}
              editable={!sending}
            />
            <TouchableOpacity
              style={[styles.reportBtn, { backgroundColor: colors.primary }]}
              onPress={handleReport}
              disabled={sending}
              activeOpacity={0.8}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.reportBtnText}>Reportar bug</Text>
              )}
            </TouchableOpacity>
          </>
        )}
        {onRetry && (
          <TouchableOpacity
            style={[styles.retryBtn, { borderColor: colors.primary }]}
            onPress={onRetry}
            activeOpacity={0.8}
          >
            <Text style={[styles.retryBtnText, { color: colors.primary }]}>
              Tentar novamente
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.xl,
  },
  logo: {
    width: 160,
    height: 48,
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  betaBadge: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.xl,
  },
  betaText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  commentLabel: {
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  reportBtn: {
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  reportBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sentWrap: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  sentText: {
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '500',
  },
  retryBtn: {
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
