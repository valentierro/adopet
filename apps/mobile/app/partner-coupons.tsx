import { useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, LoadingLogo, PartnerPanelLayout } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { getMyPartnerCoupons, deletePartnerCoupon, type PartnerCoupon } from '../src/api/partner';
import { getFriendlyErrorMessage } from '../src/utils/errorMessage';
import { spacing } from '../src/theme';

function CouponRow({
  item,
  colors,
  selectionMode,
  selected,
  onToggleSelect,
  onDelete,
}: {
  item: PartnerCoupon;
  colors: { textPrimary: string; textSecondary: string; primary: string };
  selectionMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onLongPressRow?: () => void;
}) {
  const router = useRouter();
  const surface = (colors as { surface?: string }).surface ?? '#f5f5f5';
  const discountLabel = item.discountType === 'PERCENT' ? `${item.discountValue}%` : `R$ ${(item.discountValue / 100).toFixed(2)}`;
  const handlePress = () => {
    if (selectionMode) onToggleSelect();
    else router.push({ pathname: '/partner-coupon-edit', params: { id: item.id } });
  };
  const handleLongPress = () => {
    if (selectionMode) onToggleSelect();
    else onLongPressRow?.();
  };
  return (
    <TouchableOpacity
      style={[rowStyles.row, { backgroundColor: colors.primary + '08', borderColor: selected ? colors.primary : colors.primary + '30', borderWidth: selected ? 2 : 1 }]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      {selectionMode && (
        <View style={[rowStyles.checkWrap, { backgroundColor: selected ? colors.primary : surface, borderColor: colors.primary + '50' }]}>
          {selected && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
      )}
      <View style={rowStyles.left}>
        <Text style={[rowStyles.code, { color: colors.primary }]}>{item.code}</Text>
        <Text style={[rowStyles.title, { color: colors.textPrimary }]} numberOfLines={1}>{item.title || discountLabel}</Text>
        {item.validUntil && (
          <Text style={[rowStyles.valid, { color: colors.textSecondary }]}>Válido até {new Date(item.validUntil).toLocaleDateString('pt-BR')}</Text>
        )}
      </View>
      {!selectionMode && (
        <TouchableOpacity
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={rowStyles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={20} color={colors.error || '#DC2626'} />
        </TouchableOpacity>
      )}
      <View style={[rowStyles.badge, { backgroundColor: item.active ? colors.primary + '20' : '#9992' }]}>
        <Text style={[rowStyles.badgeText, { color: item.active ? colors.primary : '#666' }]}>{item.active ? 'Ativo' : 'Inativo'}</Text>
      </View>
      {!selectionMode && <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />}
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  checkWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  left: { flex: 1, minWidth: 0 },
  code: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  title: { fontSize: 14 },
  valid: { fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: spacing.xs, marginRight: spacing.xs },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 8, marginRight: spacing.sm },
  badgeText: { fontSize: 12, fontWeight: '600' },
});

export default function PartnerCouponsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: coupons, isLoading } = useQuery({
    queryKey: ['me', 'partner', 'coupons'],
    queryFn: getMyPartnerCoupons,
  });

  const deleteMutation = useMutation({
    mutationFn: deletePartnerCoupon,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'coupons'] }),
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível excluir o cupom.')),
  });

  const confirmDelete = (item: PartnerCoupon) => {
    Alert.alert('Excluir cupom', `Excluir o cupom "${item.code}"? Esta ação não pode ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
    ]);
  };

  const confirmBatchDelete = () => {
    const n = selectedIds.size;
    Alert.alert('Excluir cupons', `Excluir ${n} cupom${n !== 1 ? 'ns' : ''}? Esta ação não pode ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          for (const id of selectedIds) {
            await deletePartnerCoupon(id);
          }
          queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'coupons'] });
          setSelectedIds(new Set());
          setSelectionMode(false);
        },
      },
    ]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading && coupons === undefined) {
    return (
      <ScreenContainer>
        <LoadingLogo size={120} />
      </ScreenContainer>
    );
  }

  const list = coupons ?? [];

  return (
    <ScreenContainer scroll={false}>
      <PartnerPanelLayout>
        {selectionMode && selectedIds.size > 0 && (
          <View style={[styles.batchBar, { backgroundColor: colors.primary + '18', borderBottomColor: colors.primary + '30' }]}>
            <Text style={[styles.batchText, { color: colors.textPrimary }]}>
              {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
            </Text>
            <TouchableOpacity
              style={[styles.batchBtn, { backgroundColor: colors.error || '#DC2626' }]}
              onPress={confirmBatchDelete}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={styles.batchBtnText}>Excluir</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.batchBtn, { backgroundColor: colors.textSecondary }]}
              onPress={() => { setSelectionMode(false); setSelectedIds(new Set()); }}
              activeOpacity={0.8}
            >
              <Text style={styles.batchBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CouponRow
              item={item}
              colors={colors}
              selectionMode={selectionMode}
              selected={selectedIds.has(item.id)}
              onToggleSelect={() => toggleSelect(item.id)}
              onDelete={() => confirmDelete(item)}
              onLongPressRow={() => { setSelectionMode(true); setSelectedIds(new Set([item.id])); }}
            />
          )}
          contentContainerStyle={[styles.list, list.length === 0 && styles.listEmpty]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="pricetag-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhum cupom ainda. Crie um para que usuários vejam descontos no app.</Text>
            </View>
          }
          ListHeaderComponent={
            list.length > 0 ? (
              <View style={styles.headerRow}>
                <TouchableOpacity
                  style={[styles.modeBtn, { backgroundColor: colors.surface }]}
                  onPress={() => setSelectionMode((m) => !m)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={selectionMode ? 'close-circle' : 'checkbox-outline'} size={20} color={colors.primary} />
                  <Text style={[styles.modeBtnText, { color: colors.primary }]}>{selectionMode ? 'Sair da seleção' : 'Selecionar'}</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
        {!selectionMode && (
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/partner-coupon-edit')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        )}
      </PartnerPanelLayout>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', marginBottom: spacing.sm },
  modeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: 10 },
  modeBtnText: { fontSize: 14, fontWeight: '600' },
  batchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  batchText: { flex: 1, fontSize: 14, fontWeight: '600' },
  batchBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: 8 },
  batchBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
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
