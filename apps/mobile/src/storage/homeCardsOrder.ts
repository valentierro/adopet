import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'adopet_home_cards_order_';

export type ProfileKey = 'user' | 'partner' | 'admin';

/** IDs dos 6 cards que podem ser reordenados (exceto feed, partnersArea, partnerOng, partnerComercial) */
export const DRAGGABLE_CARD_IDS = [
  'my-pets',
  'adopted',
  'favorites',
  'map',
  'notifications', // ou 'admin' para admin
  'passed',
] as const;

export type DraggableCardId = (typeof DRAGGABLE_CARD_IDS)[number];

/** Ordem padrão dos cards por perfil. Admin usa 'admin' no lugar de 'notifications'. */
export function getDefaultOrder(profileKey: ProfileKey): string[] {
  const ids = [...DRAGGABLE_CARD_IDS];
  if (profileKey === 'admin') {
    return ids.map((id) => (id === 'notifications' ? 'admin' : id));
  }
  return ids as unknown as string[];
}

/**
 * Carrega a ordem salva e faz merge com os IDs disponíveis para o perfil.
 * Remove IDs que não existem mais (ex: mudou de admin para user) e adiciona novos no final.
 */
export async function getCardsOrder(profileKey: ProfileKey): Promise<string[]> {
  const key = KEY_PREFIX + profileKey;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return getDefaultOrder(profileKey);
    const saved: string[] = JSON.parse(raw);
    const defaultOrder = getDefaultOrder(profileKey);
    const available = new Set(defaultOrder);
    const merged: string[] = [];
    for (const id of saved) {
      if (available.has(id)) merged.push(id);
    }
    for (const id of defaultOrder) {
      if (!merged.includes(id)) merged.push(id);
    }
    return merged;
  } catch {
    return getDefaultOrder(profileKey);
  }
}

export async function setCardsOrder(profileKey: ProfileKey, order: string[]): Promise<void> {
  const key = KEY_PREFIX + profileKey;
  await AsyncStorage.setItem(key, JSON.stringify(order));
}
