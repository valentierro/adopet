import { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer, LoadingLogo, VerifiedBadge } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/authStore';
import { getMe, getTutorStats, getMyAdoptions, getPreferences, getPendingAdoptionConfirmations } from '../../src/api/me';
import { getMinePets } from '../../src/api/pets';
import { getFavorites } from '../../src/api/favorites';
import { getConversations } from '../../src/api/conversations';
import { getPassedPets } from '../../src/api/swipes';
import { fetchFeed } from '../../src/api/feed';
import { spacing } from '../../src/theme';

const LogoLight = require('../../assets/brand/logo/logo_horizontal_light.png');
const LogoDark = require('../../assets/brand/logo/logo_dark.png');

function useDashboardData() {
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({});
          setUserCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        } catch {
          setUserCoords(null);
        }
      }
    })();
  }, []);

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: getMe, staleTime: 60_000 });
  const hasUser = !!user?.id;
  const { data: prefs } = useQuery({
    queryKey: ['me', 'preferences'],
    queryFn: getPreferences,
    staleTime: 5 * 60_000,
    enabled: hasUser,
  });
  const { data: tutorStats } = useQuery({
    queryKey: ['me', 'tutor-stats'],
    queryFn: getTutorStats,
    staleTime: 60_000,
    enabled: hasUser,
  });
  const { data: minePage, refetch: refetchMine } = useQuery({
    queryKey: ['pets', 'mine'],
    queryFn: () => getMinePets({}),
    staleTime: 60_000,
    enabled: hasUser,
  });
  const { data: favoritesPage, refetch: refetchFav } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => getFavorites(),
    staleTime: 60_000,
    enabled: hasUser,
  });
  const { data: conversations = [], refetch: refetchConv } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
    staleTime: 60_000,
    enabled: hasUser,
  });
  const { data: feedData, refetch: refetchFeed } = useQuery({
    queryKey: ['feed', null, prefs?.radiusKm, 'BOTH', userCoords?.lat, userCoords?.lng],
    queryFn: () =>
      fetchFeed({
        ...(userCoords && { lat: userCoords.lat, lng: userCoords.lng }),
        radiusKm: prefs?.radiusKm ?? 50,
        species: 'BOTH',
      }),
    staleTime: 2 * 60_000,
    enabled: hasUser,
  });
  const { data: adoptionsData, refetch: refetchAdoptions } = useQuery({
    queryKey: ['me', 'adoptions'],
    queryFn: getMyAdoptions,
    staleTime: 60_000,
    enabled: hasUser,
  });
  const { data: passedData, refetch: refetchPassed } = useQuery({
    queryKey: ['swipes', 'passed'],
    queryFn: getPassedPets,
    staleTime: 60_000,
    enabled: hasUser,
  });
  const { data: pendingConfirmationsData, refetch: refetchPendingConfirmations } = useQuery({
    queryKey: ['me', 'pending-adoption-confirmations'],
    queryFn: getPendingAdoptionConfirmations,
    staleTime: 60_000,
    enabled: hasUser,
  });

  const myPets = minePage?.items ?? [];
  const myAdoptionsCount = adoptionsData?.items?.length ?? 0;
  const favoritesCount = Array.isArray(favoritesPage?.items) ? favoritesPage.items.length : 0;
  const unreadTotal = conversations.reduce((s, c) => s + (c.unreadCount ?? 0), 0);
  const passedCount = passedData?.items?.length ?? 0;
  const feedPreviewItems = feedData?.items ?? [];
  const feedTotalCount = feedData?.totalCount;

  const pendingConfirmations = pendingConfirmationsData?.items ?? [];
  const [refreshing, setRefreshing] = useState(false);
  const refetchAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchMine(),
      refetchFav(),
      refetchConv(),
      refetchFeed(),
      refetchAdoptions(),
      refetchPassed(),
      refetchPendingConfirmations(),
    ]);
    setRefreshing(false);
  }, [refetchMine, refetchFav, refetchConv, refetchFeed, refetchAdoptions, refetchPassed, refetchPendingConfirmations]);

  return {
    user,
    tutorStats,
    myPetsCount: myPets.length,
    myAdoptionsCount,
    pendingConfirmations,
    favoritesCount,
    conversationsCount: conversations.length,
    unreadTotal,
    passedCount,
    feedPreviewItems,
    feedTotalCount,
    pendingConfirmations,
    refetchAll,
    refreshing,
  };
}

