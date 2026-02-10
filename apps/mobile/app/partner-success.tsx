import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, PrimaryButton } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { spacing } from '../src/theme';

export default function PartnerPaymentSuccessScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['me'] });
  }, [queryClient]);

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Pagamento concluído</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Sua assinatura foi ativada. O portal do parceiro já está disponível no seu perfil.
        </Text>
        <PrimaryButton
          title="Ir para o app"
          onPress={() => router.replace('/(tabs)')}
          style={styles.button}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  iconWrap: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  title: { fontSize: 22, fontWeight: '700', marginBottom: spacing.sm, textAlign: 'center' },
  subtitle: { fontSize: 16, lineHeight: 24, textAlign: 'center', marginBottom: spacing.xl },
  button: { alignSelf: 'stretch' },
});
