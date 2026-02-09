import React, { forwardRef } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { spacing } from '../theme';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  onRefresh?: () => void;
  refreshing?: boolean;
};

export const ScreenContainer = forwardRef<ScrollView, Props>(function ScreenContainer(
  { children, scroll = false, style, contentContainerStyle, onRefresh, refreshing = false },
  ref,
) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const containerStyle = [
    styles.container,
    {
      backgroundColor: colors.background,
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingLeft: insets.left + spacing.md,
      paddingRight: insets.right + spacing.md,
    },
    style,
  ];

  if (scroll) {
    return (
      <ScrollView
        ref={ref}
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom + spacing.lg,
            paddingHorizontal: spacing.md + insets.left,
          },
          contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    );
  }

  return <View style={containerStyle}>{children}</View>;
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
