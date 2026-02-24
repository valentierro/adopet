/**
 * Estados e cidades do Brasil (IBGE).
 * buildLocationString / parseLocationString: formato "Bairro, Cidade - UF" ou "Cidade - UF".
 */

export type StateOption = { id: number; nome: string; sigla: string };
export type CityOption = { id: number; nome: string };

/** Estados brasileiros (id = código IBGE do estado). */
export const BR_STATES: StateOption[] = [
  { id: 12, nome: 'Acre', sigla: 'AC' },
  { id: 27, nome: 'Alagoas', sigla: 'AL' },
  { id: 16, nome: 'Amapá', sigla: 'AP' },
  { id: 13, nome: 'Amazonas', sigla: 'AM' },
  { id: 29, nome: 'Bahia', sigla: 'BA' },
  { id: 23, nome: 'Ceará', sigla: 'CE' },
  { id: 53, nome: 'Distrito Federal', sigla: 'DF' },
  { id: 32, nome: 'Espírito Santo', sigla: 'ES' },
  { id: 52, nome: 'Goiás', sigla: 'GO' },
  { id: 21, nome: 'Maranhão', sigla: 'MA' },
  { id: 31, nome: 'Minas Gerais', sigla: 'MG' },
  { id: 50, nome: 'Mato Grosso do Sul', sigla: 'MS' },
  { id: 51, nome: 'Mato Grosso', sigla: 'MT' },
  { id: 15, nome: 'Pará', sigla: 'PA' },
  { id: 25, nome: 'Paraíba', sigla: 'PB' },
  { id: 26, nome: 'Pernambuco', sigla: 'PE' },
  { id: 22, nome: 'Piauí', sigla: 'PI' },
  { id: 41, nome: 'Paraná', sigla: 'PR' },
  { id: 33, nome: 'Rio de Janeiro', sigla: 'RJ' },
  { id: 24, nome: 'Rio Grande do Norte', sigla: 'RN' },
  { id: 11, nome: 'Rondônia', sigla: 'RO' },
  { id: 14, nome: 'Roraima', sigla: 'RR' },
  { id: 43, nome: 'Rio Grande do Sul', sigla: 'RS' },
  { id: 42, nome: 'Santa Catarina', sigla: 'SC' },
  { id: 28, nome: 'Sergipe', sigla: 'SE' },
  { id: 35, nome: 'São Paulo', sigla: 'SP' },
  { id: 17, nome: 'Tocantins', sigla: 'TO' },
];

const IBGE_MUNICIPIOS_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados';

/**
 * Busca municípios do estado pelo código IBGE do estado.
 */
export async function fetchCitiesByStateId(stateId: number): Promise<CityOption[]> {
  if (!stateId) return [];
  const res = await fetch(`${IBGE_MUNICIPIOS_URL}/${stateId}/municipios`);
  if (!res.ok) return [];
  const data = (await res.json()) as { id: number; nome: string }[];
  return data.map((m) => ({ id: m.id, nome: m.nome }));
}

/**
 * Monta a string de localização para a API: "Bairro, Cidade - UF" ou "Cidade - UF".
 */
export function buildLocationString(
  neighborhood: string | null | undefined,
  cityName: string,
  stateSigla: string,
): string {
  const n = (neighborhood ?? '').trim();
  const c = (cityName ?? '').trim();
  const u = (stateSigla ?? '').trim().toUpperCase();
  if (!c && !u) return '';
  const part = n ? `${n}, ${c}` : c;
  return u ? `${part} - ${u}` : part;
}

export type ParsedLocation = {
  neighborhood?: string;
  cityName?: string;
  stateSigla?: string;
};

/**
 * Parse da string de localização "Bairro, Cidade - UF" ou "Cidade - UF".
 */
export function parseLocationString(city: string | null | undefined): ParsedLocation {
  const s = (city ?? '').trim();
  if (!s) return {};

  const dash = s.lastIndexOf(' - ');
  let stateSigla: string | undefined;
  let rest = s;
  if (dash >= 0 && s.length - dash === 5) {
    stateSigla = s.slice(dash + 3).trim();
    rest = s.slice(0, dash).trim();
  }

  let neighborhood: string | undefined;
  let cityName: string | undefined;
  const comma = rest.indexOf(', ');
  if (comma >= 0) {
    neighborhood = rest.slice(0, comma).trim();
    cityName = rest.slice(comma + 2).trim();
  } else {
    cityName = rest || undefined;
  }

  return { neighborhood, cityName, stateSigla };
}
