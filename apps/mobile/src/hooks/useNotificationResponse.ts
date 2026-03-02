import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { Router } from 'expo-router';

const isExpoGo = Constants.appOwnership === 'expo';

/**
 * Navega para chat quando o usuário toca em notificação com conversationId (engajamento/retenção).
 * No Expo Go (SDK 53+) push foi removido no Android; este hook não faz nada lá.
 * Na web, expo-notifications não está disponível.
 */
export function useNotificationResponse(router: Router) {
  useEffect(() => {
    if (isExpoGo || Platform.OS === 'web') return;
    let sub: { remove: () => void } | null = null;
    let cancelled = false;
    (async () => {
      const Notifications = await import('expo-notifications');
      if (cancelled) return;
      const handleNotificationData = (data: Record<string, unknown> | undefined) => {
        if (!data) return;
        const type = data.type;
        const adoptionRequestId = data.adoptionRequestId;
        if (type === 'ADOPTION_FORM_SENT' && typeof adoptionRequestId === 'string' && adoptionRequestId) {
          router.push(`/adoption-form-fill/${adoptionRequestId}`);
          return;
        }
        if (type === 'ADOPTION_FORM_SUBMITTED') {
          const convId = data.conversationId;
          if (typeof convId === 'string' && convId) {
            router.push(`/(tabs)/chat/${convId}`);
            return;
          }
          if (typeof adoptionRequestId === 'string' && adoptionRequestId) {
            router.push('/partner-adoption-requests');
            return;
          }
        }
        const conversationId = data.conversationId;
        if (typeof conversationId === 'string' && conversationId) {
          router.push(`/chat/${conversationId}`);
          return;
        }
        const screen = data.screen;
        if (screen === 'survey') {
          const adoptionId = data.adoptionId;
          const role = data.role;
          if (typeof adoptionId === 'string' && adoptionId) {
            const params = new URLSearchParams({ adoptionId });
            if (typeof role === 'string' && (role === 'TUTOR' || role === 'ADOPTER')) {
              params.set('role', role);
            }
            router.replace(`/survey?${params.toString()}`);
            return;
          }
        }
        if (screen === 'my-adoptions') {
          router.replace('/(tabs)/my-adoptions');
          return;
        }
        if (screen === 'profile') {
          router.replace('/(tabs)/profile');
          return;
        }
        if (screen === 'adminPartners') {
          router.replace('/(tabs)/admin/partners');
          return;
        }
        if (screen === 'partnerMyPets') {
          router.replace('/partner-my-pets');
          return;
        }
        if (screen === 'partnerSubscription') {
          router.replace('/partner-subscription');
          return;
        }
      };

      sub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<string, unknown> | undefined;
        handleNotificationData(data);
      });

      const response = await Notifications.getLastNotificationResponseAsync();
      if (!cancelled && response?.notification.request.content.data) {
        const data = response.notification.request.content.data as Record<string, unknown>;
        handleNotificationData(data);
      }
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [router]);
}
