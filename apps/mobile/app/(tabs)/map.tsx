import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Dimensions, Image } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import type { MapPin, FeedMapSpeciesFilter } from '../../src/api/feed';
import { ScreenContainer, EmptyState, LoadingLogo, VerifiedBadge, StatusBadge } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { fetchFeedMap } from '../../src/api/feed';
import { getPreferences } from '../../src/api/me';
import { useUpdateCityFromLocation } from '../../src/hooks/useUpdateCityFromLocation';
import { getFriendlyErrorMessage } from '../../src/utils/errorMessage';
import { spacing } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

// Pin no mapa: image nativa garante que os pins apareçam (Android). Para pins menores, use um PNG 32x32 ou 48x48, ex.: map_pin_small.png
const AdopetMarkerIcon = require('../../assets/brand/icon/app_icon_light.png');

const DEFAULT_REGION = {
  latitude: -23.5505,
  longitude: -46.6333,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

const SPECIES_OPTIONS: { value: FeedMapSpeciesFilter; label: string }[] = [
  { value: 'BOTH', label: 'Todos' },
  { value: 'DOG', label: 'Cachorros' },
  { value: 'CAT', label: 'Gatos' },
];

const MAP_MIN_HEIGHT = Dimensions.get('window').height * 0.5;

export default function MapScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const mapRef = useRef<MapView | null>(null);
  const [apiCenter, setApiCenter] = useState(DEFAULT_REGION);
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [speciesFilter, setSpeciesFilter] = useState<FeedMapSpeciesFilter>('BOTH');
  const hasAnimatedToUser = useRef(false);

  const { data: prefs, refetch: refetchPrefs } = useQuery({
    queryKey: ['me', 'preferences'],
    queryFn: getPreferences,
    staleTime: 5 * 60_000,
  });
  const radiusKm = prefs?.radiusKm ?? 50;

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['feed', 'map', apiCenter.latitude, apiCenter.longitude, radiusKm, speciesFilter],
    queryFn: () =>
      fetchFeedMap({
        lat: apiCenter.latitude,
        lng: apiCenter.longitude,
        radiusKm,
        species: speciesFilter,
      }),
    enabled: locationGranted === true && locationReady && mapReady,
    staleTime: 60_000,
    retry: 5,
    retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 8000),
  });

  const isTimeout =
    isError &&
    error instanceof Error &&
    (error.message === 'request timeout' || error.message.includes('timeout'));

  const mapErrorMessage = isError && error
    ? getFriendlyErrorMessage(error, 'Não foi possível carregar os pets do mapa. Toque em Atualizar para tentar de novo.')
    : '';
  const isNetworkError = isError && error instanceof Error &&
    /network|fetch|connection|ECONNREFUSED|failed to fetch|timeout/i.test(error.message);

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

  const items = data?.items ?? [];
  const showEmptyState = !isLoading && !isError && items.length === 0;

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.lg }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isLoading}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.chipsRow, { borderBottomColor: colors.background }]}>
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
        <View style={[styles.mapWrap, showEmptyState && styles.mapWrapEmpty]}>
          <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={DEFAULT_REGION}
          provider={PROVIDER_GOOGLE}
          showsUserLocation
          loadingEnabled
          onMapReady={() => setMapReady(true)}
        >
          {items.map((pin, index) => {
            const lat = Number(pin.latitude);
            const lng = Number(pin.longitude);
            if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
            const markerKey = pin?.id ? String(pin.id) : `pin-${lat}-${lng}-${index}`;
            return (
              <Marker
                key={markerKey}
                coordinate={{ latitude: lat, longitude: lng }}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
                onPress={() => {
                  try {
                    setSelectedPin(pin);
                  } catch {
                    // evita crash se setState falhar em edge cases
                  }
                }}
              >
                <View style={styles.markerWrap}>
                  <Image source={AdopetMarkerIcon} style={styles.markerImage} resizeMode="contain" />
                </View>
              </Marker>
            );
          })}
        </MapView>
        {showEmptyState && (
          <View style={[styles.emptyOverlay, { backgroundColor: colors.background }]}>
            <Ionicons name="map-outline" size={40} color={colors.textSecondary} />
            <Text style={[styles.emptyOverlayText, { color: colors.textSecondary }]}>
              Nenhum pet no raio de {radiusKm} km. Aumente o raio em Preferências ou volte mais tarde.
            </Text>
            <TouchableOpacity
              style={[styles.emptyOverlayBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/preferences')}
            >
              <Text style={styles.emptyOverlayBtnText}>Abrir Preferências</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {selectedPin ? (
        <View style={[styles.selectedCard, { backgroundColor: colors.surface }]}>
          <View style={styles.selectedCardRow}>
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
                {selectedPin.verified && (
                  <VerifiedBadge size={16} iconBackgroundColor={colors.primary} />
                )}
              </View>
              <Text style={[styles.selectedCardMeta, { color: colors.textSecondary }]}>
                {Number(selectedPin.age) === 1 ? '1 ano' : `${selectedPin.age ?? 0} anos`} • {selectedPin.species === 'DOG' ? 'Cachorro' : selectedPin.species === 'CAT' ? 'Gato' : 'Pet'}
                {selectedPin.size ? ` • ${selectedPin.size}` : ''}
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
                    router.push(`/pet/${selectedPin.id}`);
                  }
                  setSelectedPin(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.selectedCardBtnText}>Ver perfil</Text>
              </TouchableOpacity>
            </View>
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

      <View style={[styles.footer, isError && styles.footerError, { backgroundColor: colors.surface }]}>
        <View style={styles.footerTextWrap}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]} numberOfLines={isError ? 10 : 2}>
            {isError
              ? mapErrorMessage
              : isLoading
                ? 'Carregando pets...'
                : showEmptyState
                  ? `Nenhum pet no raio de ${radiusKm} km`
                  : `${items.length} pet(s) no raio de ${radiusKm} km`}
          </Text>
          {isError && (
            <Text style={[styles.footerHint, { color: colors.textSecondary }]}>
              Você pode ver os pets na aba Início.
            </Text>
          )}
          {isError && __DEV__ && isNetworkError && (
            <Text style={[styles.footerDevHint, { color: colors.textSecondary }]}>
              Dica: no simulador, confira se a API está rodando (pnpm dev:api) e se EXPO_PUBLIC_API_URL no .env do app aponta para um host acessível (ex.: http://localhost:3000).
            </Text>
          )}
        </View>
        <View style={styles.footerActions}>
          {isError && (
            <TouchableOpacity
              style={[styles.refreshBtn, styles.refreshBtnSecondary, { borderColor: colors.primary }]}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={[styles.refreshBtnText, { color: colors.primary }]}>Ver pets na aba Início</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.refreshBtn, { backgroundColor: colors.primary }]}
            onPress={() => refetch()}
            disabled={isLoading}
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
  markerWrap: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  markerImage: { width: 32, height: 32 },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 20 },
  chipText: { fontSize: 14, fontWeight: '600' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loadingText: { fontSize: 16 },
  mapWrap: { position: 'relative', minHeight: 280, height: MAP_MIN_HEIGHT },
  mapWrapEmpty: { minHeight: 240 },
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
