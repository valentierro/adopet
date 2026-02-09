import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import type { TutorStats } from '@adopet/shared';

type Props = {
  tutorStats: TutorStats;
  /** Exibir pontos e contagens (para perfil completo) */
  showDetails?: boolean;
  /** Tamanho compacto (só título) vs normal */
  compact?: boolean;
};

const LEVEL_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  BEGINNER: 'paw-outline',
  ACTIVE: 'paw',
  TRUSTED: 'ribbon-outline',
  STAR: 'star',
  GOLD: 'trophy',
};

export function TutorLevelBadge({ tutorStats, showDetails = false, compact = true }: Props) {
  const { colors } = useTheme();
  const icon = LEVEL_ICON[tutorStats.level] ?? 'ribbon-outline';

  if (compact) {
    return (
      <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
        <Ionicons name={icon} size={14} color={colors.primary} />
        <Text style={[styles.title, { color: colors.primary }]} numberOfLines={1}>
          {tutorStats.title}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon} size={24} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{tutorStats.title}</Text>
      </View>
      {showDetails && (
        <View style={styles.details}>
          <Text style={[styles.points, { color: colors.primary }]}>{tutorStats.points} pts</Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            {tutorStats.verifiedCount} pet(s) verificados • {tutorStats.adoptedCount} adotado(s)
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 120,
  },
  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  details: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  points: {
    fontSize: 18,
    fontWeight: '800',
  },
  meta: {
    fontSize: 13,
    marginTop: 2,
  },
});
