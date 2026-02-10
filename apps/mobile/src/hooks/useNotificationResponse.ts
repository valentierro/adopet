import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import type { Router } from 'expo-router';

/**
 * Navega para chat quando o usuário toca em notificação com conversationId (engajamento/retenção).
 */
export function useNotificationResponse(router: Router) {
  useEffect(() => {
    const openChatIfConversation = (data: Record<string, unknown> | undefined) => {
      const conversationId = data?.conversationId;
      if (typeof conversationId === 'string' && conversationId) {
        router.push(`/chat/${conversationId}`);
      }
    };

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      openChatIfConversation(data);
    });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response?.notification.request.content.data) {
        const data = response.notification.request.content.data as Record<string, unknown>;
        openChatIfConversation(data);
      }
    });

    return () => sub.remove();
  }, [router]);
}
