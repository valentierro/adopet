import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BANNER_BG = '#d97706';

export function OfflineBanner() {
  return (
    <View
      style={[styles.banner, { backgroundColor: BANNER_BG }]}
      accessibilityRole="alert"
      accessibilityLabel="Sem conexão com a internet. Verifique sua rede."
    >
      <Ionicons name="cloud-offline" size={20} color="#fff" />
      <Text style={styles.text}>Sem conexão. Verifique sua internet.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
