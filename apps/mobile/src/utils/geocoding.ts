/**
 * Reverse geocoding via Nominatim (OpenStreetMap).
 * Uso: obter nome da cidade a partir de lat/lng para preencher o perfil do usuário.
 * Política de uso: https://operations.osmfoundation.org/policies/nominatim/
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'Adopet/1.0 (mobile app - adoção de pets)';

/** Ordem de preferência para extrair nome do município da resposta. */
const CITY_KEYS = ['city', 'town', 'village', 'municipality', 'county'] as const;

export type ReverseGeocodeResult = {
  city: string | null;
  displayName: string;
};

/**
 * Obtém o nome da cidade (e o endereço completo) a partir de coordenadas.
 * Retorna null para city se não for possível determinar.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json',
    addressdetails: '1',
  });
  const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    method: 'GET',
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`Nominatim error: ${res.status}`);
  }
  const data = (await res.json()) as {
    address?: Record<string, string>;
    display_name?: string;
  };
  const address = data.address ?? {};
  const displayName = data.display_name ?? '';
  let city: string | null = null;
  for (const key of CITY_KEYS) {
    const value = address[key];
    if (value && typeof value === 'string' && value.trim()) {
      city = value.trim();
      break;
    }
  }
  return { city, displayName };
}
