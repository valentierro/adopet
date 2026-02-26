import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, PageIntro, Toast } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import {
  getMyNotifications,
  getMyNotificationsUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  archiveNotification,
  archiveNotifications,
  deleteNotification,
  deleteNotifications,
  type InAppNotificationItem,
} from '../src/api/me';
import { getFriendlyErrorMessage } from '../src/utils/errorMessage';
import { spacing } from '../src/theme';

type TabKind = 'recent' | 'archived';

function formatNotificationTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatNotificationDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return formatNotificationTime(iso);
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays} dias atrás`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

type SectionKey = 'hoje' | 'semanaPassada' | 'mesPassado';

function getSectionKey(createdAt: string): SectionKey {
  const d = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'hoje';
  if (diffDays < 7) return 'semanaPassada';
  return 'mesPassado';
}

const SECTION_LABELS: Record<SectionKey, string> = {
  hoje: 'Hoje',
  semanaPassada: 'Semana passada',
  mesPassado: 'Mês passado',
};

function groupBySection(list: InAppNotificationItem[]): { key: SectionKey; items: InAppNotificationItem[] }[] {
  const groups: Record<SectionKey, InAppNotificationItem[]> = {
    hoje: [],
    semanaPassada: [],
    mesPassado: [],
  };
  for (const n of list) {
    const key = getSectionKey(n.createdAt);
    groups[key].push(n);
  }
  const order: SectionKey[] = ['hoje', 'semanaPassada', 'mesPassado'];
  return order.filter((k) => groups[k].length > 0).map((key) => ({ key, items: groups[key] }));
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKind>('recent');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(
    () => new Set(['hoje', 'semanaPassada', 'mesPassado']),
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const archived = tab === 'archived';

  // Duas queries em paralelo: ao abrir a tela já carrega ambas as abas, assim a troca é instantânea
  const recentQuery = useQuery({
    queryKey: ['me', 'notifications', false],
    queryFn: () => getMyNotifications(200, false),
    staleTime: 60 * 1000,
  });
  const archivedQuery = useQuery({
    queryKey: ['me', 'notifications', true],
    queryFn: () => getMyNotifications(200, true),
    staleTime: 60 * 1000,
  });

  const currentQuery = archived ? archivedQuery : recentQuery;
  const list = Array.isArray(currentQuery.data) ? currentQuery.data : [];
  const isLoading = currentQuery.isLoading;
  const isRefetching = currentQuery.isRefetching;
  const refetch = currentQuery.refetch;

  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications-unread-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications-unread-count'] });
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível atualizar.')),
  });

  const archiveOneMutation = useMutation({
    mutationFn: archiveNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications-unread-count'] });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.clear();
        return next;
      });
      setSelectionMode(false);
      setToastMessage('Notificação arquivada.');
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível arquivar.')),
  });

  const archiveManyMutation = useMutation({
    mutationFn: archiveNotifications,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications-unread-count'] });
      setSelectedIds(new Set());
      setSelectionMode(false);
      const n = data.archived;
      setToastMessage(n === 1 ? 'Notificação arquivada.' : `${n} notificações arquivadas.`);
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível arquivar.')),
  });

  const deleteOneMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications-unread-count'] });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.clear();
        return next;
      });
      setSelectionMode(false);
      setToastMessage('Notificação excluída.');
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível excluir.')),
  });

  const deleteManyMutation = useMutation({
    mutationFn: deleteNotifications,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications-unread-count'] });
      setSelectedIds(new Set());
      setSelectionMode(false);
      const n = data.deleted;
      setToastMessage(n === 1 ? 'Notificação excluída.' : `${n} notificações excluídas.`);
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível excluir.')),
  });

  const unreadCount = useMemo(() => list.filter((n) => !n.readAt).length, [list]);
  const sections = useMemo(() => groupBySection(list), [list]);

  const toggleSection = useCallback((key: SectionKey) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handlePress = useCallback(
    (n: InAppNotificationItem) => {
      if (selectionMode) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(n.id)) next.delete(n.id);
          else next.add(n.id);
          return next;
        });
        return;
      }
      if (!n.readAt) markReadMutation.mutate(n.id);
      const meta = n.metadata ?? {};
      switch (n.type) {
        case 'SATISFACTION_SURVEY':
          if (meta.adoptionId && meta.role) {
            router.push({ pathname: '/survey', params: { adoptionId: String(meta.adoptionId), role: String(meta.role) } });
          }
          break;
        case 'ADOPTION_CONFIRMED_BY_ADOPET':
          router.push('/(tabs)/my-adoptions');
          break;
        case 'PENDING_ADOPTION_BY_TUTOR':
          router.push('/(tabs)/admin/adoptions');
          break;
        case 'ADOPTION_CONFIRMATION_REQUESTED':
          router.push('/(tabs)/adoption-confirm');
          break;
        case 'NEW_MESSAGE':
        case 'NEW_CONVERSATION':
          if (meta.conversationId) {
            router.push(`/chat/${meta.conversationId}`);
          }
          break;
        case 'PET_PUBLICATION_APPROVED':
        case 'PET_PUBLICATION_REJECTED':
          router.push('/(tabs)/my-pets');
          break;
        case 'KYC_APPROVED':
        case 'KYC_REJECTED':
        case 'KYC_REVOKED':
          queryClient.invalidateQueries({ queryKey: ['me'] });
          queryClient.invalidateQueries({ queryKey: ['me', 'kyc-status'] });
          router.push('/kyc');
          break;
        case 'VERIFICATION_APPROVED':
        case 'VERIFICATION_REJECTED':
          if (meta.petId) {
            router.push(`/pet/${meta.petId}`);
          } else {
            router.push('/(tabs)/profile');
          }
          break;
        case 'PET_FAVORITED':
          if (meta.petId) {
            router.push(`/pet/${meta.petId}`);
          }
          break;
        default:
          break;
      }
    },
    [selectionMode, markReadMutation, router, queryClient],
  );

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === list.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(list.map((n) => n.id)));
    }
  }, [list, selectedIds.size]);

  const handleMarkAllRead = useCallback(() => {
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  const handleArchiveSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    if (selectedIds.size === 1) {
      archiveOneMutation.mutate([...selectedIds][0]!);
    } else {
      archiveManyMutation.mutate([...selectedIds]);
    }
  }, [selectedIds, archiveOneMutation, archiveManyMutation]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      'Excluir notificações',
      selectedIds.size === 1
        ? 'Excluir esta notificação? Esta ação não pode ser desfeita.'
        : `Excluir ${selectedIds.size} notificações? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            if (selectedIds.size === 1) {
              deleteOneMutation.mutate([...selectedIds][0]!);
            } else {
              deleteManyMutation.mutate([...selectedIds]);
            }
          },
        },
      ],
    );
  }, [selectedIds, deleteOneMutation, deleteManyMutation]);

  const showCardActions = useCallback(
    (n: InAppNotificationItem) => {
      const options: string[] = [];
      if (!archived) options.push('Arquivar');
      options.push('Excluir');
      options.push('Cancelar');
      Alert.alert('Notificação', 'O que deseja fazer?', [
        ...(options.slice(0, -1).map((opt) => ({
          text: opt,
          onPress: () => {
            if (opt === 'Arquivar') archiveOneMutation.mutate(n.id);
            if (opt === 'Excluir') {
              Alert.alert(
                'Excluir notificação',
                'Esta ação não pode ser desfeita.',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Excluir', style: 'destructive', onPress: () => deleteOneMutation.mutate(n.id) },
                ],
              );
            }
          },
        }))),
        { text: 'Cancelar', style: 'cancel' },
      ]);
    },
    [archived, archiveOneMutation, deleteOneMutation],
  );

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} colors={[colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        <PageIntro title="Notificações" subtitle="Avisos sobre sua conta e parcerias." />

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.tab, tab === 'recent' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => {
              setTab('recent');
              setSelectionMode(false);
              setSelectedIds(new Set());
            }}
          >
            <Text style={[styles.tabText, { color: tab === 'recent' ? colors.primary : colors.textSecondary }]}>
              Recentes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'archived' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => {
              setTab('archived');
              setSelectionMode(false);
              setSelectedIds(new Set());
            }}
          >
            <Text style={[styles.tabText, { color: tab === 'archived' ? colors.primary : colors.textSecondary }]}>
              Arquivadas
            </Text>
          </TouchableOpacity>
        </View>

        {/* Toolbar: Marcar todas lidas (recent only) + Selection mode */}
        <View style={styles.toolbar}>
          {!archived && unreadCount > 0 && !selectionMode && (
            <TouchableOpacity
              style={[styles.markAllBtn, { borderColor: colors.primary }]}
              onPress={handleMarkAllRead}
              disabled={markAllReadMutation.isPending}
            >
              {markAllReadMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="checkmark-done-outline" size={18} color={colors.primary} />
              )}
              <Text style={[styles.markAllText, { color: colors.primary }]}>Marcar todas como lidas</Text>
            </TouchableOpacity>
          )}
          {list.length > 0 && (
            <TouchableOpacity
              style={[styles.selectBtn, { borderColor: colors.textSecondary }]}
              onPress={() => (selectionMode ? exitSelectionMode() : setSelectionMode(true))}
            >
              <Text style={[styles.selectBtnText, { color: colors.textSecondary }]}>
                {selectionMode ? 'Cancelar' : 'Selecionar'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Selection mode toolbar */}
        {selectionMode && selectedIds.size > 0 && (
          <View style={[styles.selectionBar, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
            <TouchableOpacity onPress={toggleSelectAll}>
              <Text style={[styles.selectionBarText, { color: colors.primary }]}>
                {selectedIds.size === list.length ? 'Desmarcar todas' : 'Selecionar todas'}
              </Text>
            </TouchableOpacity>
            {!archived && (
              <TouchableOpacity
                style={styles.selectionBarBtn}
                onPress={handleArchiveSelected}
                disabled={archiveOneMutation.isPending || archiveManyMutation.isPending}
              >
                <Ionicons name="archive-outline" size={22} color={colors.primary} />
                <Text style={[styles.selectionBarText, { color: colors.primary }]}>Arquivar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.selectionBarBtn}
              onPress={handleDeleteSelected}
              disabled={deleteOneMutation.isPending || deleteManyMutation.isPending}
            >
              <Ionicons name="trash-outline" size={22} color={colors.error || '#DC2626'} />
              <Text style={[styles.selectionBarText, { color: colors.error || '#DC2626' }]}>Excluir</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentQuery.isError ? (
          <View style={[styles.empty, { backgroundColor: colors.surface }]}>
            <Ionicons name="warning-outline" size={48} color={colors.error || '#DC2626'} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Falha ao carregar notificações.
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { borderColor: colors.primary }]}
              onPress={() => currentQuery.refetch()}
            >
              <Text style={[styles.retryBtnText, { color: colors.primary }]}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : list.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.surface }]}>
            <Ionicons
              name={archived ? 'archive-outline' : 'notifications-off-outline'}
              size={48}
              color={colors.textSecondary}
            />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {archived ? 'Nenhuma notificação arquivada.' : 'Nenhuma notificação.'}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {sections.map(({ key, items }) => {
              const isExpanded = expandedSections.has(key);
              return (
                <View key={key} style={styles.section}>
                  <TouchableOpacity
                    style={styles.sectionHeader}
                    onPress={() => toggleSection(key)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.textSecondary}
                    />
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                      {SECTION_LABELS[key]} ({items.length})
                    </Text>
                  </TouchableOpacity>
                  {isExpanded &&
                    items.map((n) => {
                  const isSelected = selectedIds.has(n.id);
                  return (
                    <Pressable
                      key={n.id}
                      style={[
                        styles.card,
                        {
                          backgroundColor: n.readAt ? colors.surface : colors.primary + '12',
                          borderColor: colors.background,
                        },
                        isSelected && { borderColor: colors.primary, borderWidth: 2 },
                      ]}
                      onPress={() => handlePress(n)}
                      onLongPress={() => {
                        if (!selectionMode) {
                          setSelectionMode(true);
                          setSelectedIds(new Set([n.id]));
                        }
                      }}
                    >
                      {selectionMode && (
                        <View style={styles.cardCheckbox}>
                          <Ionicons
                            name={isSelected ? 'checkbox' : 'square-outline'}
                            size={24}
                            color={isSelected ? colors.primary : colors.textSecondary}
                          />
                        </View>
                      )}
                      <View style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                          <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                            {n.title}
                          </Text>
                          <TouchableOpacity
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            onPress={() => showCardActions(n)}
                            style={styles.moreBtn}
                          >
                            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                        <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
                          {formatNotificationDate(n.createdAt)}
                        </Text>
                        <Text style={[styles.cardBody, { color: colors.textSecondary }]} numberOfLines={4}>
                          {n.body}
                        </Text>
                        {!n.readAt && !archived && (
                          <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                        )}
                      </View>
                    </Pressable>
                  );
                    })}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xl },
  tabs: {
    flexDirection: 'row',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 10,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: 8,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: 8,
  },
  selectBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectionBarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectionBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  empty: {
    padding: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  emptyText: {
    marginTop: spacing.sm,
    fontSize: 15,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: 8,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  list: {
    marginTop: spacing.sm,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: 2,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    position: 'relative',
    marginBottom: spacing.sm,
  },
  cardCheckbox: {
    marginRight: spacing.sm,
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  moreBtn: {
    padding: 4,
  },
  cardDate: {
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  unreadDot: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
