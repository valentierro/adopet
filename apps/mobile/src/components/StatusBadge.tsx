import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius } from '../theme';

type Props = {
  label: string;
  variant?: 'success' | 'neutral' | 'warning';
};

export function StatusBadge({ label, variant = 'neutral' }: Props) {
  const { colors } = useTheme();

  const bgColor =
    variant === 'success'
      ? colors.primary + '20'
      : variant === 'warning'
        ? colors.accent + '20'
        : colors.surface;

  const textColor =
    variant === 'success'
      ? colors.primaryDark
      : variant === 'warning'
        ? colors.accent
        : colors.textSecondary;

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
});
