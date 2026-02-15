import { useEffect } from 'react';
import Constants from 'expo-constants';
import type { Router } from 'expo-router';

const isExpoGo = Constants.appOwnership === 'expo';

/**
 * Navega para chat quando o usuário toca em notificação com conversationId (engajamento/retenção).
 * No Expo Go (SDK 53+) push foi removido no Android; este hook não faz nada lá.
 */
export function useNotificationResponse(router: Router) {
  useEffect(() => {
    if (isExpoGo) return;
    let sub: { remove: () => void } | null = null;
    let cancelled = false;
    (async () => {
      const Notifications = await import('expo-notifications');
      if (cancelled) return;
      const openChatIfConversation = (data: Record<string, unknown> | undefined) => {
        const conversationId = data?.conversationId;
        if (typeof conversationId === 'string' && conversationId) {
          router.push(`/chat/${conversationId}`);
        }
      };

      sub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<string, unknown> | undefined;
        openChatIfConversation(data);
      });

      const response = await Notifications.getLastNotificationResponseAsync();
      if (!cancelled && response?.notification.request.content.data) {
        const data = response.notification.request.content.data as Record<string, unknown>;
        openChatIfConversation(data);
      }
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [router]);
}
