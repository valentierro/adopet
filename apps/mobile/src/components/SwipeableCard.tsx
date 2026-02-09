import React, { useRef } from 'react';
import {
  View,
  Animated,
  PanResponder,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.22;
const TAP_THRESHOLD = 10;

type Props = {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onPress?: () => void;
  /** Card ocupa toda a tela (estilo Tinder) */
  fullScreen?: boolean;
  /** Altura do card quando fullScreen; se não informado usa SCREEN_HEIGHT */
  cardHeight?: number;
};

export function SwipeableCard({ children, onSwipeLeft, onSwipeRight, onPress, fullScreen, cardHeight: cardHeightProp }: Props) {
  const position = useRef(new Animated.ValueXY()).current;
  const cardWidth = fullScreen ? SCREEN_WIDTH : SCREEN_WIDTH - 32;
  const cardHeight = fullScreen ? (cardHeightProp ?? SCREEN_HEIGHT) : undefined;
  const borderRadius = fullScreen ? 0 : 16;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        position.setValue({ x: gestureState.dx, y: gestureState.dy * 0.3 });
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx } = gestureState;
        if (Math.abs(dx) < TAP_THRESHOLD && onPress) {
          onPress();
          return;
        }
        if (dx > SWIPE_THRESHOLD && onSwipeRight) {
          onSwipeRight();
          Animated.timing(position, {
            toValue: { x: SCREEN_WIDTH + 100, y: dx },
            useNativeDriver: true,
            duration: 200,
          }).start(() => {
            position.setValue({ x: 0, y: 0 });
          });
        } else if (dx < -SWIPE_THRESHOLD && onSwipeLeft) {
          onSwipeLeft();
          Animated.timing(position, {
            toValue: { x: -SCREEN_WIDTH - 100, y: dx },
            useNativeDriver: true,
            duration: 200,
          }).start(() => {
            position.setValue({ x: 0, y: 0 });
          });
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            friction: 5,
            tension: 80,
          }).start();
        }
      },
    })
  ).current;

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, SCREEN_WIDTH / 2],
    outputRange: ['-12deg', '12deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const passOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, fullScreen && styles.containerFullScreen]}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.card,
          {
            width: cardWidth,
            height: cardHeight,
            borderRadius,
            transform: [
              { translateX: position.x },
              { translateY: position.y },
              { rotate },
            ],
          },
        ]}
      >
        <Animated.View pointerEvents="none" style={[styles.overlay, styles.likeOverlay, { opacity: likeOpacity, borderRadius }]}>
          <View style={styles.overlayTextWrap}>
            <Animated.Text style={styles.overlayText}>CURTIR</Animated.Text>
          </View>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.overlay, styles.passOverlay, { opacity: passOpacity, borderRadius }]}>
          <View style={styles.overlayTextWrap}>
            <Animated.Text style={styles.overlayText}>PASSAR</Animated.Text>
          </View>
        </Animated.View>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 24,
  },
  containerFullScreen: {
    flex: 1,
    marginBottom: 0,
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  card: {
    overflow: 'hidden',
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  likeOverlay: {
    left: 0,
    backgroundColor: 'rgba(13, 148, 136, 0.5)',
  },
  passOverlay: {
    right: 0,
    backgroundColor: 'rgba(225, 29, 72, 0.5)',
  },
  overlayTextWrap: {
    padding: 16,
  },
  overlayText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 6,
  },
});
