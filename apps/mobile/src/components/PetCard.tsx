import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
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
const sexLabel = { male: 'M', female: 'F' };

function formatListingDate(iso: string | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '';
  }
}

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
            <VerifiedBadge size={32} iconBackgroundColor={colors.primary} />
          </View>
        )}
        {pet.partner && (
          <View style={[styles.partnerBadge, { backgroundColor: (pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? 'rgba(251, 191, 36, 0.95)' : 'rgba(217, 119, 6, 0.92)' }]}>
            <Ionicons name={(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? 'star' : 'heart'} size={12} color="#fff" />
            <Text style={styles.partnerBadgeText}>{(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? 'Patrocinado' : 'Parceiro'}</Text>
          </View>
        )}
        <View style={styles.badges}>
          {pet.distanceKm != null && (
            <StatusBadge label={`${pet.distanceKm.toFixed(1)} km`} variant="neutral" />
          )}
          {pet.city && pet.distanceKm == null && (
            <StatusBadge label={pet.city} variant="neutral" />
          )}
          <StatusBadge
            label={pet.vaccinated ? 'Vacinado' : 'Não vacinado'}
            variant={pet.vaccinated ? 'success' : 'warning'}
          />
          {typeof pet.neutered === 'boolean' && (
            <StatusBadge
              label={pet.neutered ? 'Castrado' : 'Não castrado'}
              variant={pet.neutered ? 'success' : 'warning'}
            />
          )}
        </View>
      </View>
      <View style={[styles.content, { borderTopColor: colors.surface }]}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {pet.name}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {speciesLabel[pet.species]} • {pet.age} ano(s) • {sizeLabel[pet.size]} • {sexLabel[pet.sex]}
        </Text>
        {(pet.createdAt || pet.city) && (
          <View style={styles.summaryRow}>
            {pet.createdAt ? (
              <View style={styles.summaryItem}>
                <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
                <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                  Publicado em {formatListingDate(pet.createdAt)}
                </Text>
              </View>
            ) : null}
            {pet.city ? (
              <View style={styles.summaryItem}>
                <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
                <Text style={[styles.summaryText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {pet.city}
                </Text>
              </View>
            ) : null}
          </View>
        )}
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
  partnerBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    zIndex: 1,
  },
  partnerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
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
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryText: {
    fontSize: 12,
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
