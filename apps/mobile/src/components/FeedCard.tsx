import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { VerifiedBadge } from './VerifiedBadge';
import type { Pet } from '@adopet/shared';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const speciesLabel: Record<string, string> = { dog: 'Cachorro', cat: 'Gato' };
const sizeLabel: Record<string, string> = { small: 'P', medium: 'M', large: 'G', xlarge: 'GG' };

type Props = {
  pet: Pet;
  onPress: () => void;
  onLike: () => void;
  onPass: () => void;
  /** Altura do card (evita rolagem; quando não informado usa tela inteira) */
  height?: number;
  /** Se false, usa View em vez de TouchableOpacity para o swipe do pai receber o gesto (tap continua via onPress do SwipeableCard) */
  wrapInTouchable?: boolean;
  /** Se false, não renderiza os botões de like/pass (use quando os botões ficam fora do card, ex. no feed) */
  showActions?: boolean;
};

export function FeedCard({ pet, onPress, onLike, onPass, height: cardHeight, wrapInTouchable = true, showActions = true }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const photos = pet.photos?.length ? pet.photos : ['https://placedog.net/800/1200'];
  const [photoIndex, setPhotoIndex] = useState(0);
  const galleryRef = useRef<FlatList<string> | null>(null);
  const h = cardHeight ?? SCREEN_HEIGHT;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setPhotoIndex(Math.min(i, photos.length - 1));
  };

  const goToPrevPhoto = () => {
    if (photos.length <= 1) return;
    const next = Math.max(0, photoIndex - 1);
    setPhotoIndex(next);
    galleryRef.current?.scrollToIndex({ index: next, animated: true });
  };

  const goToNextPhoto = () => {
    if (photos.length <= 1) return;
    const next = Math.min(photos.length - 1, photoIndex + 1);
    setPhotoIndex(next);
    galleryRef.current?.scrollToIndex({ index: next, animated: true });
  };

  const gradientHeight = 200;
  const CardWrapper = wrapInTouchable ? TouchableOpacity : View;
  const wrapperProps = wrapInTouchable ? { onPress, activeOpacity: 1 } : {};

  return (
    <CardWrapper
      style={[styles.card, { width: SCREEN_WIDTH, height: h }]}
      {...wrapperProps}
    >
      {photos.length === 1 ? (
        <Image source={{ uri: photos[0] }} style={[styles.image, { width: SCREEN_WIDTH, height: h }]} contentFit="cover" />
      ) : (
        <>
          <FlatList
            ref={galleryRef}
            data={photos}
            horizontal
            pagingEnabled
            scrollEnabled={wrapInTouchable}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScroll}
            keyExtractor={(uri, i) => `${i}-${uri.slice(-20)}`}
            renderItem={({ item }) => (
              <View style={[styles.slide, { width: SCREEN_WIDTH, height: h }]}>
                <Image source={{ uri: item }} style={[styles.image, { width: SCREEN_WIDTH, height: h }]} contentFit="cover" />
              </View>
            )}
          />
          {!wrapInTouchable && photos.length > 1 && (
            <View style={[styles.galleryTapZones, { height: h }]} pointerEvents="box-none">
              <TouchableOpacity style={styles.galleryTapLeft} onPress={goToPrevPhoto} activeOpacity={1} />
              <TouchableOpacity style={styles.galleryTapRight} onPress={goToNextPhoto} activeOpacity={1} />
            </View>
          )}
        </>
      )}

      <View style={[styles.dots, { top: insets.top + 12 }]}>
          {photos.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === photoIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

      {photos.length > 1 && (
        <View style={[styles.galleryBadge, { top: insets.top + 12 }]}>
          <Ionicons name="images" size={18} color="#fff" />
          <Text style={styles.galleryBadgeText}>{photos.length}</Text>
        </View>
      )}

      <View
        style={[
          styles.gradientWrap,
          {
            height: gradientHeight + insets.bottom,
            paddingBottom: insets.bottom + 12,
          },
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {pet.name}
            </Text>
            {pet.verified && (
              <View style={styles.verifiedBadgeWrap}>
                <VerifiedBadge size={14} showLabel backgroundColor="rgba(255,255,255,0.95)" textColor="#1a1a1a" />
              </View>
            )}
          </View>
          {pet.partner ? (
            <View style={[styles.partnerBadge, { backgroundColor: (pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? 'rgba(251, 191, 36, 0.5)' : 'rgba(217, 119, 6, 0.92)' }]}>
              <Ionicons name={(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? 'star' : 'heart'} size={12} color="#fff" />
              <Text style={styles.partnerBadgeText}>{(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? 'Patrocinado' : 'Parceiro'}</Text>
            </View>
          ) : null}
          <Text style={styles.meta}>
            {speciesLabel[String(pet.species).toLowerCase()] ?? pet.species}
            {pet.breed?.trim() ? ` • ${pet.breed.trim()}` : ''} • {pet.age} ano(s) • {sizeLabel[pet.size] ?? pet.size}
          </Text>
          {(pet.distanceKm != null || pet.city) && (
            <View style={styles.distanceRow}>
              <Ionicons name="location" size={14} color="rgba(255,255,255,0.9)" />
              {pet.city ? <Text style={styles.distance}>{pet.city}</Text> : null}
              {pet.city && pet.distanceKm != null ? <Text style={styles.distance}> • </Text> : null}
              {pet.distanceKm != null && <Text style={styles.distance}>{pet.distanceKm.toFixed(1)} km</Text>}
            </View>
          )}
        </View>
      </View>

      {showActions && (
        <View
          style={[
            styles.actions,
            {
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.actionBtn, styles.passBtn]}
            onPress={onPass}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={36} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.likeBtn]}
            onPress={onLike}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="heart" size={32} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}
    </CardWrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  slide: {},
  image: {},
  galleryTapZones: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
  },
  galleryTapLeft: {
    width: '35%',
    flex: 0,
  },
  galleryTapRight: {
    width: '35%',
    flex: 0,
    marginLeft: 'auto',
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    zIndex: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  galleryBadge: {
    position: 'absolute',
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 5,
  },
  galleryBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  gradientWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
  },
  info: {
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  verifiedBadgeWrap: {
    alignSelf: 'flex-start',
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    flex: 1,
  },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 4,
  },
  partnerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  meta: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.95)',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  distance: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    paddingRight: 20,
  },
  actionBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, shadowOpacity: 0.25 },
      android: { elevation: 6 },
    }),
  },
  passBtn: {
    backgroundColor: '#fff',
  },
  likeBtn: {
    backgroundColor: '#fff',
  },
});
