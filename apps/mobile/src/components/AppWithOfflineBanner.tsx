import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNetInfo } from '../hooks/useNetInfo';
import { OfflineBanner } from './OfflineBanner';

type Props = {
  children: React.ReactNode;
};

export function AppWithOfflineBanner({ children }: Props) {
  const isConnected = useNetInfo();

  return (
    <View style={styles.container}>
      {!isConnected && <OfflineBanner />}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
});
