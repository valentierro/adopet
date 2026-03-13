import { useColorScheme, Appearance } from 'react-native';
import { useCallback, useEffect } from 'react';
import { lightColors, darkColors } from '../theme';
import { useThemeStore } from '../stores/themeStore';
import type { ThemePreference } from '../storage/themePreference';

const setColorSchemeNative =
  typeof Appearance !== 'undefined' && typeof (Appearance as { setColorScheme?: (s: 'light' | 'dark' | null) => void }).setColorScheme === 'function'
    ? (Appearance as { setColorScheme: (s: 'light' | 'dark' | null) => void }).setColorScheme
    : null;

export function useTheme() {
  const systemScheme = useColorScheme();
  const preference = useThemeStore((s) => s.preference);
  const setAndPersist = useThemeStore((s) => s.setAndPersist);

  const scheme = preference ?? systemScheme ?? 'light';
  const colors = scheme === 'dark' ? darkColors : lightColors;
  const isDark = scheme === 'dark';

  const toggleTheme = useCallback(() => {
    const next: ThemePreference = isDark ? 'light' : 'dark';
    setAndPersist(next);
    if (setColorSchemeNative) setColorSchemeNative(next);
  }, [isDark, setAndPersist]);

  return { colors, isDark, toggleTheme, themePreference: preference };
}
