import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, PrimaryButton, SecondaryButton } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { spacing } from '../../src/theme';

const LogoSplash = require('../../assets/brand/logo/logo_splash.png');

const PARTNER_GRADIENT: [string, string] = ['#d97706', '#b45309'];

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <ScreenContainer>
      <View style={[styles.content, { paddingTop: insets.top + spacing.sm }]}>
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
          <TouchableOpacity
            style={styles.partnerCardWrap}
            onPress={() => router.push('/parceria-apresentacao?tipo=ong')}
            activeOpacity={0.82}
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
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
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
    marginBottom: spacing.xl,
  },
  buttons: {
    gap: spacing.md,
    width: '100%',
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
});