const GAMIFICATION_LEVELS: { pts: number; title: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { pts: 0, title: 'Tutor Iniciante', icon: 'paw-outline' },
  { pts: 25, title: 'Tutor Ativo', icon: 'paw' },
  { pts: 75, title: 'Tutor Confiável', icon: 'ribbon-outline' },
  { pts: 150, title: 'Tutor Destaque', icon: 'star' },
  { pts: 300, title: 'Tutor Ouro', icon: 'trophy' },
];

const TUTOR_LEVEL_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  BEGINNER: 'paw-outline',
  ACTIVE: 'paw',
  TRUSTED: 'ribbon-outline',
  STAR: 'star',
  GOLD: 'trophy',
};

export default function DashboardScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height: windowHeight } = useWindowDimensions();
  const cardGap = spacing.md;
  const cardWidth = (width - spacing.lg * 2 - cardGap) / 2;
  const [showGamificationModal, setShowGamificationModal] = useState(false);
  const modalHeight = Math.min(windowHeight * 0.82, 560);

  const {
    user,
    tutorStats,
    myPetsCount,
    myAdoptionsCount,
    favoritesCount,
    conversationsCount,
    unreadTotal,
    passedCount,
    feedPreviewItems,
    feedTotalCount,
    pendingConfirmations,
    refetchAll,
    refreshing,
  } = useDashboardData();

  useFocusEffect(
    useCallback(() => {
      refetchAll();
    }, [refetchAll]),
  );

  const setUser = useAuthStore((s) => s.setUser);
  const { data: _u, isLoading, isError, refetch: refetchMe } = useQuery({ queryKey: ['me'], queryFn: getMe, retry: 1 });
  const firstName = user?.name?.trim().split(/\s+/)[0] || '';

  useEffect(() => {
    if (user) setUser(user);
  }, [user, setUser]);

  if (isLoading && !user) {
    return (
      <ScreenContainer>
        <LoadingLogo size={160} />
      </ScreenContainer>
    );
  }

  if (!user && !isLoading && isError) {
    return (
      <ScreenContainer>
        <View style={[styles.errorWrap, { paddingHorizontal: spacing.lg }]}>
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Não foi possível carregar seus dados</Text>
          <Text style={[styles.errorSub, { color: colors.textSecondary }]}>Verifique sua conexão e tente novamente.</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={() => refetchMe()} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const cards: {
    id: string;
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    route: string;
    gradient?: [string, string];
    badge?: number;
    fullWidth?: boolean;
  }[] = [
    {
      id: 'feed',
      title: 'Descobrir pets',
      subtitle:
        typeof feedTotalCount === 'number'
          ? feedTotalCount === 0
            ? 'Nenhum pet no momento na sua região'
            : `${feedTotalCount} disponível${feedTotalCount !== 1 ? 'eis' : ''}`
          : 'Deslize, curta e encontre seu match',
      icon: 'paw',
      route: '/feed',
      gradient: [colors.primary, colors.primaryDark || colors.primary],
      fullWidth: true,
    },
    {
      id: 'my-pets',
      title: 'Meus anúncios',
      subtitle: myPetsCount === 0 ? 'Nenhum anúncio' : `${myPetsCount} anúncio${myPetsCount !== 1 ? 's' : ''}`,
      icon: 'megaphone-outline',
      route: '/my-pets',
      badge: myPetsCount > 0 ? myPetsCount : undefined,
    },
    {
      id: 'adopted',
      title: 'Minhas adoções',
      subtitle: myAdoptionsCount === 0 ? 'Nenhuma adoção' : `${myAdoptionsCount} adoção${myAdoptionsCount !== 1 ? 'ões' : ''}`,
      icon: 'heart-circle',
      route: '/my-adoptions',
      badge: myAdoptionsCount > 0 ? myAdoptionsCount : undefined,
    },
    {
      id: 'favorites',
      title: 'Favoritos',
      subtitle: favoritesCount === 0 ? 'Nenhum favorito' : `${favoritesCount} pet${favoritesCount !== 1 ? 's' : ''}`,
      icon: 'heart',
      route: '/favorites',
      badge: favoritesCount > 0 ? favoritesCount : undefined,
    },
    {
      id: 'chats',
      title: 'Conversas',
      subtitle: conversationsCount === 0 ? 'Nenhuma conversa' : `${conversationsCount} conversa${conversationsCount !== 1 ? 's' : ''}`,
      icon: 'chatbubbles',
      route: '/chats',
      badge: unreadTotal > 0 ? unreadTotal : undefined,
    },
    {
      id: 'passed',
      title: 'Pets que passou',
      subtitle: passedCount === 0 ? 'Nenhum na lista' : `${passedCount} pet${passedCount !== 1 ? 's' : ''} para rever`,
      icon: 'arrow-undo',
      route: '/passed-pets',
      badge: passedCount > 0 ? passedCount : undefined,
    },
    {
      id: 'map',
      title: 'Ver no mapa',
      subtitle: 'Pets na região',
      icon: 'map',
      route: '/map',
    },
    {
      id: 'partnersArea',
      title: 'Ofertas dos parceiros',
      subtitle: 'Serviços e cupons de clínicas e lojas',
      icon: 'pricetag',
      route: '/partners-area',
      gradient: ['#d97706', '#b45309'],
      fullWidth: true,
    },
    {
      id: 'partnerOng',
      title: 'Sou ONG ou instituição',
      subtitle: 'Parceria gratuita para abrigos e instituições',
      icon: 'heart',
      route: '/seja-parceiro-ong',
      gradient: ['#d97706', '#b45309'],
      fullWidth: true,
    },
    {
      id: 'partnerComercial',
      title: 'Clínicas, veterinários, lojas',
      subtitle: 'Planos com destaque e preços no app',
      icon: 'storefront',
      route: '/seja-parceiro-comercial',
      gradient: ['#d97706', '#b45309'],
      fullWidth: true,
    },
  ];

  // Quem já é parceiro não vê os CTAs "Sou ONG" e "Clínicas, lojas" na tela inicial
  const cardsToShow = user?.partner
    ? cards.filter((c) => c.id !== 'partnerOng' && c.id !== 'partnerComercial')
    : cards;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.xl,
            paddingHorizontal: spacing.lg,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refetchAll} tintColor={colors.primary} />
        }
      >
        {pendingConfirmations.length > 0 ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/adoption-confirm')}
            style={styles.confirmBanner}
          >
            <View style={styles.confirmBannerContent}>
              <Ionicons name="paw" size={20} color="#fff" style={styles.confirmBannerIcon} />
              <Text style={styles.confirmBannerText} numberOfLines={2}>
                Você tem adoções não confirmadas
              </Text>
            </View>
            <View style={styles.confirmBannerButtonWrap}>
              <Text style={styles.confirmBannerButtonText}>Confirmar</Text>
            </View>
          </TouchableOpacity>
        ) : null}
        <LinearGradient
          colors={[colors.primary + '22', colors.primary + '08']}
          style={[styles.hero, { borderRadius: 20, overflow: 'hidden' }]}
        >
          <View style={styles.heroInner}>
            <Text style={[styles.hello, { color: colors.textSecondary }]}>Olá,</Text>
            <View style={styles.heroNameRow}>
              <View style={styles.heroNameWithBadge}>
                {user?.verified && <VerifiedBadge size={26} iconBackgroundColor={colors.primary} />}
                <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                  {firstName || 'Visitante'}
                </Text>
              </View>
              <Image
                source={isDark ? LogoDark : LogoLight}
                style={styles.heroLogo}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.heroTagline, { color: colors.textSecondary }]}>
              Encontre seu próximo companheiro
            </Text>
            {tutorStats ? (
              <View style={[styles.statsRow, { backgroundColor: colors.surface }]}>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.primary }]}>{tutorStats.points}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>pontos</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.textSecondary }]} />
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.primary }]}>{tutorStats.adoptedCount}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    {tutorStats.adoptedCount === 1 ? 'adoção' : 'adoções'}
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.textSecondary }]} />
                <View style={[styles.stat, styles.statTitleWrap]}>
                  <Ionicons
                    name={TUTOR_LEVEL_ICON[tutorStats.level] ?? 'paw-outline'}
                    size={20}
                    color={colors.primary}
                    style={styles.statTitleIcon}
                  />
                  <Text style={[styles.statTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {tutorStats.title}
                  </Text>
                </View>
                <TouchableOpacity
                  hitSlop={12}
                  onPress={() => setShowGamificationModal(true)}
                  style={styles.statInfoBtn}
                >
                  <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </LinearGradient>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Atalhos</Text>
        <View style={styles.grid}>
          {cardsToShow.map((card) => {
            const isFull = card.fullWidth;
            const isFeedCard = card.id === 'feed';
            const feedThumbs = isFeedCard ? feedPreviewItems.slice(0, 5).map((p) => p.photos?.[0]).filter(Boolean) as string[] : [];

            const content = isFeedCard && feedThumbs.length > 0 ? (
              <View style={styles.feedCardContent}>
                <View style={styles.feedCardTop}>
                  <View style={[styles.feedCardIconWrap, styles.iconWrapLight]}>
                    <Ionicons name="paw" size={28} color="#fff" />
                  </View>
                  <View style={styles.feedCardText}>
                    <Text style={[styles.feedCardTitle, { color: '#fff' }]} numberOfLines={1}>
                      {card.title}
                    </Text>
                    <Text style={[styles.feedCardSubtitle, { color: 'rgba(255,255,255,0.9)' }]} numberOfLines={1}>
                      {card.subtitle}
                    </Text>
                  </View>
                  <View style={styles.feedCardCta}>
                    <Text style={styles.feedCardCtaText}>Ver pets</Text>
                    <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.95)" />
                  </View>
                </View>
                <View style={styles.feedThumbsRow}>
                  {feedThumbs.map((uri, i) => (
                    <Image
                      key={`${uri}-${i}`}
                      source={{ uri }}
                      style={styles.feedThumb}
                    />
                  ))}
                  {(() => {
                  const total = feedTotalCount ?? feedPreviewItems.length;
                  const more = total > 5 ? total - 5 : 0;
                  return more > 0 ? (
                    <View style={[styles.feedThumb, styles.feedThumbMore]}>
                      <Text style={styles.feedThumbMoreText}>
                        +{more > 99 ? '99' : more}
                      </Text>
                    </View>
                  ) : null;
                })()}
                </View>
              </View>
            ) : isFeedCard && feedPreviewItems.length === 0 ? (
              <View style={styles.feedCardContent}>
                <View style={styles.feedCardTop}>
                  <View style={[styles.feedCardIconWrap, styles.iconWrapLight]}>
                    <Ionicons name="paw" size={28} color="#fff" />
                  </View>
                  <View style={styles.feedCardText}>
                    <Text style={[styles.feedCardTitle, { color: '#fff' }]} numberOfLines={1}>
                      {card.title}
                    </Text>
                    <Text style={[styles.feedCardSubtitle, { color: 'rgba(255,255,255,0.9)' }]} numberOfLines={1}>
                      Nenhum pet no momento na sua região
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.feedCardMapButton}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    router.push('/map');
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="map" size={18} color="#fff" />
                  <Text style={styles.feedCardMapButtonText}>Explorar no mapa</Text>
                </TouchableOpacity>
              </View>
            ) : card.id === 'partnerOng' || card.id === 'partnerComercial' || card.id === 'partnersArea' ? (
              <View style={styles.partnersCardRow}>
                <View style={[styles.partnersCardIconWrap, styles.iconWrapLight]}>
                  <Ionicons name={card.icon as any} size={28} color="#fff" />
                </View>
                <View style={styles.partnersCardText}>
                  <Text style={[styles.cardTitle, { color: '#fff', marginTop: 0 }]} numberOfLines={1}>
                    {card.title}
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: 'rgba(255,255,255,0.9)' }]} numberOfLines={2}>
                    {card.subtitle}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.cardContent}>
                {card.badge != null && card.badge > 0 ? (
                  <View style={[styles.badge, { backgroundColor: card.gradient ? 'rgba(255,255,255,0.25)' : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)') }]}>
                    <Text style={[styles.badgeText, { color: card.gradient ? '#fff' : colors.textPrimary }]}>
                      {card.badge > 99 ? '99+' : card.badge}
                    </Text>
                  </View>
                ) : null}
                <View style={[styles.iconWrap, card.gradient && styles.iconWrapLight]}>
                  <Ionicons
                    name={card.icon}
                    size={isFull ? 32 : 28}
                    color={card.gradient ? '#fff' : colors.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.cardTitle,
                    { color: card.gradient ? '#fff' : colors.textPrimary },
                  ]}
                  numberOfLines={1}
                >
                  {card.title}
                </Text>
                <Text
                  style={[
                    styles.cardSubtitle,
                    { color: card.gradient ? 'rgba(255,255,255,0.9)' : colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {card.subtitle}
                </Text>
              </View>
            );

            return (
              <TouchableOpacity
                key={card.id}
                style={[styles.cardWrap, isFull ? styles.cardWrapFull : { width: cardWidth }]}
                onPress={() => router.push(card.route as any)}
                activeOpacity={0.82}
              >
                {card.gradient ? (
                  <LinearGradient
                    colors={card.gradient as [string, string, ...string[]]}
                    style={[
                      styles.card,
                      isFull && styles.cardFull,
                      isFeedCard && (feedThumbs.length > 0 || feedPreviewItems.length === 0) && styles.cardFeedWithThumbs,
                    ]}
                  >
                    {content}
                  </LinearGradient>
                ) : (
                  <View style={[styles.card, { backgroundColor: colors.cardBg || colors.surface }, isFull && styles.cardFull]}>
                    {content}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(tabs)/add-pet')}
          activeOpacity={0.9}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.ctaButtonText}>Anunciar pet para adoção</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showGamificationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGamificationModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowGamificationModal(false)}
          />
          <View
            style={[styles.gamificationModal, { backgroundColor: colors.surface, height: modalHeight }]}
          >
            <View style={[styles.gamificationModalHeader, { flexShrink: 0 }]}>
              <Text style={[styles.gamificationModalTitle, { color: colors.textPrimary }]}>
                Como funciona sua pontuação
              </Text>
              <TouchableOpacity
                hitSlop={12}
                onPress={() => setShowGamificationModal(false)}
                style={styles.gamificationModalClose}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.gamificationModalBody}
              contentContainerStyle={styles.gamificationModalBodyContent}
              showsVerticalScrollIndicator={true}
              bounces={false}
            >
              <Text style={[styles.gamificationModalP, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Pontos</Text> — Você ganha pontos quando seus pets recebem o selo de verificação do Adopet (10 pts por pet) e quando uma adoção é confirmada pela equipe (25 pts por adoção). Há bônus na primeira adoção e em marcos como 3ª, 5ª e 10ª adoção.
              </Text>
              <Text style={[styles.gamificationModalP, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Adoções</Text> — É a quantidade de pets que você já doou e que tiveram a adoção confirmada.
              </Text>
              <Text style={[styles.gamificationModalP, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Título</Text> — Seu nível como tutor, baseado nos pontos acumulados:
              </Text>
              <View style={[styles.gamificationLevels, { backgroundColor: colors.surface, borderColor: colors.primary + '40' }]}>
                <View style={[styles.gamificationLevelHeader, { backgroundColor: colors.primary + '18', borderBottomColor: colors.primary + '50' }]}>
                  <Text style={[styles.gamificationLevelHeaderPts, { color: colors.primary }]}>Pontos</Text>
                  <Text style={[styles.gamificationLevelHeaderTitle, { color: colors.textPrimary }]}>Título</Text>
                </View>
                {GAMIFICATION_LEVELS.map(({ pts, title, icon }, idx) => (
                  <View
                    key={title}
                    style={[
                      styles.gamificationLevelRow,
                      { borderBottomColor: colors.textSecondary + '30' },
                      idx === GAMIFICATION_LEVELS.length - 1 && styles.gamificationLevelRowLast,
                    ]}
                  >
                    <Text style={[styles.gamificationLevelPts, { color: colors.primary }]}>{pts} pts</Text>
                    <View style={styles.gamificationLevelTitleWrap}>
                      <Ionicons name={icon} size={18} color={colors.primary} style={styles.gamificationLevelIcon} />
                      <Text style={[styles.gamificationLevelTitle, { color: colors.textPrimary }]}>{title}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity
              style={[styles.gamificationModalBtn, { backgroundColor: colors.primary, flexShrink: 0 }]}
              onPress={() => setShowGamificationModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.gamificationModalBtnText}>Entendi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: spacing.xl },
  confirmBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EA580C',
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  confirmBannerContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginRight: spacing.md },
  confirmBannerIcon: {},
  confirmBannerText: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },
  confirmBannerButtonWrap: {
    backgroundColor: '#059669',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
  },
  confirmBannerButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  hero: {
    marginBottom: spacing.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  heroInner: {},
  heroNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, minHeight: 32 },
  heroNameWithBadge: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0, marginRight: spacing.sm, gap: 6 },
  heroLogo: { height: 26, width: 90 },
  hello: { fontSize: 14, marginBottom: 2 },
  name: { fontSize: 22, fontWeight: '700', letterSpacing: 0.3, flex: 1, minWidth: 0 },
  heroTagline: { fontSize: 13, marginTop: 4 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
  },
  stat: { flex: 1, alignItems: 'center' },
  statTitleWrap: { flex: 1.2, minWidth: 0, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  statTitleIcon: { marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 2 },
  statTitle: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  statDivider: { width: 1, height: 24, opacity: 0.3, marginHorizontal: spacing.xs },
  statInfoBtn: { padding: spacing.xs, marginLeft: spacing.xs },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  gamificationModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
  },
  gamificationModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  gamificationModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    paddingRight: spacing.md,
  },
  gamificationModalClose: { padding: spacing.xs },
  gamificationModalBody: {
    flex: 1,
    minHeight: 0,
  },
  gamificationModalBodyContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  gamificationModalP: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  gamificationLevels: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: spacing.sm,
    borderWidth: 1,
  },
  gamificationLevelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1.5,
  },
  gamificationLevelHeaderPts: { fontSize: 12, fontWeight: '800', width: 56, textTransform: 'uppercase', letterSpacing: 0.5 },
  gamificationLevelHeaderTitle: { fontSize: 12, fontWeight: '800', flex: 1, textTransform: 'uppercase', letterSpacing: 0.5 },
  gamificationLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  gamificationLevelRowLast: { borderBottomWidth: 0 },
  gamificationLevelPts: { fontSize: 14, fontWeight: '700', width: 56 },
  gamificationLevelTitleWrap: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  gamificationLevelIcon: { marginRight: 8 },
  gamificationLevelTitle: { fontSize: 14, fontWeight: '600', flex: 1 },
  gamificationModalBtn: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 14,
    alignItems: 'center',
  },
  gamificationModalBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  cardWrap: {},
  cardWrapFull: { width: '100%' },
  card: {
    borderRadius: 16,
    minHeight: 112,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0.06,
    elevation: 3,
  },
  cardFull: { width: '100%' },
  cardFeedWithThumbs: { minHeight: 150 },
  partnersCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    flex: 1,
  },
  partnersCardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnersCardText: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'flex-end',
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  iconWrap: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapLight: { backgroundColor: 'rgba(255,255,255,0.25)' },
  cardTitle: { fontSize: 15, fontWeight: '700', marginTop: 28 },
  cardSubtitle: { fontSize: 12, marginTop: 2 },
  feedCardContent: { flex: 1, padding: spacing.md, justifyContent: 'space-between' },
  feedCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  feedCardIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  feedCardText: { flex: 1, marginLeft: spacing.sm, minWidth: 0, justifyContent: 'center' },
  feedCardCta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  feedCardCtaText: { color: 'rgba(255,255,255,0.95)', fontSize: 13, fontWeight: '600' },
  feedCardTitle: { fontSize: 15, fontWeight: '700' },
  feedCardSubtitle: { fontSize: 12, marginTop: 2 },
  feedThumbsRow: { flexDirection: 'row', gap: 6, marginTop: spacing.xs },
  feedThumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.15)' },
  feedThumbMore: { alignItems: 'center', justifyContent: 'center' },
  feedThumbMoreText: { color: 'rgba(255,255,255,0.95)', fontSize: 14, fontWeight: '700' },
  feedCardMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  feedCardMapButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xl },
  errorTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.sm, textAlign: 'center' },
  errorSub: { fontSize: 15, textAlign: 'center', marginBottom: spacing.lg },
  retryBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: 12 },
  retryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    shadowOpacity: 0.12,
    elevation: 4,
  },
  ctaButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
