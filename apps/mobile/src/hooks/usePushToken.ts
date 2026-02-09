import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { updatePushToken } from '../api/me';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushToken(isLoggedIn: boolean) {
  useEffect(() => {
    if (!isLoggedIn) return;
    let mounted = true;
    (async () => {
      if (!Device.isDevice) return;
      const { status: existing } = await Notifications.getPermissionsAsync();
      let final = existing;
      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        final = status;
      }
      if (final !== 'granted') return;
      try {
        const token = (
          await Notifications.getExpoPushTokenAsync(
            process.env.EXPO_PUBLIC_PROJECT_ID
              ? { projectId: process.env.EXPO_PUBLIC_PROJECT_ID }
              : undefined
          )
        ).data;
        if (mounted) await updatePushToken(token);
      } catch {
        // log-only em dev ou falha
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isLoggedIn]);
}
