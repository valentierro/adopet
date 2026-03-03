import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  message: string | null;
  onHide: () => void;
  duration?: number;
  /** 'success' | 'error' | undefined para ícone opcional */
  variant?: 'success' | 'error' | undefined;
};

export function Toast({ message, onHide, duration = 2000, variant }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-40)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const visible = !!message;

  useEffect(() => {
    if (!message) return;
    opacity.setValue(0);
    translateY.setValue(-40);
    scale.setValue(0.9);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8, tension: 120 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 8, tension: 120 }),
    ]).start();
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -24, duration: 180, useNativeDriver: true }),
      ]).start(() => { if (typeof onHide === 'function') onHide(); });
    }, duration);
    return () => clearTimeout(t);
  }, [message, duration, onHide, opacity, translateY, scale]);

  if (!visible) return null;

  const icon = variant === 'success' ? <Ionicons name="checkmark-circle" size={22} color="#fff" style={styles.toastIcon} /> : variant === 'error' ? <Ionicons name="close-circle" size={22} color="#fff" style={styles.toastIcon} /> : null;

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.box}>
        {icon}
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 100,
    alignItems: 'center',
    zIndex: 100,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 24,
  },
  toastIcon: {
    marginRight: 10,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
