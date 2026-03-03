import { useEffect } from 'react';
import { useRouter } from 'expo-router';

/**
 * Preferências de notificações foram unificadas com a tela de Notificações.
 * Redireciona para /notifications (lá há seção colapsável "Preferências de notificações").
 */
export default function PreferencesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/notifications');
  }, [router]);
  return null;
}
