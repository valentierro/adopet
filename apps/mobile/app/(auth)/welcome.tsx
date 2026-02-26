import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import Constants from 'expo-constants';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, PrimaryButton, SecondaryButton } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { spacing } from '../../src/theme';

const APP_VERSION = Constants.expoConfig?.version ?? '1.1.1';

const LogoSplash = require('../../assets/brand/logo/logo_splash.png');

const PARTNER_GRADIENT: [string, string] = ['#d97706', '#b45309'];

export default function WelcomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ redirectPetId?: string }>();
  const redirectPetId = params.redirectPetId?.trim();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const goToLogin = () => {
    if (redirectPetId) {
      router.push(`/(auth)/login?redirectPetId=${encodeURIComponent(redirectPetId)}`);
    } else {
      router.push('/(auth)/login');
    }
  };

  const goToSignup = () => {
    if (redirectPetId) {
      router.push(`/(auth)/signup?redirectPetId=${encodeURIComponent(redirectPetId)}`);
    } else {
      router.push('/(auth)/signup');
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Image source={LogoSplash} style={styles.logo} contentFit="contain" />
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Encontre seu novo melhor amigo
          </Text>
          {redirectPetId ? (
            <Text style={[styles.redirectMessage, { color: colors.textPrimary }]}>
              Crie sua conta para ver o perfil completo e conversar com o tutor.
            </Text>
          ) : null}
          <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
            Adoção voluntária e sem custos. O Adopet não incentiva a comercialização de animais.
          </Text>
          <View style={[styles.ctaRow, { marginTop: spacing.lg }]}>
            <PrimaryButton title="Entrar" onPress={goToLogin} accessibilityLabel="Entrar" />
            <SecondaryButton title="Criar conta" onPress={goToSignup} accessibilityLabel="Criar conta" />
            <TouchableOpacity
              style={styles.guestLink}
              onPress={() => router.replace('/(tabs)/feed')}
              accessibilityRole="link"
              accessibilityLabel="Navegar como visitante"
            >
              <Text style={[styles.guestLinkText, { color: colors.primary }]}>Navegar como visitante</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.buttons, styles.partnerSection]}>
          <TouchableOpacity
            style={styles.partnerCardWrap}
            onPress={() => router.push('/parceria-apresentacao?tipo=ong')}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Sou ONG ou instituição. Parceria gratuita para abrigos e instituições"
          >
            <LinearGradient colors={PARTNER_GRADIENT} style={styles.partnerCard}>
              <View style={styles.partnerCardIconWrap}>
                <Ionicons name="heart" size={28} color="#fff" />
              </View>
              <View style={styles.partnerCardText}>
                <Text style={styles.partnerCardTitle} numberOfLines={1}>
                  Sou ONG ou instituição
                </Text>
                <Text style={styles.partnerCardSubtitle} numberOfLines={2}>
                  Parceria gratuita para abrigos e instituições
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.partnerCardWrap}
            onPress={() => router.push('/parceria-apresentacao?tipo=comercial')}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Clínicas, veterinários, lojas. Planos com destaque no app"
          >
            <LinearGradient colors={PARTNER_GRADIENT} style={styles.partnerCard}>
              <View style={styles.partnerCardIconWrap}>
                <Ionicons name="storefront" size={28} color="#fff" />
              </View>
              <View style={styles.partnerCardText}>
                <Text style={styles.partnerCardTitle} numberOfLines={1}>
                  Clínicas, veterinários, lojas
                </Text>
                <Text style={styles.partnerCardSubtitle} numberOfLines={2}>
                  Planos com destaque no app
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <Text style={[styles.versionText, { color: colors.textSecondary }]}>
          Versão {APP_VERSION}
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 0 },
  content: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    width: 200,
    height: 200 * 1.2,
    marginBottom: spacing.sm,
    marginTop: -16,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  redirectMessage: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  disclaimer: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    fontStyle: 'italic',
  },
  ctaRow: {
    gap: spacing.sm,
    width: '100%',
  },
  guestLink: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  guestLinkText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buttons: {
    gap: spacing.md,
    width: '100%',
    paddingHorizontal: spacing.lg,
  },
  partnerSection: {
    marginTop: spacing.lg,
  },
  partnerCardWrap: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0.06,
    elevation: 3,
  },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    minHeight: 72,
  },
  partnerCardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerCardText: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  partnerCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  partnerCardSubtitle: {
    fontSize: 12,
    marginTop: 2,
    color: 'rgba(255,255,255,0.9)',
  },
  versionText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
});
