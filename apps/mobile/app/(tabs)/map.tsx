import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer, EmptyState, LoadingLogo } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { fetchFeedMap } from '../../src/api/feed';
import { getPreferences } from '../../src/api/me';
import { useUpdateCityFromLocation } from '../../src/hooks/useUpdateCityFromLocation';
import { getFriendlyErrorMessage } from '../../src/utils/errorMessage';
import { spacing } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

const AdopetMarkerIcon = require('../../assets/brand/icon/app_icon_light.png');

const DEFAULT_REGION = {
  latitude: -23.5505,
  longitude: -46.6333,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

export default function MapScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const mapRef = useRef<MapView | null>(null);
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const hasAnimatedToUser = useRef(false);

  const { data: prefs } = useQuery({
    queryKey: ['me', 'preferences'],
    queryFn: getPreferences,
    staleTime: 5 * 60_000,
  });
  const radiusKm = prefs?.radiusKm ?? 50;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['feed', 'map', region.latitude, region.longitude, radiusKm],
    queryFn: () =>
      fetchFeedMap({
        lat: region.latitude,
        lng: region.longitude,
        radiusKm,
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
      refetch();
    }, [refetch]),
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
          setRegion(userRegion);
          // Anima para a localização do usuário após o mapa estar montado (evita tela branca ao trocar region no primeiro frame)
          timeoutId = setTimeout(() => {
            if (!hasAnimatedToUser.current && mapRef.current) {
              hasAnimatedToUser.current = true;
              mapRef.current.animateToRegion(userRegion, 400);
            }
          }, 300);
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
    locationGranted ? { lat: region.latitude, lng: region.longitude } : null,
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

  return (
    <ScreenContainer>
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={DEFAULT_REGION}
          region={region}
          onRegionChangeComplete={setRegion}
          showsUserLocation
          loadingEnabled
          onMapReady={() => setMapReady(true)}
          {...(Platform.OS === 'ios' ? { provider: PROVIDER_GOOGLE } : {})}
        >
          {items.map((pin) => {
            const lat = Number(pin.latitude);
            const lng = Number(pin.longitude);
            if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
            return (
              <Marker
                key={pin.id}
                coordinate={{ latitude: lat, longitude: lng }}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={true}
              >
                <View style={styles.markerWrap}>
                  <Image source={AdopetMarkerIcon} style={styles.markerIcon} resizeMode="contain" />
                </View>
                <Callout tooltip>
                <View style={[styles.callout, { backgroundColor: colors.surface }]}>
                  {pin.photoUrl ? (
                    <Image source={{ uri: pin.photoUrl }} style={styles.calloutPhoto} />
                  ) : (
                    <View style={[styles.calloutPhoto, styles.calloutPhotoPlaceholder]}>
                      <Ionicons name="paw" size={24} color={colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.calloutBody}>
                    <Text style={[styles.calloutName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {pin.name}
                    </Text>
                    <Text style={[styles.calloutMeta, { color: colors.textSecondary }]}>
                      {pin.age} ano{pin.age !== 1 ? 's' : ''} • {pin.species === 'DOG' ? 'Cachorro' : 'Gato'}
                      {pin.city ? ` • ${pin.city}` : ''}
                    </Text>
                    <TouchableOpacity
                      style={[styles.calloutBtn, { backgroundColor: colors.primary }]}
                      onPress={() => router.push(`/pet/${pin.id}`)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.calloutBtnText}>Ver perfil</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Callout>
            </Marker>
            );
          })}
        </MapView>
      </View>
      <View style={[styles.footer, isError && styles.footerError, { backgroundColor: colors.surface }]}>
        <View style={styles.footerTextWrap}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]} numberOfLines={isError ? 10 : 2}>
            {isError
              ? mapErrorMessage
              : isLoading
                ? 'Carregando pets...'
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
    </ScreenContainer>
  );
}

const MARKER_SIZE = 28;

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loadingText: { fontSize: 16 },
  mapWrap: { flex: 1, position: 'relative' },
  map: { width: '100%', height: '100%' },
  markerWrap: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerIcon: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
  },
  callout: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 12,
    minWidth: 200,
    maxWidth: 260,
  },
  calloutPhoto: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginRight: spacing.sm,
  },
  calloutPhotoPlaceholder: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutBody: { flex: 1, minWidth: 0 },
  calloutName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  calloutMeta: { fontSize: 12, marginBottom: spacing.sm },
  calloutBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start' },
  calloutBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
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
