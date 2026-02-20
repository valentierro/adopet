/**
 * Geocoding via Nominatim (OpenStreetMap).
 * - reverseGeocode: lat/lng → nome da cidade (card do feed).
 * - forwardGeocode: cidade → lat/lng (para exibir pet no mapa quando o anúncio não tem coordenadas).
 * Política de uso: https://operations.osmfoundation.org/policies/nominatim/
 */

const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'Adopet/1.0 (API - adoção de pets)';

const CITY_KEYS = ['city', 'town', 'village', 'municipality', 'county'] as const;

/**
 * Obtém o nome da cidade a partir de coordenadas.
 * Retorna null se não for possível determinar (ou em caso de erro, para não bloquear create/update).
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json',
    addressdetails: '1',
  });
  try {
    const res = await fetch(`${NOMINATIM_REVERSE_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { address?: Record<string, string> };
    const address = data.address ?? {};
    for (const key of CITY_KEYS) {
      const value = address[key];
      if (value && typeof value === 'string' && value.trim()) return value.trim();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Obtém coordenadas (lat, lng) a partir do nome da cidade (forward geocoding).
 * Usado para preencher lat/lng de pets aprovados que têm cidade mas não têm coordenadas (para aparecer no mapa).
 * Restringe a busca ao Brasil (countrycodes=br). Retorna null em caso de erro ou sem resultados.
 */
export async function forwardGeocode(
  city: string,
  countryCode = 'br',
): Promise<{ lat: number; lng: number } | null> {
  const trimmed = city?.trim();
  if (!trimmed) return null;
  const params = new URLSearchParams({
    q: `${trimmed}, ${countryCode.toUpperCase()}`,
    format: 'json',
    limit: '1',
    countrycodes: countryCode.toLowerCase(),
  });
  try {
    const res = await fetch(`${NOMINATIM_SEARCH_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    const first = data?.[0];
    if (!first?.lat || !first?.lon) return null;
    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}
