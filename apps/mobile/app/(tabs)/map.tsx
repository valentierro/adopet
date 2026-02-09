import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer, EmptyState, LoadingLogo } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { fetchFeedMap } from '../../src/api/feed';
import { getPreferences } from '../../src/api/me';
import { spacing } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

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
              title={pin.name}
              onCalloutPress={() => router.push(`/pet/${pin.id}`)}
            />
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

const styles = StyleSheet.create({
  mapWrap: { flex: 1, position: 'relative' },
  map: { width: '100%', height: '100%' },
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
