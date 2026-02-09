import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

const VerificadoImage = require('../../assets/brand/logo/verificado.png');

type Props = {
  /** Tamanho do ícone em px (ex.: 14, 18) */
  size?: number;
  /** Exibir texto "Verificado" ao lado (ex.: no perfil e no detalhe do pet) */
  showLabel?: boolean;
  /** Cor de fundo quando showLabel (ex.: colors.primary) */
  backgroundColor?: string;
  /** Cor do texto quando showLabel */
  textColor?: string;
};

export function VerifiedBadge({
  size = 18,
  showLabel = false,
  backgroundColor,
  textColor = '#fff',
}: Props) {
  const badge = (
    <Image
      source={VerificadoImage}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );

  if (!showLabel) {
    return badge;
  }

  return (
    <View style={[styles.withLabel, backgroundColor && { backgroundColor }]}>
      <Image
        source={VerificadoImage}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
      <Text style={[styles.label, { color: textColor }]}>Verificado</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
