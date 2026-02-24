import { View, Text, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, LoadingLogo } from '../../../src/components';
import { useTheme } from '../../../src/hooks/useTheme';
import { getSatisfactionStats, getSatisfactionResponses } from '../../../src/api/admin';
import { spacing } from '../../../src/theme';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatScore(value: number | undefined | null): string {
  return (value != null && typeof value === 'number') ? value.toFixed(1) : '–';
}

export default function AdminSatisfactionScreen() {
  const { colors } = useTheme();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats, isRefetching: statsRefetching } = useQuery({
    queryKey: ['admin', 'satisfaction-stats'],
    queryFn: getSatisfactionStats,
  });

  const { data: responsesData, isLoading: responsesLoading, refetch: refetchResponses, isRefetching: responsesRefetching } = useQuery({
    queryKey: ['admin', 'satisfaction-responses'],
    queryFn: () => getSatisfactionResponses(1, 30),
  });

  const refetch = () => {
    refetchStats();
    refetchResponses();
  };
  const isRefetching = statsRefetching || responsesRefetching;
  const isLoading = statsLoading && responsesLoading;

  if (isLoading && !stats && !responsesData) {
    return (
      <ScreenContainer>
        <LoadingLogo size={120} />
      </ScreenContainer>
    );
  }

  const responses = responsesData?.items ?? [];
  const total = responsesData?.total ?? 0;

  return (
    <ScreenContainer scroll>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching && !isLoading} onRefresh={refetch} colors={[colors.primary]} />
        }
      >
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Pesquisas enviadas após adoções confirmadas. Médias por pilar (1-5) e últimas respostas.
        </Text>

        {stats && stats.totalResponses > 0 ? (
          <>
            <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.primary + '40' }]}>
              <Text style={[styles.statsTitle, { color: colors.textPrimary }]}>Resumo</Text>
              <View style={styles.statsRow}>
                <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>Total de respostas</Text>
                <Text style={[styles.statsValue, { color: colors.primary }]}>{stats.totalResponses}</Text>
              </View>
              <View style={styles.pillarsGrid}>
                <View style={[styles.pillarBox, { backgroundColor: colors.background }]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                  <Text style={[styles.pillarName, { color: colors.textSecondary }]}>Confiança</Text>
                  <Text style={[styles.pillarScore, { color: colors.textPrimary }]}>{formatScore(stats.averageTrust)}</Text>
                </View>
                <View style={[styles.pillarBox, { backgroundColor: colors.background }]}>
                  <Ionicons name="phone-portrait-outline" size={20} color={colors.primary} />
                  <Text style={[styles.pillarName, { color: colors.textSecondary }]}>Facilidade</Text>
                  <Text style={[styles.pillarScore, { color: colors.textPrimary }]}>{formatScore(stats.averageEaseOfUse)}</Text>
                </View>
                <View style={[styles.pillarBox, { backgroundColor: colors.background }]}>
                  <Ionicons name="chatbubbles-outline" size={20} color={colors.primary} />
                  <Text style={[styles.pillarName, { color: colors.textSecondary }]}>Comunicação</Text>
                  <Text style={[styles.pillarScore, { color: colors.textPrimary }]}>{formatScore(stats.averageCommunication)}</Text>
                </View>
                <View style={[styles.pillarBox, { backgroundColor: colors.background }]}>
                  <Ionicons name="heart-outline" size={20} color={colors.primary} />
                  <Text style={[styles.pillarName, { color: colors.textSecondary }]}>Geral</Text>
                  <Text style={[styles.pillarScore, { color: colors.textPrimary }]}>{formatScore(stats.averageOverall)}</Text>
                </View>
              </View>
              <View style={styles.byRoleRow}>
                <Text style={[styles.byRoleText, { color: colors.textSecondary }]}>
                  Adotantes: {stats.byRole?.adopter?.count ?? 0} (média {formatScore(stats.byRole?.adopter?.avgOverall)})
                </Text>
                <Text style={[styles.byRoleText, { color: colors.textSecondary }]}>
                  Tutores: {stats.byRole?.tutor?.count ?? 0} (média {formatScore(stats.byRole?.tutor?.avgOverall)})
                </Text>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Últimas respostas</Text>
            {responses.length === 0 ? (
              <View style={[styles.empty, { backgroundColor: colors.surface }]}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhuma resposta ainda.</Text>
              </View>
            ) : (
              responses.map((r) => (
                <View
                  key={r.id}
                  style={[styles.responseCard, { backgroundColor: colors.surface, borderColor: colors.textSecondary + '30' }]}
                >
                  <View style={styles.responseHeader}>
                    <Text style={[styles.responseName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {r.userName}
                    </Text>
                    <Text style={[styles.responseMeta, { color: colors.textSecondary }]}>
                      {r.role === 'ADOPTER' ? 'Adotante' : 'Tutor'} · {formatDate(r.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.scoresRow}>
                    <Text style={[styles.scoreChip, { color: colors.textSecondary }]}>Conf. {formatScore(r.trustScore)}</Text>
                    <Text style={[styles.scoreChip, { color: colors.textSecondary }]}>Facil. {formatScore(r.easeOfUseScore)}</Text>
                    <Text style={[styles.scoreChip, { color: colors.textSecondary }]}>Comun. {formatScore(r.communicationScore)}</Text>
                    <Text style={[styles.scoreChip, { color: colors.primary, fontWeight: '700' }]}>Geral {formatScore(r.overallScore)}</Text>
                  </View>
                  {r.comment ? (
                    <Text style={[styles.comment, { color: colors.textSecondary }]} numberOfLines={3}>
                      {r.comment}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
          </>
        ) : (
          <View style={[styles.empty, { backgroundColor: colors.surface }]}>
            <Ionicons name="stats-chart-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhuma resposta de pesquisa ainda. As notificações são enviadas após adoções confirmadas.
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xl },
  hint: { fontSize: 14, lineHeight: 20, marginBottom: spacing.lg },
  statsCard: {
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  statsTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  statsLabel: { fontSize: 14 },
  statsValue: { fontSize: 18, fontWeight: '800' },
  pillarsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  pillarBox: {
    width: '48%',
    padding: spacing.sm,
    borderRadius: 10,
    alignItems: 'center',
  },
  pillarName: { fontSize: 12, marginTop: 4 },
  pillarScore: { fontSize: 20, fontWeight: '800', marginTop: 2 },
  byRoleRow: { marginTop: spacing.md, gap: 4 },
  byRoleText: { fontSize: 13 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: spacing.sm },
  empty: { padding: spacing.xl, borderRadius: 12, alignItems: 'center' },
  emptyText: { fontSize: 15, textAlign: 'center', marginTop: spacing.sm },
  responseCard: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  responseHeader: { marginBottom: spacing.xs },
  responseName: { fontSize: 16, fontWeight: '600' },
  responseMeta: { fontSize: 12, marginTop: 2 },
  scoresRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  scoreChip: { fontSize: 12 },
  comment: { fontSize: 13, marginTop: spacing.sm, fontStyle: 'italic' },
});
