import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer } from '../../../src/components';
import { useTheme } from '../../../src/hooks/useTheme';
import { getAdminBugReports, type BugReportItem } from '../../../src/api/admin';
import { spacing } from '../../../src/theme';

export default function AdminBugReportsScreen() {
  const { colors } = useTheme();
  const [bugReportTypeFilter, setBugReportTypeFilter] = useState<'ALL' | 'BUG' | 'SUGGESTION'>('ALL');

  const { data: bugReports = [], refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'bug-reports'],
    queryFn: getAdminBugReports,
  });

  const filtered =
    bugReportTypeFilter === 'ALL'
      ? bugReports
      : bugReports.filter((r: BugReportItem) => (r.type ?? 'BUG') === bugReportTypeFilter);

  return (
    <ScreenContainer
      scroll
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
      }
    >
      <View>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Reports de bugs ({bugReports.length})
        </Text>
        <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
          Bugs (tela de falha) e sugestões enviados pelos usuários. Apenas leitura.
        </Text>
        <View style={[styles.rowWrap, { marginBottom: spacing.sm, flexWrap: 'wrap', gap: spacing.xs }]}>
          {(['ALL', 'BUG', 'SUGGESTION'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.chip,
                {
                  backgroundColor: bugReportTypeFilter === tab ? colors.primary + '30' : colors.surface,
                  borderWidth: 1,
                  borderColor: bugReportTypeFilter === tab ? colors.primary : colors.background,
                },
              ]}
              onPress={() => setBugReportTypeFilter(tab)}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: bugReportTypeFilter === tab ? colors.primary : colors.textSecondary },
                ]}
              >
                {tab === 'ALL' ? 'Todos' : tab === 'BUG' ? 'Bug' : 'Sugestão'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {filtered.length === 0 ? (
          <View style={[styles.emptyBlock, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {bugReports.length === 0
                ? 'Nenhum report de bug ainda.'
                : `Nenhum ${bugReportTypeFilter === 'BUG' ? 'bug' : 'sugestão'}.`}
            </Text>
          </View>
        ) : (
          filtered.map((r: BugReportItem) => (
            <View
              key={r.id}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.background }]}
            >
              {r.type === 'SUGGESTION' ? (
                <View style={[styles.bugReportTypeBadge, { backgroundColor: colors.primary + '25' }]}>
                  <Text style={[styles.bugReportTypeText, { color: colors.primary }]}>Sugestão</Text>
                </View>
              ) : (
                <View
                  style={[styles.bugReportTypeBadge, { backgroundColor: (colors.error || '#DC2626') + '20' }]}
                >
                  <Text style={[styles.bugReportTypeText, { color: colors.error || '#DC2626' }]}>Bug</Text>
                </View>
              )}
              <Text style={[styles.bugReportMessage, { color: colors.textPrimary }]} numberOfLines={3}>
                {r.message}
              </Text>
              {(r.userName ?? r.userEmail) && (
                <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                  {r.userName ?? 'Anônimo'}
                  {r.userEmail ? ` • ${r.userEmail}` : ''}
                </Text>
              )}
              {r.screen ? (
                <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>Tela: {r.screen}</Text>
              ) : null}
              {r.userComment ? (
                <Text style={[styles.bugReportComment, { color: colors.textSecondary }]}>
                  "{r.userComment}"
                </Text>
              ) : null}
              <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
                {new Date(r.createdAt).toLocaleString('pt-BR')}
              </Text>
              {r.stack ? (
                <Text
                  style={[styles.bugReportStack, { color: colors.textSecondary }]}
                  numberOfLines={5}
                >
                  {r.stack}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.xs },
  sectionSub: { fontSize: 13, marginBottom: spacing.md },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  chipText: { fontSize: 14, fontWeight: '600' },
  emptyBlock: { padding: spacing.lg, borderRadius: 12, marginBottom: spacing.sm },
  emptyText: { fontSize: 14 },
  card: { padding: spacing.md, borderRadius: 12, borderWidth: 1, marginBottom: spacing.sm },
  bugReportTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  bugReportTypeText: { fontSize: 12, fontWeight: '600' },
  bugReportMessage: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  bugReportComment: { fontSize: 13, fontStyle: 'italic', marginTop: 4 },
  cardMeta: { fontSize: 13 },
  cardDate: { fontSize: 12, marginTop: 4 },
  bugReportStack: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 6,
  },
});
