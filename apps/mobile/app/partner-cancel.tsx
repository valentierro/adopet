import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, PrimaryButton } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { spacing } from '../src/theme';

export default function PartnerPaymentCancelScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['me'] });
    queryClient.invalidateQueries({ queryKey: ['me', 'partner'] });
  }, [queryClient]);

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: colors.textSecondary + '20' }]}>
          <Ionicons name="close-circle-outline" size={64} color={colors.textSecondary} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Pagamento cancelado</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Você pode concluir o pagamento quando quiser pelo Perfil → Renovar assinatura do parceiro.
        </Text>
        <PrimaryButton
          title="Voltar ao app"
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
