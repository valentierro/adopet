import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

const IconUserVerificado = require('../../assets/icone_user_verificado.png');
const IconPetVerificado = require('../../assets/icone_pet_verificado.png');

const DEFAULT_ACCESSIBILITY_LABEL =
  'Verificado. Passou por análise da equipe Adopet; não garante autenticidade. Encontro responsável com o tutor é essencial.';

/** Multiplicador para o selo de pet (ícone maior e mais destacado; sem fundo). */
const PET_SIZE_MULTIPLIER = 1.5;

type Props = {
  /** 'user' = ícone de usuário verificado (+ texto "Verificado" se showLabel). 'pet' = ícone de pet verificado (só ícone, um pouco maior). */
  variant?: 'user' | 'pet';
  /** Tamanho do ícone em px (ex.: 14, 18). Para variant=pet é aplicado PET_SIZE_MULTIPLIER. */
  size?: number;
  /** Exibir texto "Verificado" ao lado (apenas para variant="user") */
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
  variant = 'pet',
  size: sizeProp = 18,
  showLabel = false,
  backgroundColor,
  textColor = '#fff',
  iconBackgroundColor,
  accessibilityLabel = DEFAULT_ACCESSIBILITY_LABEL,
}: Props) {
  const size = variant === 'pet' ? Math.round(sizeProp * PET_SIZE_MULTIPLIER) : sizeProp;
  const source = variant === 'user' ? IconUserVerificado : IconPetVerificado;
  const showText = variant === 'user' && showLabel;

  const icon = (
    <Image
      source={source}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessible
      accessibilityLabel={accessibilityLabel}
    />
  );

  /* Pet: só o ícone, sem fundo. User: pode ter fundo (iconBackgroundColor) para contraste. */
  const useIconWrap = Boolean(iconBackgroundColor) && variant === 'user';
  const badge = useIconWrap ? (
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

  if (!showText) {
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
