import * as SecureStore from 'expo-secure-store';

const KEY_ACCESS = 'adopet_access_token';
const KEY_REFRESH = 'adopet_refresh_token';

export async function getStoredAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_ACCESS);
}

export async function getStoredRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_REFRESH);
}

export async function setStoredTokens(access: string, refresh: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEY_ACCESS, access),
    SecureStore.setItemAsync(KEY_REFRESH, refresh),
  ]);
}

export async function clearStoredTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEY_ACCESS),
    SecureStore.deleteItemAsync(KEY_REFRESH),
  ]);
}
