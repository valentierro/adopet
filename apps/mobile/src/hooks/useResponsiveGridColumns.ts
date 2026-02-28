import { useWindowDimensions } from 'react-native';

/** Breakpoints para layout responsivo (tablets vs smartphones) */
const BREAKPOINT_TABLET = 600;
const BREAKPOINT_TABLET_LARGE = 900;

export const RESPONSIVE_BREAKPOINTS = {
  tablet: BREAKPOINT_TABLET,
  tabletLarge: BREAKPOINT_TABLET_LARGE,
} as const;

/**
 * Retorna o número de colunas do grid baseado na largura da tela.
 * Smartphones (< 600px): 2 colunas (comportamento atual, inalterado)
 * Tablets médios (600–899px): 3 colunas
 * Tablets grandes (900px+): 4 colunas
 */
export function useResponsiveGridColumns(): number {
  const { width } = useWindowDimensions();
  if (width >= BREAKPOINT_TABLET_LARGE) return 4;
  if (width >= BREAKPOINT_TABLET) return 3;
  return 2;
}

/**
 * Retorna largura máxima recomendada para modais baseada na tela.
 * Smartphones: 340px. Tablets: até 480px para melhor uso do espaço.
 */
export function getModalMaxWidth(width: number): number {
  if (width >= BREAKPOINT_TABLET_LARGE) return 480;
  if (width >= BREAKPOINT_TABLET) return 400;
  return 340;
}

/** Hook que retorna largura máxima para modais (responsivo). */
export function useModalMaxWidth(): number {
  const { width } = useWindowDimensions();
  return getModalMaxWidth(width);
}
