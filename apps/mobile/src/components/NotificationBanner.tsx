import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

const SLIDE_DURATION_MS = 280;

type Props = {
  visible: boolean;
  title: string;
  body: string;
  onClose: () => void;
  autoHideAfterMs?: number;
  /** Se definido, toque no conteúdo do banner navega para a tela da notificação. */
  onPress?: () => void;
};

export function NotificationBanner({ visible, title, body, onClose, autoHideAfterMs, onPress }: Props) {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible || autoHideAfterMs == null || autoHideAfterMs <= 0) return;
    const t = setTimeout(() => handleClose(), autoHideAfterMs);
    return () => clearTimeout(t);
  }, [visible, autoHideAfterMs]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: -120,
      duration: SLIDE_DURATION_MS,
      useNativeDriver: true,
    }).start(() => {
      slideAnim.setValue(0);
      onClose();
    });
  };

  const handleContentPress = () => {
    if (onPress) {
      onPress();
      handleClose();
    }
  };

  useEffect(() => {
    if (visible) slideAnim.setValue(0);
  }, [visible]);

  if (!visible) return null;

  const content = (
    <View style={styles.content}>
      <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>{title}</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={2}>{body}</Text>
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.surface,
          borderLeftColor: colors.primary,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 8,
          shadowOpacity: 0.15,
          elevation: 4,
        },
        { transform: [{ translateY: slideAnim }] },
      ]}
      accessibilityRole="alert"
    >
      {onPress ? (
        <Pressable onPress={handleContentPress} style={styles.contentWrap}>
          {content}
        </Pressable>
      ) : (
        <View style={styles.contentWrap}>{content}</View>
      )}
      <TouchableOpacity onPress={handleClose} style={styles.close} hitSlop={12}>
        <Ionicons name="close" size={22} color={colors.textSecondary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderLeftWidth: 4,
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  content: { minWidth: 0 },
  contentWrap: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: '600' },
  body: { fontSize: 13, marginTop: 2 },
  close: { padding: 4 },
});
