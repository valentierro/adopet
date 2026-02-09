import * as SecureStore from 'expo-secure-store';

const KEY_ONBOARDING_SEEN = 'adopet_onboarding_seen';

export async function getOnboardingSeen(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(KEY_ONBOARDING_SEEN);
  return value === 'true';
}

export async function setOnboardingSeen(): Promise<void> {
  await SecureStore.setItemAsync(KEY_ONBOARDING_SEEN, 'true');
}
