/**
 * Reverse geocoding via Nominatim (OpenStreetMap).
 * Uso: obter nome da cidade a partir de lat/lng para o anúncio do pet (exibir no card do feed).
 * Política de uso: https://operations.osmfoundation.org/policies/nominatim/
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
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
    const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
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
