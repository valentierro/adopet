import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'adopet_viewed_pets_';
const MAX_RECENT = 50;

function getStorageKey(userId: string | null | undefined): string {
  return userId ? `${KEY_PREFIX}${userId}` : `${KEY_PREFIX}guest`;
}

/**
 * Retorna o conjunto de IDs de pets já visualizados (abriu a tela de detalhe).
 * Persistido por usuário (ou 'guest' quando não logado). Máximo 50.
 */
export async function getViewedPetIds(userId: string | null | undefined): Promise<Set<string>> {
  try {
    const key = getStorageKey(userId);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === 'string').slice(0, MAX_RECENT));
  } catch {
    return new Set();
  }
}

/**
 * Marca um pet como visualizado (usuário abriu a tela de detalhe).
 * Inclui no início da lista e mantém no máximo MAX_RECENT.
 */
export async function addViewedPetId(
  petId: string,
  userId: string | null | undefined,
): Promise<void> {
  try {
    const key = getStorageKey(userId);
    const current = await getViewedPetIds(userId);
    const next = [petId, ...Array.from(current).filter((id) => id !== petId)].slice(0, MAX_RECENT);
    await AsyncStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignora falha de persistência
  }
}
