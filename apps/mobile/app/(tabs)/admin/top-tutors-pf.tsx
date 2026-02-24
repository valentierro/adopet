import { View, Text, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, LoadingLogo } from '../../../src/components';
import { useTheme } from '../../../src/hooks/useTheme';
import { getTopTutorsPf } from '../../../src/api/admin';
import { spacing } from '../../../src/theme';

export default function AdminTopTutorsPfScreen() {
  const { colors } = useTheme();

  const { data: list = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'top-tutors-pf'],
    queryFn: () => getTopTutorsPf(50),
  });

  if (isLoading && list.length === 0) {
    return (
      <ScreenContainer>
        <LoadingLogo size={120} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isLoading}
            onRefresh={() => refetch()}
            colors={[colors.primary]}
          />
        }
      >
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Tutores pessoa física (sem conta parceiro) com mais adoções concluídas nos últimos 12 meses. Valores altos podem
          merecer revisão (possível red flag).
        </Text>
        {list.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.surface }]}>
            <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhum tutor PF com adoções no período.</Text>
          </View>
        ) : (
          list.map((item, index) => (
            <View
              key={item.userId}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.textSecondary + '30' }]}
            >
              <View style={[styles.rankBadge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.rankText, { color: colors.primary }]}>{index + 1}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.email, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.email}
                </Text>
                {item.username ? (
                  <Text style={[styles.username, { color: colors.textSecondary }]}>@{item.username}</Text>
                ) : null}
                <View style={styles.countRow}>
                  <Ionicons name="heart" size={16} color={colors.primary} />
                  <Text style={[styles.countText, { color: colors.primary }]}>
                    {item.adoptionCount} adoção(ões) nos últimos 12 meses
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xl },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  empty: {
    padding: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: { fontSize: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  rankText: { fontSize: 14, fontWeight: '700' },
  cardBody: { flex: 1, minWidth: 0 },
  name: { fontSize: 17, fontWeight: '700' },
  email: { fontSize: 14, marginTop: 2 },
  username: { fontSize: 13, marginTop: 2 },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  countText: { fontSize: 14, fontWeight: '600' },
});
