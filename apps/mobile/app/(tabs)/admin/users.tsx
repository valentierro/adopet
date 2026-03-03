import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Toast, LoadingLogo } from '../../../src/components';
import { useTheme } from '../../../src/hooks/useTheme';
import { getAdminUsersList, banUser, unbanUser, type AdminUserListItem } from '../../../src/api/admin';
import { getFriendlyErrorMessage } from '../../../src/utils/errorMessage';
import { spacing } from '../../../src/theme';

export default function AdminUsersScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [usersSearch, setUsersSearch] = useState('');
  const [banUserModal, setBanUserModal] = useState<{ userId: string; userName?: string } | null>(null);
  const [banUserReason, setBanUserReason] = useState('');
  const [unbanUserModal, setUnbanUserModal] = useState<{ userId: string; userName?: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const usersSearchTerm = (usersSearch ?? '').trim();
  const usersSearchMinLength = usersSearchTerm.length >= 2;

  const { data: usersListResponse, isLoading: loadingUsersList, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'users-list', usersSearchTerm],
    queryFn: () => getAdminUsersList(usersSearchTerm, 1, 20),
    enabled: usersSearchMinLength,
  });
  const usersList = usersListResponse?.items ?? [];

  const banUserMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      banUser(userId, reason ? { reason } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      setToastMessage('Usuário banido. A conta foi desativada.');
      setBanUserModal(null);
      setBanUserReason('');
    },
    onError: (e: unknown) =>
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível banir o usuário.')),
  });

  const unbanUserMutation = useMutation({
    mutationFn: (userId: string) => unbanUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      setToastMessage('Usuário reativado.');
      setUnbanUserModal(null);
    },
    onError: (e: unknown) =>
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível reativar o usuário.')),
  });

  return (
    <ScreenContainer
      scroll
      refreshControl={
        <RefreshControl
          refreshing={isRefetching && usersSearchMinLength}
          onRefresh={() => refetch()}
          tintColor={colors.primary}
        />
      }
    >
      <View>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Buscar usuário</Text>
        <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
          Digite e-mail ou nome de usuário (@) para buscar. Banir desativa a conta (não permite banir
          administradores).
        </Text>
        <View
          style={[
            styles.rowWrap,
            { marginBottom: spacing.sm, flexWrap: 'wrap', gap: spacing.xs, alignItems: 'center' },
          ]}
        >
          <TextInput
            style={[
              styles.searchInput,
              {
                flex: 1,
                minWidth: 120,
                minHeight: 52,
                paddingVertical: spacing.md,
                fontSize: 16,
                backgroundColor: colors.surface,
                borderColor: colors.background,
                color: colors.textPrimary,
              },
            ]}
            placeholder="E-mail ou @nome de usuário"
            placeholderTextColor={colors.textSecondary}
            value={usersSearch}
            onChangeText={setUsersSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {loadingUsersList && usersSearchMinLength ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : null}
        </View>
        {!usersSearchMinLength ? (
          <View style={[styles.emptyBlock, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Digite ao menos 2 caracteres (e-mail ou @) para buscar.
            </Text>
          </View>
        ) : loadingUsersList && usersList.length === 0 ? (
          <View style={styles.sectionLoading}>
            <LoadingLogo size={80} />
          </View>
        ) : usersList.length === 0 ? (
          <View style={[styles.emptyBlock, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhum usuário encontrado.
            </Text>
          </View>
        ) : (
          usersList.map((u: AdminUserListItem) => {
            const isBanned = !!(u.deactivatedAt || u.bannedAt);
            return (
              <View
                key={u.id}
                style={[styles.reportCard, { backgroundColor: colors.surface, borderColor: colors.background }]}
              >
                <View style={styles.reportContent}>
                  {isBanned && (
                    <View
                      style={[
                        styles.resolvedBadge,
                        { backgroundColor: (colors.error || '#dc2626') + '20', marginBottom: spacing.xs },
                      ]}
                    >
                      <Ionicons name="ban" size={14} color={colors.error || '#dc2626'} />
                      <Text style={[styles.resolvedText, { color: colors.error || '#dc2626' }]}>
                        {u.bannedAt
                          ? `Banido em ${u.bannedAt ? new Date(u.bannedAt).toLocaleDateString('pt-BR') : ''}${u.bannedReason ? ` — ${u.bannedReason}` : ''}`
                          : `Desativado em ${u.deactivatedAt ? new Date(u.deactivatedAt).toLocaleDateString('pt-BR') : ''}`}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.reportTarget, { color: colors.textPrimary }]}>{u.name}</Text>
                  <Text style={[styles.reportReason, { color: colors.textSecondary }]}>
                    {u.email}
                    {u.username ? ` • @${u.username}` : ''}
                    {u.phone ? ` • ${u.phone}` : ''}
                  </Text>
                  {!isBanned ? (
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        { backgroundColor: colors.error || '#DC2626', marginTop: spacing.sm },
                      ]}
                      onPress={() => setBanUserModal({ userId: u.id, userName: u.name })}
                      disabled={banUserMutation.isPending}
                    >
                      {banUserMutation.isPending ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons name="ban" size={18} color="#fff" />
                      )}
                      <Text style={styles.actionBtnText}>
                        {banUserMutation.isPending ? 'Banindo...' : 'Banir'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        { backgroundColor: colors.primary || '#0d9488', marginTop: spacing.sm },
                      ]}
                      onPress={() => setUnbanUserModal({ userId: u.id, userName: u.name })}
                      disabled={unbanUserMutation.isPending}
                    >
                      {unbanUserMutation.isPending ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                      )}
                      <Text style={styles.actionBtnText}>
                        {unbanUserMutation.isPending ? 'Reativando...' : 'Desbanir'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>

      <Modal visible={!!banUserModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {banUserModal?.userName ? `Banir ${banUserModal.userName}?` : 'Banir usuário?'}
            </Text>
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
              A conta será desativada e não poderá fazer login. Motivo (opcional):
            </Text>
            <TextInput
              style={[
                styles.searchInput,
                styles.feedbackInput,
                {
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                  borderColor: colors.primary + '40',
                },
              ]}
              placeholder="Ex: Violação das regras"
              placeholderTextColor={colors.textSecondary}
              value={banUserReason}
              onChangeText={setBanUserReason}
              multiline
              numberOfLines={2}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.background }]}
                onPress={() => {
                  setBanUserModal(null);
                  setBanUserReason('');
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  { backgroundColor: colors.error || '#DC2626' },
                  banUserMutation.isPending && styles.modalBtnDisabled,
                ]}
                onPress={() =>
                  banUserModal &&
                  banUserMutation.mutate({
                    userId: banUserModal.userId,
                    reason: banUserReason.trim() || undefined,
                  })
                }
                disabled={banUserMutation.isPending}
              >
                <Text style={[styles.modalBtnTextPrimary, { color: '#fff' }]}>
                  {banUserMutation.isPending ? 'Banindo...' : 'Banir'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!unbanUserModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {unbanUserModal?.userName ? `Desbanir ${unbanUserModal.userName}?` : 'Desbanir usuário?'}
            </Text>
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
              O usuário poderá fazer login novamente no app.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.background }]}
                onPress={() => setUnbanUserModal(null)}
              >
                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  { backgroundColor: colors.primary || '#0d9488' },
                  unbanUserMutation.isPending && styles.modalBtnDisabled,
                ]}
                onPress={() => unbanUserModal && unbanUserMutation.mutate(unbanUserModal.userId)}
                disabled={unbanUserMutation.isPending}
              >
                <Text style={[styles.modalBtnTextPrimary, { color: '#fff' }]}>
                  {unbanUserMutation.isPending ? 'Reativando...' : 'Desbanir'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.xs },
  sectionSub: { fontSize: 13, marginBottom: spacing.md },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  searchInput: { padding: spacing.md, borderRadius: 10, fontSize: 16, marginBottom: spacing.sm, borderWidth: 1 },
  sectionLoading: { paddingVertical: spacing.xl, alignItems: 'center', justifyContent: 'center', minHeight: 120 },
  emptyBlock: { padding: spacing.lg, borderRadius: 12, marginBottom: spacing.sm },
  emptyText: { fontSize: 14 },
  reportCard: { padding: spacing.md, borderRadius: 12, borderWidth: 1, marginBottom: spacing.sm },
  reportContent: { flex: 1 },
  reportTarget: { fontSize: 15, fontWeight: '600' },
  reportReason: { fontSize: 14, marginTop: 4 },
  resolvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resolvedText: { fontSize: 12, fontWeight: '600' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
  modalContent: { borderRadius: 16, padding: spacing.lg, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  modalLabel: { fontSize: 12, fontWeight: '600', marginBottom: spacing.xs },
  feedbackInput: { minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  modalBtn: { flex: 1, padding: spacing.md, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { fontWeight: '600' },
  modalBtnTextPrimary: { color: '#fff', fontWeight: '600' },
  modalBtnDisabled: { opacity: 0.6 },
});
