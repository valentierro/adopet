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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton, ScreenContainer, PageIntro, ProfileMenuFooter } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { changePassword } from '../src/api/auth';
import { getFriendlyErrorMessage } from '../src/utils/errorMessage';
import { spacing } from '../src/theme';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!currentPassword.trim()) {
      Alert.alert('Campo obrigatório', 'Informe sua senha atual.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Nova senha', 'A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Senhas diferentes', 'A confirmação da nova senha não confere.');
      return;
    }
    setLoading(true);
    try {
      await changePassword({ currentPassword, newPassword });
      Alert.alert('Senha alterada', 'Sua senha foi alterada com sucesso.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: unknown) {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível alterar a senha. Verifique a senha atual.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scroll>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <PageIntro
          title="Alterar senha"
          subtitle="Informe sua senha atual e a nova senha. Use pelo menos 6 caracteres."
        />
        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Senha atual</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
              placeholder="Sua senha atual"
              placeholderTextColor={colors.textSecondary}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrent}
              autoCapitalize="none"
              autoComplete="password"
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowCurrent((v) => !v)}
              accessibilityLabel={showCurrent ? 'Ocultar senha' : 'Ver senha'}
            >
              <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Nova senha</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor={colors.textSecondary}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNew}
              autoCapitalize="none"
              autoComplete="new-password"
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowNew((v) => !v)}
              accessibilityLabel={showNew ? 'Ocultar senha' : 'Ver senha'}
            >
              <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Confirmar nova senha</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
              placeholder="Repita a nova senha"
              placeholderTextColor={colors.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              autoComplete="new-password"
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowConfirm((v) => !v)}
              accessibilityLabel={showConfirm ? 'Ocultar senha' : 'Ver senha'}
            >
              <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <PrimaryButton
            title={loading ? 'Alterando...' : 'Alterar senha'}
            onPress={handleSubmit}
            disabled={loading}
            style={{ marginTop: spacing.md }}
          />
        </View>
      </KeyboardAvoidingView>
      <ProfileMenuFooter />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  form: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl + 80,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    padding: spacing.md,
    paddingRight: 48,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  passwordWrap: { position: 'relative', marginBottom: spacing.xs },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    minWidth: 36,
  },
});
