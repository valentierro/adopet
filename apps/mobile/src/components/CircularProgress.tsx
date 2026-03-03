import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type Props = {
  percent: number; // 0–100
  size?: number;
  strokeWidth?: number;
  strokeColor?: string;
  backgroundColor?: string;
  textColor?: string;
  showLabel?: boolean;
};

export function CircularProgress({
  percent,
  size = 88,
  strokeWidth = 6,
  strokeColor = '#0D9488',
  backgroundColor = 'rgba(0,0,0,0.08)',
  textColor = '#1C1917',
  showLabel = true,
}: Props) {
  const clamped = Math.min(100, Math.max(0, percent));
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cx})`}
        />
      </Svg>
      {showLabel && (
        <View style={[styles.labelWrap, { width: size, height: size }]} pointerEvents="none">
          <Text style={[styles.label, { color: textColor }]}>{Math.round(clamped)}%</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
  },
});
