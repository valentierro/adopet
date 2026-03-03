import { LayoutAnimation, Platform } from 'react-native';

/**
 * Configura animação de expandir/recolher para o próximo layout.
 * Use antes de atualizar estado que altera altura/opacidade de seções colapsáveis.
 */
export function configureExpandAnimation(): void {
  if (Platform.OS !== 'web') {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(280, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)
    );
  }
}
