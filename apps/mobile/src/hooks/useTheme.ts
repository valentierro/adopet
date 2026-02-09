import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from '../theme';

export function useTheme() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? darkColors : lightColors;
  return { colors, isDark: scheme === 'dark' };
}
