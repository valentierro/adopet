import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Switch,
  LayoutAnimation,
  Platform,
  Animated,
} from 'react-native';
import { configureExpandAnimation } from '../src/utils/layoutAnimation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, PageIntro, Toast } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import {
  getMyNotifications,
  getMyNotificationsUnreadCount,
  getPreferences,
  updatePreferences,
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

function UnreadDot({ backgroundColor }: { backgroundColor: string }) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return <Animated.View style={[styles.unreadDot, { backgroundColor, opacity }]} />;
}

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
  const [prefsSaveSuccess, setPrefsSaveSuccess] = useState(false);
  const [prefsSectionExpanded, setPrefsSectionExpanded] = useState(false);
  const [notifyNewPets, setNotifyNewPets] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyReminders, setNotifyReminders] = useState(true);
  const [notifyListingReminders, setNotifyListingReminders] = useState(true);

  const { data: prefs } = useQuery({
    queryKey: ['me', 'preferences'],
    queryFn: getPreferences,
  });

  useEffect(() => {
    if (prefs) {
      setNotifyNewPets(prefs.notifyNewPets);
      setNotifyMessages(prefs.notifyMessages);
      setNotifyReminders(prefs.notifyReminders);
      setNotifyListingReminders(prefs.notifyListingReminders ?? true);
    }
  }, [prefs]);

  const updatePrefsMutation = useMutation({
    mutationFn: updatePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'preferences'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      setToastMessage('Preferências de notificações atualizadas.');
      setPrefsSaveSuccess(true);
      setTimeout(() => setPrefsSaveSuccess(false), 1600);
    },
    onError: (e: unknown) => Alert.alert('Não foi possível salvar', getFriendlyErrorMessage(e, 'Tente novamente.')),
  });

  const updateNotificationPref = useCallback(
    (key: 'notifyNewPets' | 'notifyMessages' | 'notifyReminders' | 'notifyListingReminders', value: boolean) => {
      if (key === 'notifyNewPets') setNotifyNewPets(value);
      else if (key === 'notifyMessages') setNotifyMessages(value);
      else if (key === 'notifyReminders') setNotifyReminders(value);
      else setNotifyListingReminders(value);
      updatePrefsMutation.mutate({
        [key]: value,
        notifyNewPets: key === 'notifyNewPets' ? value : notifyNewPets,
        notifyMessages: key === 'notifyMessages' ? value : notifyMessages,
        notifyReminders: key === 'notifyReminders' ? value : notifyReminders,
        notifyListingReminders: key === 'notifyListingReminders' ? value : notifyListingReminders,
        ...(prefs?.radiusKm != null && { radiusKm: prefs.radiusKm }),
      });
    },
    [notifyNewPets, notifyMessages, notifyReminders, notifyListingReminders, prefs?.radiusKm, updatePrefsMutation],
  );

  const handleSavePrefs = useCallback(() => {
    updatePrefsMutation.mutate({
      notifyNewPets,
      notifyMessages,
      notifyReminders,
      notifyListingReminders,
      ...(prefs?.radiusKm != null && { radiusKm: prefs.radiusKm }),
    });
  }, [notifyNewPets, notifyMessages, notifyReminders, notifyListingReminders, prefs?.radiusKm, updatePrefsMutation]);

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

  const runListExitAnimation = useCallback(() => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.create(220, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
    }
  }, []);

  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      runListExitAnimation();
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications-unread-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      runListExitAnimation();
      setToastMessage('Todas marcadas como lidas.');
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications-unread-count'] });
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível atualizar.')),
  });

  const archiveOneMutation = useMutation({
    mutationFn: archiveNotification,
    onSuccess: () => {
      runListExitAnimation();
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
      runListExitAnimation();
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
      runListExitAnimation();
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
      runListExitAnimation();
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
    configureExpandAnimation();
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
        case 'PARTNERSHIP_REQUEST_ONG':
          router.push('/(tabs)/admin/partners');
          break;
        case 'ADOPTION_CONFIRMATION_REQUESTED':
          router.push('/(tabs)/adoption-confirm');
          break;
        case 'ADOPTION_FORM_SENT':
          if (meta.adoptionRequestId) {
            router.push(`/adoption-form-fill/${meta.adoptionRequestId}`);
          } else if (meta.conversationId) {
            router.push(`/chat/${meta.conversationId}`);
          }
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
        case 'KYC_FRAUD_SUSPICIOUS':
          router.push('/(tabs)/admin/pending-kyc');
          break;
        case 'KYC_AUTO_APPROVED':
          router.push({ pathname: '/(tabs)/admin/pending-kyc', params: { tab: 'approved' } });
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
        case 'ONG_PET_PENDING_APPROVAL':
          router.push('/partner-my-pets');
          break;
        case 'PARTNERSHIP_PAYMENT_PAST_DUE':
        case 'PARTNERSHIP_ENDED_PAID_TODAY':
          router.push('/partner-subscription');
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

        {/* Preferências de notificações (colapsável, fechado por padrão) */}
        <View style={[styles.prefsSection, { borderColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.prefsSectionHeader, { backgroundColor: colors.surface }]}
            onPress={() => {
              configureExpandAnimation();
              setPrefsSectionExpanded((e) => !e);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={20} color={colors.primary} />
            <Text style={[styles.prefsSectionTitle, { color: colors.textPrimary }]}>Preferências de notificações</Text>
            <Ionicons name={prefsSectionExpanded ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          {prefsSectionExpanded && (
            <View style={styles.prefsSectionContent}>
              <Text style={[styles.prefsSectionHint, { color: colors.textSecondary }]}>
                Escolha quais notificações push deseja receber.
              </Text>
              <View style={[styles.prefsRow, { backgroundColor: colors.background }]}>
                <View style={styles.prefsRowContent}>
                  <Ionicons name="paw-outline" size={20} color={colors.primary} style={styles.prefsRowIcon} />
                  <View>
                    <Text style={[styles.prefsRowLabel, { color: colors.textPrimary }]}>Novos pets na sua região</Text>
                    <Text style={[styles.prefsRowDesc, { color: colors.textSecondary }]}>
                      Avisos quando surgirem pets novos (espécie e raio em Editar perfil e na aba Mapa)
                    </Text>
                  </View>
                </View>
                <Switch
                  value={notifyNewPets}
                  onValueChange={(v) => updateNotificationPref('notifyNewPets', v)}
                  trackColor={{ false: colors.background, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
              <View style={[styles.prefsRow, { backgroundColor: colors.background }]}>
                <View style={styles.prefsRowContent}>
                  <Ionicons name="chatbubbles-outline" size={20} color={colors.primary} style={styles.prefsRowIcon} />
                  <View>
                    <Text style={[styles.prefsRowLabel, { color: colors.textPrimary }]}>Mensagens e conversas</Text>
                    <Text style={[styles.prefsRowDesc, { color: colors.textSecondary }]}>
                      Quando alguém enviar mensagem ou iniciar conversa sobre um pet
                    </Text>
                  </View>
                </View>
                <Switch
                  value={notifyMessages}
                  onValueChange={(v) => updateNotificationPref('notifyMessages', v)}
                  trackColor={{ false: colors.background, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
              <View style={[styles.prefsRow, { backgroundColor: colors.background }]}>
                <View style={styles.prefsRowContent}>
                  <Ionicons name="time-outline" size={20} color={colors.primary} style={styles.prefsRowIcon} />
                  <View>
                    <Text style={[styles.prefsRowLabel, { color: colors.textPrimary }]}>Lembretes de conversas</Text>
                    <Text style={[styles.prefsRowDesc, { color: colors.textSecondary }]}>
                      Lembrete quando você não responde há um tempo
                    </Text>
                  </View>
                </View>
                <Switch
                  value={notifyReminders}
                  onValueChange={(v) => updateNotificationPref('notifyReminders', v)}
                  trackColor={{ false: colors.background, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
              <View style={[styles.prefsRow, { backgroundColor: colors.background }]}>
                <View style={styles.prefsRowContent}>
                  <Ionicons name="document-text-outline" size={20} color={colors.primary} style={styles.prefsRowIcon} />
                  <View>
                    <Text style={[styles.prefsRowLabel, { color: colors.textPrimary }]}>Lembretes para atualizar anúncios</Text>
                    <Text style={[styles.prefsRowDesc, { color: colors.textSecondary }]}>
                      Mensagem periódica (~30 dias) para conferir se seus anúncios estão em dia
                    </Text>
                  </View>
                </View>
                <Switch
                  value={notifyListingReminders}
                  onValueChange={(v) => updateNotificationPref('notifyListingReminders', v)}
                  trackColor={{ false: colors.background, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
              {prefsSaveSuccess ? (
                <View style={[styles.prefsSaveBtn, styles.prefsSaveSuccess, { backgroundColor: colors.primary }]}>
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text style={styles.prefsSaveBtnText}>Salvo!</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.prefsSaveBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSavePrefs}
                  disabled={updatePrefsMutation.isPending}
                >
                  <Text style={styles.prefsSaveBtnText}>
                    {updatePrefsMutation.isPending ? 'Salvando...' : 'Salvar preferências'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

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
                        {!n.readAt && !archived && <UnreadDot backgroundColor={colors.primary} />}
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
  prefsSection: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  prefsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  prefsSectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  prefsSectionContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  prefsSectionHint: {
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  prefsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  prefsRowContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: spacing.sm,
  },
  prefsRowIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  prefsRowLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  prefsRowDesc: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  prefsSaveBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  prefsSaveSuccess: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  prefsSaveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
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
