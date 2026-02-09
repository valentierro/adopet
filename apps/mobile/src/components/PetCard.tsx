import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius } from '../theme';
import { StatusBadge } from './StatusBadge';
import { VerifiedBadge } from './VerifiedBadge';
import type { Pet } from '@adopet/shared';

type Props = {
  pet: Pet;
  onPress: () => void;
  onLike?: () => void;
  onPass?: () => void;
  showActions?: boolean;
};

const speciesLabel = { dog: 'Cachorro', cat: 'Gato' };
const sizeLabel = { small: 'P', medium: 'M', large: 'G', xlarge: 'GG' };

export function PetCard({
  pet,
  onPress,
  onLike,
  onPass,
  showActions = false,
}: Props) {
  const { colors } = useTheme();
  const photos = pet?.photos != null && Array.isArray(pet.photos) ? pet.photos : [];
  const photo = photos.length > 0 ? photos[0] : 'https://placedog.net/400/400';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.cardBg ?? colors.surface }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.imageWrap}>
        <Image source={{ uri: photo }} style={styles.image} contentFit="cover" />
        {pet.verified && (
          <View style={styles.verifiedWrap}>
            <VerifiedBadge size={32} />
          </View>
        )}
        <View style={styles.badges}>
          <StatusBadge
            label={pet.distanceKm != null ? `${pet.distanceKm.toFixed(1)} km` : '—'}
            variant="neutral"
          />
          <StatusBadge
            label={pet.vaccinated ? 'Vacinado' : 'Não vacinado'}
            variant={pet.vaccinated ? 'success' : 'warning'}
          />
        </View>
      </View>
      <View style={[styles.content, { borderTopColor: colors.surface }]}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {pet.name}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {speciesLabel[pet.species]} • {pet.age} ano(s) • {sizeLabel[pet.size]}
        </Text>
        {pet.description ? (
          <Text
            style={[styles.description, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {pet.description}
          </Text>
        ) : null}
        {showActions && onLike && onPass ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.accent + '30' }]}
              onPress={onPass}
            >
              <Text style={[styles.actionText, { color: colors.accent }]}>Passar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary + '30' }]}
              onPress={onLike}
            >
              <Text style={[styles.actionText, { color: colors.primaryDark }]}>Curtir</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  imageWrap: {
    position: 'relative',
    height: 200,
    width: '100%',
  },
  verifiedWrap: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badges: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  content: {
    padding: spacing.md,
    borderTopWidth: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  meta: {
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
