import { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer, EmptyState, LoadingLogo } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { fetchFeedMap } from '../../src/api/feed';
import { getPreferences } from '../../src/api/me';
import { useUpdateCityFromLocation } from '../../src/hooks/useUpdateCityFromLocation';
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
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);

  const { data: prefs } = useQuery({
    queryKey: ['me', 'preferences'],
    queryFn: getPreferences,
  });
  const radiusKm = prefs?.radiusKm ?? 50;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['feed', 'map', region.latitude, region.longitude, radiusKm],
    queryFn: () =>
      fetchFeedMap({
        lat: region.latitude,
        lng: region.longitude,
        radiusKm,
      }),
    enabled: locationGranted === true,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationGranted(status === 'granted');
      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({});
          setRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          });
        } catch {
          // keep default
        }
      }
    })();
  }, []);

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

  const items = data?.items ?? [];

  return (
    <ScreenContainer>
      <View style={styles.mapWrap}>
        <MapView
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          showsUserLocation
          loadingEnabled
        >
          {items.map((pin) => (
            <Marker
              key={pin.id}
              coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
              tracksViewChanges={false}
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
          ))}
        </MapView>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <LoadingLogo size={140} />
          </View>
        )}
      </View>
      <View style={[styles.footer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          {items.length} pet(s) no raio de {radiusKm} km
        </Text>
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: colors.primary }]}
          onPress={() => refetch()}
          disabled={isLoading}
        >
          <Text style={styles.refreshBtnText}>Atualizar</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const MARKER_SIZE = 30;

const styles = StyleSheet.create({
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 14 },
  refreshBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 20 },
  refreshBtnText: { color: '#fff', fontWeight: '600' },
});
