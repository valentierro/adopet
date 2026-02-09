import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, StyleSheet, Pressable } from 'react-native';

const LogoSplash = require('../../assets/brand/logo/logo_splash.png');

type Props = {
  visible: boolean;
  onHide: () => void;
  duration?: number;
};

export function MatchOverlay({ visible, onHide, duration = 2500 }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const onHideRef = useRef(onHide);
  onHideRef.current = onHide;

  useEffect(() => {
    if (!visible) return;
    opacity.setValue(0);
    scale.setValue(0.9);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 80,
      }),
    ]).start();

    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.95,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => onHideRef.current());
    }, duration);
    return () => clearTimeout(t);
  }, [visible, duration, opacity, scale]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onHide} />
      <Animated.View style={[styles.centered, { transform: [{ scale }] }]}>
        <View style={styles.card}>
          <Image source={LogoSplash} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Deu match!</Text>
          <Text style={styles.subtitle}>Você curtiu esse pet</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  centered: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 40,
    alignItems: 'center',
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    shadowOpacity: 0.25,
    elevation: 12,
  },
  logo: {
    width: 88,
    height: 88 * 1.2,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0D9488',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    color: '#57534E',
    marginTop: 4,
    fontWeight: '500',
  },
});
