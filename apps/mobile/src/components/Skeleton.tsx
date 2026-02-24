import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';

type Props = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export function Skeleton({ width = '100%', height = 16, borderRadius = 6, style }: Props) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.surface,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Placeholder para um card do feed (foto + texto). */
export function FeedSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.feedCard, { backgroundColor: colors.surface }]}>
      <Skeleton height={400} borderRadius={0} style={styles.feedImage} />
      <View style={styles.feedInfo}>
        <Skeleton width={160} height={24} style={{ marginBottom: 8 }} />
        <Skeleton width={120} height={16} />
      </View>
    </View>
  );
}

/** Placeholder para uma linha de lista (avatar + linhas). */
export function ListRowSkeleton() {
  return (
    <View style={styles.listRow}>
      <Skeleton width={56} height={56} borderRadius={8} />
      <View style={styles.listRowBody}>
        <Skeleton width="70%" height={16} style={{ marginBottom: 6 }} />
        <Skeleton width="50%" height={14} />
      </View>
    </View>
  );
}

/** Grid 2 colunas para loading do marketplace (6 cards). */
export function MarketplaceGridSkeleton({
  cardWidth,
  gap = 12,
}: {
  cardWidth: number;
  gap?: number;
}) {
  const cardHeight = cardWidth + 56;
  return (
    <View style={styles.gridSkeleton}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={[
            styles.gridSkeletonCard,
            {
              width: cardWidth,
              height: cardHeight,
              marginRight: i % 2 === 0 ? gap : 0,
              marginBottom: gap,
            },
          ]}
        >
          <Skeleton width={cardWidth - 16} height={cardWidth - 16} borderRadius={10} style={styles.gridSkeletonImage} />
          <Skeleton width="80%" height={14} style={{ marginTop: 8, marginHorizontal: 8 }} />
          <Skeleton width="60%" height={12} style={{ marginTop: 4, marginHorizontal: 8 }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  feedCard: {
    flex: 1,
    minHeight: 400,
    overflow: 'hidden',
  },
  feedImage: {
    width: '100%',
  },
  feedInfo: {
    padding: 16,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  listRowBody: {
    flex: 1,
  },
  gridSkeleton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  gridSkeletonCard: {
    borderRadius: 14,
    overflow: 'hidden',
    paddingTop: 8,
    alignItems: 'center',
  },
  gridSkeletonImage: {
    alignSelf: 'center',
  },
});
