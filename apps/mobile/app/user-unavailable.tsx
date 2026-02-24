import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, PrimaryButton } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { spacing } from '../src/theme';

const LogoSplash = require('../assets/brand/logo/logo_splash.png');

export default function UserUnavailableScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const handleDiscoverPets = () => {
    router.replace('/(tabs)/feed');
  };

  return (
    <ScreenContainer>
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + spacing.xl,
            paddingBottom: insets.bottom + spacing.xl,
            paddingHorizontal: spacing.lg,
          },
        ]}
      >
        <View style={[styles.logoWrap, { backgroundColor: colors.primary + '12' }]}>
          <Image source={LogoSplash} style={styles.logo} contentFit="contain" />
        </View>
        <View style={styles.iconWrap}>
          <Ionicons name="person-remove-outline" size={48} color={colors.textSecondary} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Usuário não disponível
        </Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          Este usuário não está mais ativo no app. Que tal descobrir outros pets disponíveis para adoção? Muitos tutores estão à espera de um novo lar para seus animais.
        </Text>
        <PrimaryButton
          title="Descobrir pets"
          onPress={handleDiscoverPets}
          accessibilityLabel="Descobrir pets no feed"
          style={styles.cta}
        />
        <Text style={[styles.footer, { color: colors.textSecondary }]}>
          Adoção responsável, voluntária e sem custos
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    padding: spacing.lg,
    borderRadius: 20,
    marginBottom: spacing.xl,
  },
  logo: {
    width: 120,
    height: 120 * 1.2,
  },
  iconWrap: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
    maxWidth: 320,
  },
  cta: {
    minWidth: 200,
    marginBottom: spacing.lg,
  },
  footer: {
    fontSize: 13,
    textAlign: 'center',
  },
});
