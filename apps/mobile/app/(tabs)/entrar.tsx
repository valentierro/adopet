import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { useTheme } from '../../src/hooks/useTheme';

/**
 * Tela "Entrar" no footer para convidados. Redireciona para a mesma tela do link do topo (welcome).
 * Se já logado, redireciona para as tabs.
 * Evita return null + redirect no useEffect (causa crash no Android).
 */
export default function EntrarScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (userId) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/welcome');
      }
    });
    return () => cancelAnimationFrame(id);
  }, [userId, router]);

  return (
    <View style={[styles.outer, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
