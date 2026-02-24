import { View, Text, StyleSheet, Switch, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, Toast } from '../../../src/components';
import { useTheme } from '../../../src/hooks/useTheme';
import { getFeatureFlags, updateFeatureFlag, type FeatureFlagItem } from '../../../src/api/admin';
import { getFriendlyErrorMessage } from '../../../src/utils/errorMessage';
import { spacing } from '../../../src/theme';
import { useState } from 'react';
import { Alert } from 'react-native';

export default function AdminFeatureFlagsScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { data: featureFlagsList = [], refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'feature-flags'],
    queryFn: getFeatureFlags,
  });

  const updateFeatureFlagMutation = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) => updateFeatureFlag(key, enabled),
    onSuccess: (_, { key, enabled }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] });
      setToastMessage(`Feature "${key}" ${enabled ? 'habilitada' : 'desabilitada'}.`);
    },
    onError: (e: unknown) =>
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível atualizar a flag.')),
  });

  return (
    <ScreenContainer
      scroll
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
      }
    >
      <View>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Feature flags</Text>
        <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
          Habilitar ou desabilitar funcionalidades da aplicação. As flags são criadas no banco sob
          demanda (ao ligar/desligar).
        </Text>
        {featureFlagsList.length === 0 ? (
          <View style={[styles.emptyBlock, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhuma feature flag cadastrada. Use a API ou o banco para criar flags (ex:
              require_email_verification).
            </Text>
          </View>
        ) : (
          featureFlagsList.map((flag: FeatureFlagItem) => (
            <View
              key={flag.key}
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.background,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>{flag.key}</Text>
                {flag.description ? (
                  <Text style={[styles.sectionSub, { color: colors.textSecondary, marginTop: 2 }]}>
                    {flag.description}
                  </Text>
                ) : null}
              </View>
              <Switch
                value={flag.enabled}
                onValueChange={(enabled) => updateFeatureFlagMutation.mutate({ key: flag.key, enabled })}
                disabled={
                  updateFeatureFlagMutation.isPending &&
                  updateFeatureFlagMutation.variables?.key === flag.key
                }
                trackColor={{ false: colors.background, true: colors.primary + '80' }}
                thumbColor={flag.enabled ? colors.primary : colors.textSecondary}
              />
            </View>
          ))
        )}
      </View>
      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.xs },
  sectionSub: { fontSize: 13, marginBottom: spacing.md },
  emptyBlock: { padding: spacing.lg, borderRadius: 12, marginBottom: spacing.sm },
  emptyText: { fontSize: 14 },
  card: { padding: spacing.md, borderRadius: 12, borderWidth: 1, marginBottom: spacing.sm },
  summaryTitle: { fontSize: 12, fontWeight: '600', marginTop: 2, textAlign: 'center' },
});
