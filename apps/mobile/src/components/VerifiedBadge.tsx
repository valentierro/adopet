import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

const VerificadoImage = require('../../assets/brand/logo/verificado.png');

const DEFAULT_ACCESSIBILITY_LABEL =
  'Verificado. Passou por análise da equipe Adopet; não garante autenticidade. Encontro responsável com o tutor é essencial.';

type Props = {
  /** Tamanho do ícone em px (ex.: 14, 18) */
  size?: number;
  /** Exibir texto "Verificado" ao lado (ex.: no perfil e no detalhe do pet) */
  showLabel?: boolean;
  /** Cor de fundo quando showLabel (ex.: colors.primary) */
  backgroundColor?: string;
  /** Cor do texto quando showLabel */
  textColor?: string;
  /** Cor de fundo só do ícone (melhor visualização sobre foto); ex.: colors.primary ou 'rgba(255,255,255,0.95)' */
  iconBackgroundColor?: string;
  /** Texto para leitores de tela (default explica o que o selo significa e não garante) */
  accessibilityLabel?: string;
};

export function VerifiedBadge({
  size = 18,
  showLabel = false,
  backgroundColor,
  textColor = '#fff',
  iconBackgroundColor,
  accessibilityLabel = DEFAULT_ACCESSIBILITY_LABEL,
}: Props) {
  const icon = (
    <Image
      source={VerificadoImage}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessible
      accessibilityLabel={accessibilityLabel}
    />
  );

  const badge = iconBackgroundColor ? (
    <View
      style={[styles.iconWrap, { backgroundColor: iconBackgroundColor, padding: Math.max(2, Math.round(size / 8)), borderRadius: size }]}
      accessible
      accessibilityLabel={accessibilityLabel}
    >
      {icon}
    </View>
  ) : (
    icon
  );

  if (!showLabel) {
    return badge;
  }

  return (
    <View
      style={[styles.withLabel, backgroundColor && { backgroundColor }]}
      accessible
      accessibilityLabel={accessibilityLabel}
    >
      {icon}
      <Text style={[styles.label, { color: textColor }]}>Verificado</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  withLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
