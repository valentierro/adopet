import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_ACCESS = 'adopet_access_token';
const KEY_REFRESH = 'adopet_refresh_token';

const isWeb = Platform.OS === 'web';

export async function getStoredAccessToken(): Promise<string | null> {
  try {
    if (isWeb) return await AsyncStorage.getItem(KEY_ACCESS);
    return await SecureStore.getItemAsync(KEY_ACCESS);
  } catch {
    return null;
  }
}

export async function getStoredRefreshToken(): Promise<string | null> {
  try {
    if (isWeb) return await AsyncStorage.getItem(KEY_REFRESH);
    return await SecureStore.getItemAsync(KEY_REFRESH);
  } catch {
    return null;
  }
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

/** Timeout para clear no iOS — SecureStore pode travar. */
const CLEAR_TIMEOUT_MS = 3000;

/** Remove tokens do storage. Nunca lança — falhas no iOS SecureStore são ignoradas. */
export async function clearStoredTokens(): Promise<void> {
  const clear = async () => {
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
  };
  try {
    await Promise.race([
      clear(),
      new Promise<void>((resolve) => setTimeout(resolve, CLEAR_TIMEOUT_MS)),
    ]);
  } catch {
    // iOS SecureStore pode falhar após logout; ignorar para evitar crash
  }
}
