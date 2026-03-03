import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { spacing } from '../theme';

type Props = {
  title: string;
  message?: string;
  icon?: React.ReactNode;
  /** Ilustração grande (emoji ou componente), ex: "🐾" */
  illustration?: React.ReactNode;
};

export function EmptyState({ title, message, icon, illustration }: Props) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 8, tension: 80 }),
    ]).start();
  }, [opacity, scale]);

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ scale }] }]}>
      {illustration != null && <View style={styles.illustrationWrap}>{illustration}</View>}
      {icon != null && illustration == null && <View style={styles.iconWrap}>{icon}</View>}
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {message ? (
        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  iconWrap: {
    marginBottom: spacing.md,
  },
  illustrationWrap: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
  },
});
