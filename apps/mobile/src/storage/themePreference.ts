import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'ADOPET_COLOR_SCHEME';

export type ThemePreference = 'light' | 'dark';

export async function getThemePreference(): Promise<ThemePreference | null> {
  try {
    const value = await AsyncStorage.getItem(KEY);
    if (value === 'light' || value === 'dark') return value;
    return null;
  } catch {
    return null;
  }
}

export async function setThemePreference(scheme: ThemePreference): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, scheme);
  } catch {
    // ignore
  }
}
