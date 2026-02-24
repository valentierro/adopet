import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, EmptyState } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';

/**
 * Placeholder para a rota /map na build web.
 * react-native-maps é só para iOS/Android; na web exibimos esta tela.
 */
export default function MapScreenWeb() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <ScreenContainer scroll>
      <EmptyState
        title="Mapa no celular"
        message="O mapa de pets está disponível no app para iOS e Android. Abra o Adopet no seu celular para ver os pets na sua região."
        icon={<Ionicons name="map-outline" size={56} color={colors.textSecondary} />}
      />
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={() => router.replace('/(tabs)')}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Voltar ao início</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  button: {
    marginHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
