import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_ACCESS = 'adopet_access_token';
const KEY_REFRESH = 'adopet_refresh_token';

const isWeb = Platform.OS === 'web';

export async function getStoredAccessToken(): Promise<string | null> {
  if (isWeb) return AsyncStorage.getItem(KEY_ACCESS);
  return SecureStore.getItemAsync(KEY_ACCESS);
}

export async function getStoredRefreshToken(): Promise<string | null> {
  if (isWeb) return AsyncStorage.getItem(KEY_REFRESH);
  return SecureStore.getItemAsync(KEY_REFRESH);
}

export async function setStoredTokens(access: string, refresh: string): Promise<void> {
  if (isWeb) {
    await Promise.all([
      AsyncStorage.setItem(KEY_ACCESS, access),
      AsyncStorage.setItem(KEY_REFRESH, refresh),
    ]);
    return;
  }
  await Promise.all([
    SecureStore.setItemAsync(KEY_ACCESS, access),
    SecureStore.setItemAsync(KEY_REFRESH, refresh),
  ]);
}

export async function clearStoredTokens(): Promise<void> {
  if (isWeb) {
    await Promise.all([
      AsyncStorage.removeItem(KEY_ACCESS),
      AsyncStorage.removeItem(KEY_REFRESH),
    ]);
    return;
  }
  await Promise.all([
    SecureStore.deleteItemAsync(KEY_ACCESS),
    SecureStore.deleteItemAsync(KEY_REFRESH),
  ]);
}
