import React, { useState, useRef, useEffect } from 'react';
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
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { getMatchScoreColor } from '../utils/matchScoreColor';
import { getSpeciesLabel, getSizeLabel } from '../utils/petLabels';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { VerifiedBadge } from './VerifiedBadge';
import type { Pet } from '@adopet/shared';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

export const FeedCard = React.memo(function FeedCard({ pet, onPress, onLike, onPass, height: cardHeight, wrapInTouchable = true, showActions = true }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const photos = pet.photos?.length ? pet.photos : ['https://picsum.photos/seed/feed/800/1200'];
  const [photoIndex, setPhotoIndex] = useState(0);
  const galleryRef = useRef<FlatList<string> | null>(null);
  const h = cardHeight ?? SCREEN_HEIGHT;
  const badgeAnim = useRef(new Animated.Value(0)).current;
  const likeScale = useRef(new Animated.Value(1)).current;
  const likeFilled = useRef(new Animated.Value(0)).current;
  const passShake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(badgeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [badgeAnim]);

  const handleLike = () => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(likeScale, { toValue: 1.25, useNativeDriver: true, friction: 4, tension: 200 }),
        Animated.timing(likeFilled, { toValue: 1, duration: 80, useNativeDriver: true }),
      ]),
      Animated.spring(likeScale, { toValue: 1, useNativeDriver: true, friction: 5 }),
    ]).start(() => {
      likeFilled.setValue(0);
      onLike();
    });
  };

  const handlePass = () => {
    Animated.sequence([
      Animated.timing(passShake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(passShake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start(() => onPass());
  };
  const passTranslateX = passShake.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -8, 8],
  });

  const photoFade = useRef(new Animated.Value(1)).current;
  const prevPhotoIndexRef = useRef(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    const next = Math.min(i, photos.length - 1);
    if (next !== prevPhotoIndexRef.current) {
      prevPhotoIndexRef.current = next;
      photoFade.setValue(0);
      Animated.timing(photoFade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    }
    setPhotoIndex(next);
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
            renderItem={({ item, index }) => (
              <View style={[styles.slide, { width: SCREEN_WIDTH, height: h }]}>
                <Animated.View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      opacity: photoIndex === index ? photoFade : 1,
                    },
                  ]}
                >
                  <Image source={{ uri: item }} style={[styles.image, { width: SCREEN_WIDTH, height: h }]} contentFit="cover" />
                </Animated.View>
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
              style={[styles.dot, i === photoIndex && styles.dotActive]}
            />
          ))}
        </View>

      {pet.verified && (
        <Animated.View
          style={[
            styles.topLeftBadge,
            { top: wrapInTouchable ? insets.top + 12 : insets.top + 4 },
            {
              opacity: badgeAnim,
              transform: [{ scale: badgeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
            },
          ]}
          accessibilityLabel="Pet verificado"
        >
          <VerifiedBadge variant="pet" size={53} iconBackgroundColor="rgba(255,255,255,0.95)" />
        </Animated.View>
      )}

      <Animated.View
        style={[
          styles.topRightBadges,
          { top: wrapInTouchable ? insets.top + 12 : insets.top + 4 },
          {
            opacity: badgeAnim,
            transform: [{ scale: badgeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
          },
        ]}
      >
        {photos.length > 1 && (
          <View style={styles.galleryBadge}>
            <Ionicons name="images" size={18} color="#fff" />
            <Text style={styles.galleryBadgeText}>{photos.length}</Text>
          </View>
        )}
        {wrapInTouchable && pet.partner != null && (
          <View
            style={[
              styles.partnerBadgeTop,
              {
                backgroundColor: (pet.partner as { isPaidPartner?: boolean }).isPaidPartner
                  ? 'rgba(251, 191, 36, 0.92)'
                  : 'rgba(217, 119, 6, 0.92)',
              },
            ]}
          >
            {(pet.partner as { logoUrl?: string }).logoUrl ? (
              <Image source={{ uri: (pet.partner as { logoUrl: string }).logoUrl }} style={styles.partnerBadgeTopLogo} contentFit="contain" />
            ) : (
              <Ionicons
                name={(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? 'star' : 'heart'}
                size={14}
                color="#fff"
              />
            )}
            <Text style={styles.partnerBadgeTopText}>
              {(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? 'Patrocinado' : 'Parceiro'}
            </Text>
          </View>
        )}
        {pet.matchScore != null && (
          <View style={[styles.matchBadge, { backgroundColor: getMatchScoreColor(pet.matchScore) + 'e6' }]}>
            <Ionicons name="speedometer-outline" size={16} color="#fff" />
            <Text style={styles.matchBadgeText}>{pet.matchScore}%</Text>
          </View>
        )}
      </Animated.View>

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
          </View>
          {pet.partner ? (
            <View style={[styles.partnerBadge, { backgroundColor: (pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? 'rgba(251, 191, 36, 0.5)' : 'rgba(217, 119, 6, 0.92)' }]}>
              {(pet.partner as { logoUrl?: string }).logoUrl ? (
                <Image source={{ uri: (pet.partner as { logoUrl: string }).logoUrl }} style={styles.partnerBadgeLogo} contentFit="contain" />
              ) : (
                <Ionicons name={(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? 'star' : 'heart'} size={12} color="#fff" />
              )}
              <Text style={styles.partnerBadgeText}>{(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? 'Patrocinado' : 'Parceiro'}</Text>
            </View>
          ) : null}
          <Text style={styles.meta}>
            {getSpeciesLabel(pet.species)}
            {pet.breed?.trim() ? ` • ${pet.breed.trim()}` : ''} • {pet.age} ano(s) • {getSizeLabel(pet.size) || '—'}
          </Text>
          {(pet.energyLevel || pet.temperament || pet.goodWithChildren === 'YES' || pet.isDocile || pet.isTrained) && (
            <Text style={styles.triageMeta}>
              {[
                pet.energyLevel && { LOW: 'Calmo', MEDIUM: 'Moderado', HIGH: 'Agitado' }[pet.energyLevel],
                pet.temperament && { CALM: 'Tranquilo', PLAYFUL: 'Brincalhão', SHY: 'Tímido', SOCIABLE: 'Sociável', INDEPENDENT: 'Independente' }[pet.temperament],
                pet.goodWithChildren === 'YES' && 'Dá bem com crianças',
                pet.isDocile && 'Dócil',
                pet.isTrained && 'Adestrado',
              ].filter(Boolean).join(' • ')}
            </Text>
          )}
          {(pet.distanceKm != null || pet.city) && (
            <View style={styles.distanceRow}>
              <Ionicons name="location" size={14} color="rgba(255,255,255,0.9)" />
              {pet.city ? <Text style={styles.distance}>{pet.city}</Text> : null}
              {pet.city && pet.distanceKm != null ? <Text style={styles.distance}> • </Text> : null}
              {typeof pet.distanceKm === 'number' && Number.isFinite(pet.distanceKm) && (
                <Text style={styles.distance}>{pet.distanceKm.toFixed(1)} km</Text>
              )}
            </View>
          )}
          {pet.viewCountLast24h != null && pet.viewCountLast24h >= 1 && (
            <Text style={styles.viewCountText}>
              {pet.viewCountLast24h} {pet.viewCountLast24h === 1 ? 'pessoa viu' : 'pessoas viram'} nas últimas 24h
            </Text>
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
            onPress={handlePass}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Animated.View style={{ transform: [{ translateX: passTranslateX }] }}>
              <Ionicons name="close" size={36} color={colors.accent} />
            </Animated.View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.likeBtn]}
            onPress={handleLike}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
              <Animated.View style={[styles.likeIconWrap, { opacity: likeFilled }]}>
                <Ionicons name="heart" size={32} color={colors.primary} />
              </Animated.View>
              <Animated.View style={[styles.likeIconWrap, { opacity: likeFilled.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
                <Ionicons name="heart-outline" size={32} color={colors.primary} />
              </Animated.View>
            </Animated.View>
          </TouchableOpacity>
        </View>
      )}
    </CardWrapper>
  );
});

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
  topLeftBadge: {
    position: 'absolute',
    left: 12,
    zIndex: 5,
  },
  topRightBadges: {
    position: 'absolute',
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 5,
  },
  galleryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  galleryBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  partnerBadgeLogo: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  partnerBadgeTopLogo: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  partnerBadgeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  partnerBadgeTopText: {
    color: '#fff',
    fontSize: 12,
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
  triageMeta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
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
  viewCountText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
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
  likeIconWrap: {
    position: 'absolute',
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
