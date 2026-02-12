import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { forgotPassword } from '../../src/api/auth';
import { getFriendlyErrorMessage } from '../../src/utils/errorMessage';
import { spacing } from '../../src/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Erro', 'Informe seu e-mail.');
      return;
    }
    setLoading(true);
    try {
      const res = await forgotPassword(email.trim());
      Alert.alert('E-mail enviado', res.message, [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (e: unknown) {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível enviar o e-mail. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : insets.top}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + spacing.lg,
            paddingBottom: insets.bottom + spacing.xl,
            paddingHorizontal: spacing.md + insets.left,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
          <Ionicons name="mail-outline" size={48} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Esqueceu sua senha?</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Informe o e-mail da sua conta. Enviaremos um link para você confirmar; ao clicar, receberá uma senha temporária por e-mail. Sua senha só será alterada depois da confirmação.
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
          placeholder="E-mail"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          editable={!loading}
        />
        <PrimaryButton
          title={loading ? 'Enviando...' : 'Enviar link de confirmação'}
          onPress={handleSubmit}
          disabled={loading}
        />
        <TouchableOpacity
          style={styles.backLink}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>Voltar ao login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  input: {
    padding: spacing.md,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.lg,
  },
  backText: { fontSize: 16, fontWeight: '600' },
});
