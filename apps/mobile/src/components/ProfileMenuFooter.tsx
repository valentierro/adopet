import { View, Text, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import { useTheme } from '../hooks/useTheme';
import { spacing } from '../theme';

export function ProfileMenuFooter() {
  const { colors } = useTheme();
  const version = Constants.expoConfig?.version ?? '1.0.40';

  return (
    <View style={styles.wrap}>
      <Text style={[styles.versionText, { color: colors.textSecondary }]}>
        Adopet v{version}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
