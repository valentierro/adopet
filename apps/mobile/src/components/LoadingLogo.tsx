import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

const LogoSplash = require('../../assets/brand/logo/logo_splash.png');

type Props = {
  /** Tamanho da logo (largura); altura proporcional */
  size?: number;
};

export function LoadingLogo({ size = 180 }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const heartbeat = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.12,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.98,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.08,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.delay(400),
      ]),
      { iterations: -1 }
    );
    heartbeat.start();
    return () => heartbeat.stop();
  }, [scale]);

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.animatedWrap, { transform: [{ scale }] }]}>
        <Image
          source={LogoSplash}
          style={[styles.logo, { width: size, height: size * 1.2 }]}
          contentFit="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 120,
  },
  animatedWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    maxWidth: '80%',
  },
});
