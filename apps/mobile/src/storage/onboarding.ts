import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_LEGACY = 'adopet_onboarding_seen';
const KEY_PREFIX = 'adopet_onboarding_seen_';
/** Flag persistida: conta recém-criada deve ver o tour de onboarding (sobrevive a reload/navegação). */
const KEY_SHOW_ONBOARDING_AFTER_SIGNUP = 'adopet_show_onboarding_after_signup';

const isWeb = Platform.OS === 'web';

/** Flag em memória: conta recém-criada deve ver onboarding (evita depender do SecureStore no signup). */
let shouldShowOnboardingAfterSignup = false;

export function setShouldShowOnboardingAfterSignup(): void {
  shouldShowOnboardingAfterSignup = true;
  (async () => {
    try {
      if (isWeb) await AsyncStorage.setItem(KEY_SHOW_ONBOARDING_AFTER_SIGNUP, '1');
      else await SecureStore.setItemAsync(KEY_SHOW_ONBOARDING_AFTER_SIGNUP, '1');
    } catch {
      // ignora
    }
  })();
}

/** Retorna true se deve mostrar o onboarding (pós-signup). Consome a flag (memória + storage). */
export async function consumeShouldShowOnboardingAfterSignupAsync(): Promise<boolean> {
  const fromMemory = shouldShowOnboardingAfterSignup;
  shouldShowOnboardingAfterSignup = false;
  let fromStorage = false;
  try {
    if (isWeb) {
      const v = await AsyncStorage.getItem(KEY_SHOW_ONBOARDING_AFTER_SIGNUP);
      fromStorage = v === '1' || v === 'true';
      if (fromStorage) await AsyncStorage.removeItem(KEY_SHOW_ONBOARDING_AFTER_SIGNUP);
    } else {
      const v = await SecureStore.getItemAsync(KEY_SHOW_ONBOARDING_AFTER_SIGNUP);
      fromStorage = v === '1' || v === 'true';
      if (fromStorage) await SecureStore.deleteItemAsync(KEY_SHOW_ONBOARDING_AFTER_SIGNUP);
    }
  } catch {
    // ignora erro de leitura
  }
  return fromMemory || fromStorage;
}

export function consumeShouldShowOnboardingAfterSignup(): boolean {
  const value = shouldShowOnboardingAfterSignup;
  shouldShowOnboardingAfterSignup = false;
  return value;
}

/**
 * Retorna se o onboarding já foi visto por este usuário.
 * Chave por usuário (userId); migra do valor legado (chave global) se existir.
 */
export async function getOnboardingSeen(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const key = KEY_PREFIX + userId;
  if (isWeb) {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) return value === 'true';
    const legacy = await AsyncStorage.getItem(KEY_LEGACY);
    if (legacy === 'true') {
      await AsyncStorage.setItem(key, 'true');
      await AsyncStorage.removeItem(KEY_LEGACY);
      return true;
    }
    return false;
  }
  const value = await SecureStore.getItemAsync(key);
  if (value !== null) return value === 'true';
  const legacy = await SecureStore.getItemAsync(KEY_LEGACY);
  if (legacy === 'true') {
    await SecureStore.setItemAsync(key, 'true');
    await SecureStore.deleteItemAsync(KEY_LEGACY);
    return true;
  }
  return false;
}

/** Marca o onboarding como visto para este usuário. */
export async function setOnboardingSeen(userId: string): Promise<void> {
  if (isWeb) {
    await AsyncStorage.setItem(KEY_PREFIX + userId, 'true');
    return;
  }
  await SecureStore.setItemAsync(KEY_PREFIX + userId, 'true');
}

/** Remove a chave legada (global) para não afetar novos usuários no mesmo aparelho. */
export async function clearOnboardingSeen(): Promise<void> {
  if (isWeb) {
    await AsyncStorage.removeItem(KEY_LEGACY);
    return;
  }
  await SecureStore.deleteItemAsync(KEY_LEGACY);
}
