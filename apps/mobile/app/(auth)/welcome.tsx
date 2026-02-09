import { View, Text, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, PrimaryButton, SecondaryButton } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { spacing } from '../../src/theme';

const LogoSplash = require('../../assets/brand/logo/logo_splash.png');

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <Image source={LogoSplash} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Encontre seu novo melhor amigo
        </Text>
        <View style={styles.buttons}>
          <PrimaryButton
            title="Entrar"
            onPress={() => router.push('/(auth)/login')}
          />
          <SecondaryButton
            title="Criar conta"
            onPress={() => router.push('/(auth)/signup')}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200 * 1.2,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  buttons: {
    gap: spacing.md,
  },
});
