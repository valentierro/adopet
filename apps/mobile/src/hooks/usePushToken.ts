import { useEffect } from 'react';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { updatePushToken } from '../api/me';

const isExpoGo = Constants.appOwnership === 'expo';

export function usePushToken(isLoggedIn: boolean) {
  useEffect(() => {
    if (!isLoggedIn || isExpoGo) return;
    let mounted = true;
    (async () => {
      const Notifications = await import('expo-notifications');
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
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
