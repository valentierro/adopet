import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { PrimaryButton } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/authStore';
import { getFriendlyErrorMessage } from '../../src/utils/errorMessage';
import { spacing } from '../../src/theme';

const LogoSplash = require('../../assets/brand/logo/logo_splash.png');

/** Mín. 6 caracteres, pelo menos uma letra e um número */
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

export default function SignupScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const signup = useAuthStore((s) => s.signup);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password || !passwordConfirm || !phone.trim()) {
      Alert.alert('Erro', 'Preencha nome, email, telefone, senha e confirmação da senha.');
      return;
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      Alert.alert('Erro', 'Informe um telefone válido com DDD (10 ou 11 dígitos).');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('Erro', 'As senhas não coincidem. Digite a mesma senha nos dois campos.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Erro', 'A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (!PASSWORD_RULE.test(password)) {
      Alert.alert('Erro', 'A senha deve ter pelo menos uma letra e um número.');
      return;
    }
    try {
      await signup(email.trim(), password, name.trim(), phoneDigits);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      const { trackEvent } = await import('../../src/analytics');
      trackEvent({ name: 'signup_complete', properties: {} });
      router.replace('/');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e ?? '');
      const isConnectionError = /network|fetch|connection|timeout|ECONNREFUSED|failed to fetch|could not connect/i.test(msg);
      const title = 'Não foi possível completar';
      const body = isConnectionError
        ? 'Sua conta pode ter sido criada. Tente fazer login com seu email e senha. Se não conseguir, tente criar a conta novamente.'
        : getFriendlyErrorMessage(e, 'Tente outro email ou mais tarde.');
      Alert.alert(title, body);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
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
        <Image source={LogoSplash} style={styles.logo} resizeMode="contain" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.form}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
            placeholder="Nome"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            autoComplete="name"
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
            placeholder="Email"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
            placeholder="Telefone com DDD (ex: 11 98765-4321)"
            placeholderTextColor={colors.textSecondary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={15}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
            placeholder="Senha (mín. 6 caracteres, letra e número)"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password-new"
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
            placeholder="Confirmar senha"
            placeholderTextColor={colors.textSecondary}
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            secureTextEntry
            autoComplete="password-new"
          />
          <View style={[styles.privacyBox, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
            <Text style={[styles.privacyTitle, { color: colors.textPrimary }]}>Seus dados estão seguros</Text>
            <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
              Nome, email e telefone não são compartilhados com outros usuários. Usamos o telefone apenas para o administrador confirmar adoções com você quando necessário.
            </Text>
          </View>
          <PrimaryButton
            title={isLoading ? 'Cadastrando...' : 'Criar conta'}
            onPress={handleSubmit}
            disabled={isLoading}
          />
          <View style={styles.legalRow}>
            <Text style={[styles.legalText, { color: colors.textSecondary }]}>
              Ao criar conta você aceita os{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/terms')}>
              <Text style={[styles.legalLink, { color: colors.primary }]}>Termos de Uso</Text>
            </TouchableOpacity>
            <Text style={[styles.legalText, { color: colors.textSecondary }]}> e a </Text>
            <TouchableOpacity onPress={() => router.push('/privacy')}>
              <Text style={[styles.legalLink, { color: colors.primary }]}>Política de Privacidade</Text>
            </TouchableOpacity>
            <Text style={[styles.legalText, { color: colors.textSecondary }]}>.</Text>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  logo: {
    width: 180,
    height: 180 * 1.2,
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  form: { gap: spacing.md },
  legalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  legalText: { fontSize: 13 },
  legalLink: { fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  privacyBox: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  privacyTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing.xs },
  privacyText: { fontSize: 13, lineHeight: 20 },
  input: {
    padding: spacing.md,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
  },
});
