import { useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, LoadingLogo, PartnerPanelLayout } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { getMyPartnerServices, type PartnerService } from '../src/api/partner';
import { spacing } from '../src/theme';

function ServiceRow({ item, colors }: { item: PartnerService; colors: { textPrimary: string; textSecondary: string; primary: string } }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={[rowStyles.row, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '30' }]}
      onPress={() => router.push({ pathname: '/partner-service-edit', params: { id: item.id } })}
      activeOpacity={0.7}
    >
      <View style={rowStyles.left}>
        <Text style={[rowStyles.name, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
        {(item.priceDisplay || item.description) && (
          <Text style={[rowStyles.sub, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.priceDisplay || item.description}
          </Text>
        )}
        {item.validUntil && (
          <Text style={[rowStyles.valid, { color: colors.textSecondary }]}>Válido até {new Date(item.validUntil).toLocaleDateString('pt-BR')}</Text>
        )}
      </View>
      <View style={[rowStyles.badge, { backgroundColor: item.active ? colors.primary + '20' : '#9992' }]}>
        <Text style={[rowStyles.badgeText, { color: item.active ? colors.primary : '#666' }]}>{item.active ? 'Ativo' : 'Inativo'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  left: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  sub: { fontSize: 14 },
  valid: { fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 8, marginRight: spacing.sm },
  badgeText: { fontSize: 12, fontWeight: '600' },
});

export default function PartnerServicesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data: services, isLoading } = useQuery({
    queryKey: ['me', 'partner', 'services'],
    queryFn: getMyPartnerServices,
  });

  if (isLoading && services === undefined) {
    return (
      <ScreenContainer>
        <LoadingLogo size={120} />
      </ScreenContainer>
    );
  }

  const list = services ?? [];

  return (
    <ScreenContainer scroll={false}>
      <PartnerPanelLayout>
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ServiceRow item={item} colors={colors} />}
          contentContainerStyle={[styles.list, list.length === 0 && styles.listEmpty]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="construct-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhum serviço cadastrado. Adicione serviços que seu estabelecimento oferece (ex: banho e tosa, consulta veterinária) para que usuários vejam no app.</Text>
            </View>
          }
        />
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/partner-service-edit')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </PartnerPanelLayout>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 140 },
  listEmpty: { flexGrow: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: { textAlign: 'center', marginTop: spacing.md, paddingHorizontal: spacing.lg },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
