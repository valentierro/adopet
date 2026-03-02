import { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { MapPin, FeedMapSpeciesFilter, PartnerMapPin } from '../../src/api/feed';
import { ScreenContainer, EmptyState, LoadingLogo, VerifiedBadge, StatusBadge, MatchScoreBadge } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { fetchFeedMap, fetchPartnerMap } from '../../src/api/feed';
import { getPreferences, updatePreferences, type PreferencesResponse } from '../../src/api/me';
import { getMatchScore } from '../../src/api/pets';
import { useAuthStore } from '../../src/stores/authStore';
import { useUpdateCityFromLocation } from '../../src/hooks/useUpdateCityFromLocation';
import { getFriendlyErrorMessage } from '../../src/utils/errorMessage';
import { getSizeLabel } from '../../src/utils/petLabels';
import { spacing } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

// Pins no mapa: PNG 48x48 gerados por: node scripts/resize-map-pin.js
const MapPinSmallIcon = require('../../assets/brand/icon/map_pin_small.png');
const PartnerOngPinIcon = require('../../assets/brand/icon/pin_ong_small.png');
const PartnerCommercialPinIcon = require('../../assets/brand/icon/petshop_small.png');

const DEFAULT_REGION = {
  latitude: -23.5505,
  longitude: -46.6333,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

const MAP_LAYER_OPTIONS: Array<{
  value: 'pets' | 'ong' | 'commercial';
  label: string;
  icon: number;
}> = [
  { value: 'pets', label: 'Pets', icon: MapPinSmallIcon },
  { value: 'ong', label: 'ONGs', icon: PartnerOngPinIcon },
  { value: 'commercial', label: 'Parceiros comerciais', icon: PartnerCommercialPinIcon },
];

const SPECIES_OPTIONS: { value: FeedMapSpeciesFilter; label: string }[] = [
  { value: 'BOTH', label: 'Todos' },
  { value: 'DOG', label: 'Cachorros' },
  { value: 'CAT', label: 'Gatos' },
];

const MAP_MIN_HEIGHT = Dimensions.get('window').height * 0.5;

const RADIUS_OPTIONS = [50, 100, 200, 300, 500];

const VALID_SPECIES: FeedMapSpeciesFilter[] = ['BOTH', 'DOG', 'CAT'];

export default function MapScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ species?: string; from?: string }>();
  const initialSpecies = VALID_SPECIES.includes((params.species ?? '') as FeedMapSpeciesFilter)
    ? (params.species as FeedMapSpeciesFilter)
    : 'BOTH';
  const { colors } = useTheme();

  useLayoutEffect(() => {
    if (params.from === 'feed') {
      navigation.setOptions({
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/feed')}
            style={{ padding: 8, marginLeft: 4 }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ),
      });
    }
  }, [params.from, navigation, router, colors.textPrimary]);

  const mapRef = useRef<MapView | null>(null);
  const [apiCenter, setApiCenter] = useState(DEFAULT_REGION);
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapLayer, setMapLayer] = useState<'pets' | 'ong' | 'commercial'>('pets');
  const [selectedPin, setSelectedPin] = useState<MapPin | PartnerMapPin | null>(null);
  const [speciesFilter, setSpeciesFilter] = useState<FeedMapSpeciesFilter>(initialSpecies);
  const [radiusKm, setRadiusKm] = useState(300);

  useEffect(() => {
    const next = VALID_SPECIES.includes((params.species ?? '') as FeedMapSpeciesFilter)
      ? (params.species as FeedMapSpeciesFilter)
      : 'BOTH';
    setSpeciesFilter(next);
  }, [params.species]);

  const hasAnimatedToUser = useRef(false);
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();

  const { data: prefs, refetch: refetchPrefs } = useQuery({
    queryKey: ['me', 'preferences'],
    queryFn: getPreferences,
    staleTime: 5 * 60_000,
    enabled: !!userId,
  });

  useEffect(() => {
    if (prefs?.radiusKm != null) setRadiusKm(prefs.radiusKm);
  }, [prefs?.radiusKm]);

  const updateRadiusMutation = useMutation({
    mutationFn: (newRadiusKm: number) =>
      updatePreferences({ ...(prefs ?? {}), radiusKm: newRadiusKm }),
    onSuccess: (data: PreferencesResponse) => {
      queryClient.setQueryData(['me', 'preferences'], data);
      queryClient.invalidateQueries({ queryKey: ['feed', 'map'] });
      queryClient.invalidateQueries({ queryKey: ['feed', 'map-partners'] });
    },
  });

  const handleRadiusPress = (km: number) => {
    setRadiusKm(km);
    if (userId) updateRadiusMutation.mutate(km);
  };

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['feed', 'map', apiCenter.latitude, apiCenter.longitude, radiusKm, speciesFilter],
    queryFn: () =>
      fetchFeedMap({
        lat: apiCenter.latitude,
        lng: apiCenter.longitude,
        radiusKm,
        species: speciesFilter,
      }),
    enabled: locationGranted === true && locationReady && mapReady && mapLayer === 'pets',
    staleTime: 60_000,
    retry: 5,
    retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 8000),
  });

  const { data: partnerData, isLoading: partnerLoading, isError: partnerError, error: partnerErr, refetch: refetchPartners, isRefetching: partnerRefetching } = useQuery({
    queryKey: ['feed', 'map-partners', apiCenter.latitude, apiCenter.longitude, radiusKm, mapLayer],
    queryFn: () =>
      fetchPartnerMap({
        lat: apiCenter.latitude,
        lng: apiCenter.longitude,
        radiusKm,
        type: mapLayer === 'ong' ? 'ONG' : mapLayer === 'commercial' ? 'COMMERCIAL' : undefined,
      }),
    enabled: locationGranted === true && locationReady && mapReady && (mapLayer === 'ong' || mapLayer === 'commercial'),
    staleTime: 60_000,
    retry: 5,
    retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 8000),
  });

  const isPetPin = (p: MapPin | PartnerMapPin | null): p is MapPin =>
    p != null && 'species' in p;
  const { data: matchScoreData } = useQuery({
    queryKey: ['match-score', selectedPin?.id, userId],
    queryFn: () => getMatchScore(selectedPin!.id, userId!),
    enabled: !!selectedPin?.id && !!userId && isPetPin(selectedPin) && selectedPin.matchScore != null,
    staleTime: 2 * 60_000,
  });

  const isTimeout =
    isErrorLayer &&
    errorLayer instanceof Error &&
    (errorLayer.message === 'request timeout' || errorLayer.message.includes('timeout'));

  const mapErrorMessage = isErrorLayer && errorLayer
    ? getFriendlyErrorMessage(errorLayer, `Não foi possível carregar os ${isPetLayer ? 'pets' : 'parceiros'} do mapa. Toque em Atualizar para tentar de novo.`)
    : '';
  const isNetworkError = isErrorLayer && errorLayer instanceof Error &&
    /network|fetch|connection|ECONNREFUSED|failed to fetch|timeout/i.test(errorLayer.message);

  const handleLayerChange = (layer: 'pets' | 'ong' | 'commercial') => {
    setMapLayer(layer);
    setSelectedPin(null);
  };

  const handleRefetch = () => {
    if (isPetLayer) refetch();
    else refetchPartners();
  };

  useFocusEffect(
    useCallback(() => {
      refetchPrefs();
    }, [refetchPrefs]),
  );

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationGranted(status === 'granted');
      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({
            maxAge: 60_000,
            timeout: 15_000,
          });
          const userRegion = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          };
          setApiCenter(userRegion);
          timeoutId = setTimeout(() => {
            if (!hasAnimatedToUser.current && mapRef.current) {
              hasAnimatedToUser.current = true;
              mapRef.current.animateToRegion(userRegion, 400);
            }
          }, 500);
        } catch {
          // mantém região padrão (ex.: São Paulo)
        }
        setLocationReady(true);
      }
    })();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Fallback: em alguns dispositivos/produção onMapReady pode não disparar; libera busca de pins após 5s
  useEffect(() => {
    if (!locationReady || mapReady) return;
    const t = setTimeout(() => setMapReady(true), 5000);
    return () => clearTimeout(t);
  }, [locationReady, mapReady]);

  useUpdateCityFromLocation(
    locationGranted ? { lat: apiCenter.latitude, lng: apiCenter.longitude } : null,
  );

  const petItems = data?.items ?? [];
  const partnerItems = partnerData?.items ?? [];
  const isPetLayer = mapLayer === 'pets';
  const items = isPetLayer ? petItems : partnerItems;
  const isLoadingLayer = isPetLayer ? isLoading : partnerLoading;
  const isErrorLayer = isPetLayer ? isError : partnerError;
  const errorLayer = isPetLayer ? error : partnerErr;
  const isRefetchingLayer = isPetLayer ? isRefetching : partnerRefetching;

  const mapMarkers = useMemo(() => {
    const list = isPetLayer ? petItems : partnerItems;
    const prefix = isPetLayer ? 'pet' : 'partner';
    const seen = new Set<string>();
    return list.filter((pin) => {
      const id = pin?.id ?? '';
      const key = `${prefix}-${id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      const lat = Number(pin.latitude);
      const lng = Number(pin.longitude);
      return !Number.isNaN(lat) && !Number.isNaN(lng);
    });
  }, [isPetLayer, petItems, partnerItems]);
  const showEmptyState = !isLoadingLayer && !isErrorLayer && items.length === 0;

  if (locationGranted === false) {
    return (
      <ScreenContainer>
        <EmptyState
          title="Localização necessária"
          message="Ative a localização para ver pets no mapa."
          icon={<Ionicons name="map-outline" size={56} color={colors.textSecondary} />}
        />
      </ScreenContainer>
    );
  }

  if (locationGranted === null) {
    return (
      <ScreenContainer>
        <View style={styles.loadingWrap}>
          <LoadingLogo size={160} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Verificando localização...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.lg }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingLayer && !isLoadingLayer}
            onRefresh={handleRefetch}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.filtersSection, { borderBottomColor: colors.background }]}>
          <Text style={[styles.filtersLabel, { color: colors.textSecondary }]}>
            Filtre no mapa por:
          </Text>
          <View style={styles.filtersChipsRow}>
            {MAP_LAYER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.chipWithIcon,
                  {
                    backgroundColor: mapLayer === opt.value ? colors.primary : colors.surface,
                    borderColor: mapLayer === opt.value ? colors.primary : colors.textSecondary + '40',
                  },
                ]}
                onPress={() => handleLayerChange(opt.value)}
              >
                <ExpoImage
                  source={opt.icon}
                  style={[styles.chipIcon, { opacity: mapLayer === opt.value ? 1 : 0.85 }]}
                />
                <Text
                  style={[
                    styles.chipText,
                    { color: mapLayer === opt.value ? '#fff' : colors.textPrimary },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {mapLayer === 'pets' && (
        <View style={[styles.chipsRow, { borderBottomColor: colors.background, paddingVertical: spacing.xs }]}>
          {SPECIES_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.chip,
                { backgroundColor: speciesFilter === opt.value ? colors.primary : colors.surface },
              ]}
              onPress={() => setSpeciesFilter(opt.value)}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: speciesFilter === opt.value ? '#fff' : colors.textPrimary },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        )}
        <View style={[styles.chipsRow, { borderBottomColor: colors.background, paddingVertical: spacing.xs }]}>
          <Text style={[styles.radiusLabel, { color: colors.textSecondary }]}>Raio:</Text>
            {RADIUS_OPTIONS.map((km) => (
              <TouchableOpacity
                key={km}
                style={[
                  styles.chip,
                  { backgroundColor: radiusKm === km ? colors.primary : colors.surface },
                ]}
                onPress={() => handleRadiusPress(km)}
                disabled={updateRadiusMutation.isPending}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: radiusKm === km ? '#fff' : colors.textPrimary },
                  ]}
                >
                  {km} km
                </Text>
              </TouchableOpacity>
            ))}
        </View>
        <View style={[styles.mapWrap, showEmptyState && styles.mapWrapEmpty]}>
          <View style={[styles.mapLegend, { backgroundColor: colors.surface + 'ee' }]}>
            <View style={styles.mapLegendItem}>
              <ExpoImage source={MapPinSmallIcon} style={styles.mapLegendIcon} />
              <Text style={[styles.mapLegendText, { color: colors.textPrimary }]}>Pet</Text>
            </View>
            <View style={styles.mapLegendItem}>
              <ExpoImage source={PartnerOngPinIcon} style={styles.mapLegendIcon} />
              <Text style={[styles.mapLegendText, { color: colors.textPrimary }]}>ONG</Text>
            </View>
            <View style={styles.mapLegendItem}>
              <ExpoImage source={PartnerCommercialPinIcon} style={styles.mapLegendIcon} />
              <Text style={[styles.mapLegendText, { color: colors.textPrimary }]}>Parceiro comercial</Text>
            </View>
          </View>
          <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={DEFAULT_REGION}
          provider={PROVIDER_GOOGLE}
          showsUserLocation
          loadingEnabled
          onMapReady={() => setMapReady(true)}
        >
          {mapMarkers.map((pin, index) => {
            const lat = Number(pin.latitude);
            const lng = Number(pin.longitude);
            const isPet = 'species' in pin;
            const pinIcon = isPet
              ? MapPinSmallIcon
              : (pin as PartnerMapPin).type === 'ONG'
                ? PartnerOngPinIcon
                : PartnerCommercialPinIcon;
            const markerKey = `marker-${isPet ? 'pet' : 'partner'}-${pin.id}-${index}`;
            return (
              <Marker
                key={markerKey}
                coordinate={{ latitude: lat, longitude: lng }}
                anchor={{ x: 0.5, y: 1 }}
                image={pinIcon}
                tracksViewChanges={false}
                onPress={() => {
                  try {
                    setSelectedPin(pin);
                  } catch {
                    // evita crash se setState falhar em edge cases
                  }
                }}
              />
            );
          })}
        </MapView>
        {showEmptyState && (
          <View style={[styles.emptyOverlay, { backgroundColor: colors.background }]}>
            <Ionicons name="map-outline" size={40} color={colors.textSecondary} />
            <Text style={[styles.emptyOverlayText, { color: colors.textSecondary }]}>
              {isPetLayer
                ? `Nenhum pet no raio de ${radiusKm} km. Aumente o raio acima ou volte mais tarde.`
                : `Nenhum parceiro ${mapLayer === 'ong' ? 'ONG' : 'comercial'} no raio de ${radiusKm} km. Aumente o raio ou volte mais tarde.`}
            </Text>
          </View>
        )}
      </View>

      {selectedPin ? (
        <View style={[styles.selectedCard, { backgroundColor: colors.surface }]}>
          <View style={styles.selectedCardRow}>
            {isPetPin(selectedPin) ? (
              <>
                {selectedPin.photoUrl ? (
                  <ExpoImage source={{ uri: selectedPin.photoUrl }} style={styles.selectedCardPhoto} contentFit="cover" />
                ) : (
                  <View style={[styles.selectedCardPhoto, styles.selectedCardPhotoPlaceholder]}>
                    <Ionicons name="paw" size={24} color={colors.textSecondary} />
                  </View>
                )}
                <View style={styles.selectedCardBody}>
                  <View style={styles.selectedCardTitleRow}>
                    <Text style={[styles.selectedCardName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {selectedPin.name ?? 'Pet'}
                    </Text>
                    {selectedPin.matchScore != null && selectedPin.matchScore >= 0 && (
                      <TouchableOpacity
                        onPress={() => {
                          if (selectedPin?.id) {
                            router.push(`/pet/${selectedPin.id}?from=map`);
                            setSelectedPin(null);
                          }
                        }}
                        activeOpacity={0.8}
                        accessibilityLabel="Ver detalhes do match. Toque para abrir o perfil do pet."
                        accessibilityRole="button"
                      >
                        <MatchScoreBadge
                          data={
                            matchScoreData?.score != null
                              ? matchScoreData
                              : {
                                  score: selectedPin.matchScore,
                                  highlights: [],
                                  concerns: [],
                                  criteriaCount: 1,
                                }
                          }
                          size="small"
                          showTooltip={true}
                          contextLabel="com você"
                        />
                      </TouchableOpacity>
                    )}
                    {selectedPin.verified && (
                      <VerifiedBadge size={16} iconBackgroundColor={colors.primary} />
                    )}
                  </View>
                  <Text style={[styles.selectedCardMeta, { color: colors.textSecondary }]}>
                    {Number(selectedPin.age) === 1 ? '1 ano' : `${selectedPin.age ?? 0} anos`} • {selectedPin.species === 'DOG' ? 'Cachorro' : selectedPin.species === 'CAT' ? 'Gato' : 'Pet'}
                    {selectedPin.size ? ` • ${getSizeLabel(selectedPin.size)}` : ''}
                    {selectedPin.city ? ` • ${selectedPin.city}` : ''}
                  </Text>
                  <View style={styles.selectedCardBadges}>
                    {selectedPin.partner != null && typeof selectedPin.partner?.isPaidPartner === 'boolean' && (
                      <View
                        style={[
                          styles.selectedCardPartnerBadge,
                          {
                            backgroundColor: selectedPin.partner.isPaidPartner
                              ? (colors.warning || '#d97706') + '30'
                              : colors.primary + '25',
                          },
                        ]}
                      >
                        <Ionicons
                          name={selectedPin.partner.isPaidPartner ? 'star' : 'heart'}
                          size={12}
                          color={selectedPin.partner.isPaidPartner ? (colors.warning || '#d97706') : colors.primary}
                        />
                        <Text
                          style={[
                            styles.selectedCardPartnerBadgeText,
                            {
                              color: selectedPin.partner.isPaidPartner ? (colors.warning || '#d97706') : colors.primary,
                            },
                          ]}
                        >
                          {selectedPin.partner.isPaidPartner ? 'Patrocinado' : 'Parceiro'}
                        </Text>
                      </View>
                    )}
                    {selectedPin.vaccinated !== undefined && selectedPin.vaccinated !== null && (
                      <StatusBadge
                        label={selectedPin.vaccinated ? 'Vacinado' : 'Não vacinado'}
                        variant={selectedPin.vaccinated ? 'success' : 'warning'}
                      />
                    )}
                    {typeof selectedPin.distanceKm === 'number' && !Number.isNaN(selectedPin.distanceKm) && (
                      <StatusBadge label={`${selectedPin.distanceKm.toFixed(1)} km`} variant="neutral" />
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.selectedCardBtn, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      if (selectedPin?.id) {
                        router.push(`/pet/${selectedPin.id}?from=map`);
                      }
                      setSelectedPin(null);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.selectedCardBtnText}>Ver perfil</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {(selectedPin as PartnerMapPin).logoUrl ? (
                  <ExpoImage source={{ uri: (selectedPin as PartnerMapPin).logoUrl }} style={styles.selectedCardPhoto} contentFit="cover" />
                ) : (
                  <View style={[styles.selectedCardPhoto, styles.selectedCardPhotoPlaceholder]}>
                    <Ionicons
                      name={(selectedPin as PartnerMapPin).type === 'ONG' ? 'heart' : 'storefront'}
                      size={24}
                      color={colors.textSecondary}
                    />
                  </View>
                )}
                <View style={styles.selectedCardBody}>
                  <View style={styles.selectedCardTitleRow}>
                    <Text style={[styles.selectedCardName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {(selectedPin as PartnerMapPin).name ?? 'Parceiro'}
                    </Text>
                  </View>
                  <Text style={[styles.selectedCardMeta, { color: colors.textSecondary }]}>
                    {(selectedPin as PartnerMapPin).type === 'ONG' ? 'ONG' : (selectedPin as PartnerMapPin).type === 'CLINIC' ? 'Clínica' : 'Loja'}
                    {(selectedPin as PartnerMapPin).city ? ` • ${(selectedPin as PartnerMapPin).city}` : ''}
                  </Text>
                  <View style={styles.selectedCardBadges}>
                    {typeof (selectedPin as PartnerMapPin).distanceKm === 'number' && !Number.isNaN((selectedPin as PartnerMapPin).distanceKm) && (
                      <StatusBadge label={`${(selectedPin as PartnerMapPin).distanceKm!.toFixed(1)} km`} variant="neutral" />
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.selectedCardBtn, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      if (selectedPin?.id) {
                        router.push(`/partners/${selectedPin.id}`);
                      }
                      setSelectedPin(null);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.selectedCardBtnText}>Ver parceiro</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            <TouchableOpacity
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPress={() => setSelectedPin(null)}
              style={styles.selectedCardClose}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <View style={[styles.footer, isErrorLayer && styles.footerError, { backgroundColor: colors.surface }]}>
        <View style={styles.footerTextWrap}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]} numberOfLines={isErrorLayer ? 10 : 2}>
            {isErrorLayer
              ? mapErrorMessage
              : isLoadingLayer
                ? (isPetLayer ? 'Carregando pets...' : 'Carregando parceiros...')
                : showEmptyState
                  ? (isPetLayer ? `Nenhum pet no raio de ${radiusKm} km` : `Nenhum parceiro ${mapLayer === 'ong' ? 'ONG' : 'comercial'} no raio de ${radiusKm} km`)
                  : isPetLayer
                    ? `${items.length} pet(s) no raio de ${radiusKm} km`
                    : `${items.length} parceiro(s) no raio de ${radiusKm} km`}
          </Text>
          {isErrorLayer && (
            <Text style={[styles.footerHint, { color: colors.textSecondary }]}>
              {isPetLayer ? 'Você pode ver os pets na aba Início.' : 'Toque em Atualizar para tentar novamente.'}
            </Text>
          )}
          {isErrorLayer && __DEV__ && isNetworkError && (
            <Text style={[styles.footerDevHint, { color: colors.textSecondary }]}>
              Dica: no simulador, confira se a API está rodando (pnpm dev:api) e se EXPO_PUBLIC_API_URL no .env do app aponta para um host acessível (ex.: http://localhost:3000).
            </Text>
          )}
        </View>
        <View style={styles.footerActions}>
          {isErrorLayer && isPetLayer && (
            <TouchableOpacity
              style={[styles.refreshBtn, styles.refreshBtnSecondary, { borderColor: colors.primary }]}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={[styles.refreshBtnText, { color: colors.primary }]}>Ver pets na aba Início</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.refreshBtn, { backgroundColor: colors.primary }]}
            onPress={handleRefetch}
            disabled={isLoadingLayer}
          >
            <Text style={styles.refreshBtnText}>Atualizar</Text>
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {},
  filtersSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  filtersLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  filtersChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  chipWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipIcon: { width: 20, height: 20 },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 20 },
  chipText: { fontSize: 14, fontWeight: '600' },
  radiusLabel: { fontSize: 14, marginRight: spacing.sm, alignSelf: 'center' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loadingText: { fontSize: 16 },
  mapWrap: { position: 'relative', minHeight: 280, height: MAP_MIN_HEIGHT },
  mapWrapEmpty: { minHeight: 240 },
  mapLegend: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    zIndex: 10,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
    gap: 6,
  },
  mapLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  mapLegendIcon: { width: 24, height: 24 },
  mapLegendText: { fontSize: 12, fontWeight: '500' },
  map: { flex: 1, width: '100%', height: '100%' },
  emptyOverlay: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    padding: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyOverlayText: { fontSize: 14, textAlign: 'center' },
  emptyOverlayBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 20 },
  emptyOverlayBtnText: { color: '#fff', fontWeight: '600' },
  selectedCard: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  selectedCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedCardPhoto: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginRight: spacing.sm,
  },
  selectedCardPhotoPlaceholder: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCardBody: { flex: 1, minWidth: 0 },
  selectedCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  selectedCardName: { fontSize: 16, fontWeight: '600', flex: 1 },
  selectedCardMeta: { fontSize: 12, marginBottom: spacing.xs },
  selectedCardBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  selectedCardPartnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  selectedCardPartnerBadgeText: { fontSize: 11, fontWeight: '600' },
  selectedCardBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, alignSelf: 'flex-start' },
  selectedCardBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  selectedCardClose: { padding: spacing.xs },
  footer: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  footerError: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  footerTextWrap: { flex: 1, minWidth: 0 },
  footerText: { fontSize: 14 },
  footerHint: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  footerDevHint: { fontSize: 11, marginTop: 6, fontStyle: 'italic', opacity: 0.9 },
  footerActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginTop: spacing.sm },
  refreshBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 20 },
  refreshBtnSecondary: { backgroundColor: 'transparent', borderWidth: 2 },
  refreshBtnText: { color: '#fff', fontWeight: '600' },
});
