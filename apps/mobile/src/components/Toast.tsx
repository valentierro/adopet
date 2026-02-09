import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

type Props = {
  message: string | null;
  onHide: () => void;
  duration?: number;
};

export function Toast({ message, onHide, duration = 2000 }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const visible = !!message;

  useEffect(() => {
    if (!message) return;
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(duration),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onHide());
  }, [message, duration, onHide, opacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.wrap, { opacity }]} pointerEvents="none">
      <View style={styles.box}>
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
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
