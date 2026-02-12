import { useState, useEffect } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

/**
 * Retorna se o dispositivo está conectado à internet.
 * Atualiza quando a conexão muda (Wi‑Fi/dados desligados, modo avião, etc.).
 */
export function useNetInfo(): boolean {
  const [isConnected, setIsConnected] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? true);
    });

    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected ?? true);
    });

    return () => unsubscribe();
  }, []);

  return isConnected;
}
