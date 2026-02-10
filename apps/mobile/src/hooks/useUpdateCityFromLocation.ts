import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { reverseGeocode } from '../utils/geocoding';
import { getMe, updateMe } from '../api/me';

let hasTriedCityUpdateThisSession = false;

/**
 * Quando há localização (lat/lng) e o usuário ainda não tem cidade no perfil,
 * obtém a cidade via reverse geocoding (Nominatim) e atualiza o perfil.
 * Roda no máximo uma vez por sessão para não abusar da API.
 */
export function useUpdateCityFromLocation(userCoords: { lat: number; lng: number } | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userCoords || hasTriedCityUpdateThisSession) return;

    let cancelled = false;

    (async () => {
      try {
        const user = await queryClient.fetchQuery({ queryKey: ['me'], queryFn: getMe });
        if (cancelled) return;
        const hasCity = user?.city != null && String(user.city).trim() !== '';
        if (hasCity) {
          hasTriedCityUpdateThisSession = true;
          return;
        }
        const { city } = await reverseGeocode(userCoords.lat, userCoords.lng);
        if (cancelled || !city) return;
        hasTriedCityUpdateThisSession = true;
        await updateMe({ city });
        if (!cancelled) queryClient.invalidateQueries({ queryKey: ['me'] });
      } catch {
        // Falha silenciosa: usuário pode preencher cidade manualmente depois
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userCoords?.lat, userCoords?.lng, queryClient]);
}
