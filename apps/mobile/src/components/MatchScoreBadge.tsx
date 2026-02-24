import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { getMatchScoreColor } from '../utils/matchScoreColor';

export type MatchScoreData = {
  score: number;
  highlights?: string[];
  concerns?: string[];
  criteriaCount: number;
};

type Props = {
  data: MatchScoreData | null | undefined;
  contextLabel?: string;
  size?: 'small' | 'medium';
  showTooltip?: boolean;
  forceModalOpen?: boolean;
  onClose?: () => void;
};

export function MatchScoreBadge({ data, contextLabel, size = 'medium', showTooltip, forceModalOpen, onClose }: Props) {
  const { colors } = useTheme();
  if (data == null || data.criteriaCount === 0) return null;
  const score = Math.max(0, Math.min(100, data.score));
  const hex = getMatchScoreColor(score);
  const isSmall = size === 'small';
  const label = contextLabel ? `${score}% match ${contextLabel}` : `${score}% match`;

  return (
    <View style={[styles.badge, { backgroundColor: hex + 'e6' }, isSmall && styles.badgeSmall]}>
      <Ionicons name="speedometer-outline" size={isSmall ? 12 : 14} color="#fff" />
      <Text style={[styles.text, isSmall && styles.textSmall]} numberOfLines={1}>
        {score}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  badgeSmall: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: 6 },
  text: { color: '#fff', fontSize: 13, fontWeight: '700' },
  textSmall: { fontSize: 11 },
});
