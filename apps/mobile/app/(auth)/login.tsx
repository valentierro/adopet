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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { PrimaryButton } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/authStore';
import { getApiUrlConfigIssue } from '../../src/api/client';
import { getFriendlyErrorMessage } from '../../src/utils/errorMessage';
import { spacing } from '../../src/theme';

const LogoSplash = require('../../assets/brand/logo/logo_splash.png');

export default function LoginScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Erro', 'Preencha email e senha.');
      return;
    }
    try {
      await login(email.trim(), password);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      router.replace('/');
    } catch (e: unknown) {
      const configMsg = getApiUrlConfigIssue();
      const msg = configMsg ?? getFriendlyErrorMessage(e, 'Verifique seu email e senha e tente novamente.');
      Alert.alert('Não foi possível entrar', msg);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : insets.top}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.xl + 80,
            paddingHorizontal: spacing.md + insets.left,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Image source={LogoSplash} style={styles.logo} resizeMode="contain" />
        <View style={styles.form}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
            placeholder="Email"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            accessibilityLabel="Email"
            accessibilityHint="Digite seu endereço de email para entrar"
          />
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, styles.passwordInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
              placeholder="Senha"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
              accessibilityLabel="Senha"
              accessibilityHint="Digite sua senha"
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword((v) => !v)}
              accessibilityLabel={showPassword ? 'Ocultar senha' : 'Ver senha'}
            >
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <PrimaryButton
            title={isLoading ? 'Entrando...' : 'Entrar'}
            onPress={handleSubmit}
            disabled={isLoading}
            accessibilityLabel={isLoading ? 'Entrando' : 'Entrar'}
            accessibilityHint="Toque duas vezes para fazer login na sua conta"
          />
          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => router.push('/(auth)/forgot-password')}
            disabled={isLoading}
          >
            <Text style={[styles.forgotText, { color: colors.primary }]}>Esqueci minha senha</Text>
          </TouchableOpacity>
          <View style={[styles.welcomeCard, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
            <View style={styles.welcomeIcons}>
              <View style={[styles.welcomeIconCircle, { backgroundColor: colors.primary + '22' }]}>
                <Ionicons name="heart" size={20} color={colors.primary} />
              </View>
              <View style={[styles.welcomeIconCircle, { backgroundColor: colors.primary + '22' }]}>
                <Ionicons name="paw" size={18} color={colors.primary} />
              </View>
            </View>
            <Text style={[styles.welcomeMessage, { color: colors.textSecondary }]}>
              Cada adoção começa com um passo.
            </Text>
            <Text style={[styles.welcomeSub, { color: colors.textPrimary }]}>
              Que bom ter você aqui.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  logo: {
    width: 160,
    height: 160 * 1.2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.md,
  },
  welcomeCard: {
    marginTop: spacing.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  welcomeIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  welcomeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeMessage: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  welcomeSub: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  passwordWrap: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeBtn: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
  forgotLink: { alignSelf: 'center', marginTop: spacing.sm },
  forgotText: { fontSize: 15, fontWeight: '600' },
  input: {
    padding: spacing.md,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
  },
});
