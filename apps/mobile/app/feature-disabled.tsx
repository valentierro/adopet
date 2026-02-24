import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, PrimaryButton } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { spacing } from '../src/theme';

/**
 * Tela exibida quando o usuário acessa um recurso desabilitado por feature flag (ex.: deep link para PRO/doação).
 * Mostra "Em breve" e CTA para voltar.
 */
export default function FeatureDisabledScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="construct-outline" size={56} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Em breve</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Este recurso está em preparação e estará disponível em breve.
        </Text>
        <PrimaryButton
          title="Voltar"
          onPress={() => router.back()}
          style={styles.button}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  button: {
    minWidth: 160,
  },
});
