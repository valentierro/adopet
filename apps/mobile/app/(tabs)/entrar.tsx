import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';

/**
 * Tela "Entrar" no footer para convidados. Redireciona para a mesma tela do link do topo (welcome).
 * Se já logado, redireciona para as tabs.
 */
export default function EntrarScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (userId) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/welcome');
    }
  }, [userId, router]);

  return null;
}
