import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../hooks/useTheme';
import { spacing } from '../theme';

const PILL_WIDTH = 28;
const PILL_HEIGHT = 4;
const TAB_PADDING_V = 8;

export function AnimatedTabBar({ state, navigation, descriptors }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const pillPosition = useRef(new Animated.Value(0)).current;
  const pillWidth = useRef(new Animated.Value(PILL_WIDTH)).current;
  const layouts = useRef<Record<number, { x: number; width: number }>>({}).current;

  const activeIndex = state.index;
  const routes = state.routes.filter((r) => {
    const opts = descriptors[r.key]?.options ?? {};
    if (opts.tabBarButton === false) return false;
    if (opts.href === null) return false;
    return true;
  });
  const visibleRoutes = routes.length > 0 ? routes : state.routes;
  const activeRouteKey = state.routes[state.index]?.key;
  const activeVisibleIndex = Math.max(0, visibleRoutes.findIndex((r) => r.key === activeRouteKey));

  useEffect(() => {
    const layout = layouts[activeVisibleIndex];
    if (layout && typeof layout.x === 'number') {
      const targetLeft = layout.x + layout.width / 2 - PILL_WIDTH / 2;
      Animated.spring(pillPosition, {
        toValue: targetLeft,
        useNativeDriver: false,
        friction: 8,
        tension: 120,
      }).start();
    }
  }, [activeVisibleIndex, layouts, pillPosition]);

  const handleLayout = (index: number) => (e: { nativeEvent: { layout: { x: number; width: number } } }) => {
    const { x, width } = e.nativeEvent.layout;
    layouts[index] = { x, width };
    if (index === activeVisibleIndex) {
      pillPosition.setValue(x + width / 2 - PILL_WIDTH / 2);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.tabBarBg,
          paddingBottom: Math.max(insets.bottom, 8) + 4,
          paddingTop: 10,
          minHeight: 56 + 10 + Math.max(insets.bottom, 8) + 4,
        },
      ]}
    >
      <View style={styles.tabsRow}>
        {visibleRoutes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.routes[state.index].key === route.key;
          const label = options.tabBarLabel ?? options.title ?? route.name;
          const icon = options.tabBarIcon?.({ focused, color: focused ? colors.primary : colors.textSecondary, size: 24 });
          const badge = options.tabBarBadge;

          return (
            <TouchableOpacity
              key={route.key}
              onLayout={handleLayout(index)}
              style={styles.tab}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              onLongPress={() => {
                navigation.emit({ type: 'tabLongPress', target: route.key });
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? String(label)}
            >
              <View style={styles.iconWrap}>
                <TabIconScale focused={focused}>{icon}</TabIconScale>
                {badge != null && (
                  <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.badgeText}>{typeof badge === 'number' ? (badge > 99 ? '99+' : badge) : badge}</Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.label,
                  { color: focused ? colors.primary : colors.textSecondary },
                  options.tabBarLabelStyle,
                ]}
                numberOfLines={1}
              >
                {String(label)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Animated.View
        style={[
          styles.pill,
          {
            backgroundColor: colors.primary,
            left: pillPosition,
            width: pillWidth,
          },
        ]}
      />
    </View>
  );
}

function TabIconScale({ focused, children }: { focused: boolean; children: React.ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.12 : 1,
      useNativeDriver: true,
      friction: 6,
      tension: 200,
    }).start();
  }, [focused, scale]);
  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowRadius: 8, shadowOpacity: 0.08 },
      android: { elevation: 8 },
    }),
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: TAB_PADDING_V,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconWrap: {
    position: 'relative',
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  pill: {
    position: 'absolute',
    bottom: TAB_PADDING_V + 2,
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
  },
});
