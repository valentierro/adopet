import { lightColors, darkColors, type ThemeColors } from './colors';
import { spacing } from './spacing';
import { radius } from './radius';

export { lightColors, darkColors, spacing, radius };
export type { ThemeColors };

export const theme = {
  light: {
    ...lightColors,
    spacing,
    radius,
  },
  dark: {
    ...darkColors,
    spacing,
    radius,
  },
};
