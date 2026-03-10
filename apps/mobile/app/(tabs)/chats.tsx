import { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, RefreshControl, SectionList } from 'react-native';
import { configureExpandAnimation } from '../../src/utils/layoutAnimation';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, EmptyState, LoadingLogo, PageIntro, Toast } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useToastWithDedupe } from '../../src/hooks/useToastWithDedupe';
import { getConversations, getBlockedConversations, deleteConversation } from '../../src/api/conversations';
import { unblockUser } from '../../src/api/blocks';
import type { ConversationListItem } from '../../src/api/conversations';
import { useAuthStore } from '../../src/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../../src/theme';

type SectionKey = 'inProgress' | 'finalized' | 'blocked';

export default function ChatsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const { colors } = useTheme();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sectionExpanded, setSectionExpanded] = useState<Record<SectionKey, boolean>>({
    inProgress: true,
    finalized: true,
    blocked: true,
  });

  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        const t = setTimeout(() => router.replace('/(auth)/welcome'), 0);
        return () => clearTimeout(t);
      }
    }, [userId, router]),
  );

  const { data: conversations = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
    staleTime: 60_000,
  });
  const { data: blockedConversations = [], refetch: refetchBlocked } = useQuery({
    queryKey: ['conversations', 'blocked'],
    queryFn: getBlockedConversations,
    staleTime: 60_000,
  });

  const handleDeleteConversation = useCallback(
    (conversationId: string, petName: string) => {
      Alert.alert(
        'Apagar conversa',
        `Deseja apagar a conversa sobre ${petName}? Esta ação não pode ser desfeita.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Apagar',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteConversation(conversationId);
                await queryClient.invalidateQueries({ queryKey: ['conversations'] });
                showToast('Conversa apagada.');
              } catch {
                showToast('Não foi possível apagar a conversa.');
              }
            },
          },
        ],
      );
    },
    [queryClient],
  );

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchBlocked();
    }, [refetch, refetchBlocked]),
  );

  const inProgress = useMemo(
    () => conversations.filter((c) => !c.pet?.adoptionFinalized),
    [conversations],
  );
  const finalized = useMemo(
    () => conversations.filter((c) => !!c.pet?.adoptionFinalized),
    [conversations],
  );

  const handleUnblock = useCallback(
    (otherUserId: string, userName: string) => {
      Alert.alert('Desbloquear usuário', `Deseja desbloquear ${userName}? A conversa voltará a aparecer na lista.`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desbloquear',
          onPress: async () => {
            try {
              await unblockUser(otherUserId);
              queryClient.invalidateQueries({ queryKey: ['conversations'] });
              queryClient.invalidateQueries({ queryKey: ['conversations', 'blocked'] });
              showToast(`${userName} foi desbloqueado(a).`);
            } catch {
              showToast('Não foi possível desbloquear.');
            }
          },
        },
      ]);
    },
    [queryClient],
  );

  const sections = useMemo(
    () => [
      {
        key: 'inProgress' as const,
        title: 'Adoções em andamento',
        data: sectionExpanded.inProgress ? inProgress : [],
        count: inProgress.length,
        isBlocked: false,
      },
      {
        key: 'finalized' as const,
        title: 'Adoções finalizadas',
        data: sectionExpanded.finalized ? finalized : [],
        count: finalized.length,
        isBlocked: false,
      },
      {
        key: 'blocked' as const,
        title: 'Usuários bloqueados',
        data: sectionExpanded.blocked ? blockedConversations : [],
        count: blockedConversations.length,
        isBlocked: true,
      },
    ],
    [inProgress, finalized, blockedConversations, sectionExpanded],
  );

  const toggleSection = useCallback((key: SectionKey) => {
    configureExpandAnimation();
    setSectionExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const renderItem = useCallback(
    ({ item: c, section }: { item: ConversationListItem; section: (typeof sections)[0] }) => {
      const isBlocked = section.isBlocked === true;
      return (
        <View style={[styles.row, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.rowMain}
            onPress={() => (isBlocked ? null : router.push(`/chat/${c.id}`))}
            onLongPress={() => (isBlocked ? null : handleDeleteConversation(c.id, c.pet.name))}
            activeOpacity={0.7}
            disabled={isBlocked}
          >
            <Image
              source={{ uri: c.pet.photos[0] ?? 'https://placehold.co/56?text=Pet' }}
              style={styles.thumb}
              contentFit="cover"
            />
            <View style={styles.body}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>{c.pet.name}</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]} numberOfLines={1}>
                {c.otherUser.name}
              </Text>
              {c.lastMessage && !isBlocked ? (
                <Text style={[styles.rowPreview, { color: colors.textSecondary }]} numberOfLines={1}>
                  {c.lastMessage.content}
                </Text>
              ) : isBlocked ? (
                <Text style={[styles.rowPreview, { color: colors.textSecondary }]} numberOfLines={1}>
                  Bloqueado
                </Text>
              ) : null}
            </View>
            {!isBlocked && (
              <View style={styles.right}>
                {(c.unreadCount ?? 0) > 0 && (
                  <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.badgeText}>
                      {(c.unreadCount ?? 0) > 99 ? '99+' : (c.unreadCount ?? 0)}
                    </Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </View>
            )}
          </TouchableOpacity>
          {isBlocked && (
            <TouchableOpacity
              style={[styles.unblockBtn, { backgroundColor: colors.primary }]}
              onPress={() => handleUnblock(c.otherUser.id, c.otherUser.name)}
              activeOpacity={0.8}
            >
              <Text style={styles.unblockBtnText}>Desbloquear</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    },
    [colors, router, handleDeleteConversation, handleUnblock],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: (typeof sections)[0] }) => {
      const expanded = sectionExpanded[section.key];
      return (
        <TouchableOpacity
          style={[styles.sectionHeader, { backgroundColor: colors.background, borderBottomColor: colors.surface }]}
          onPress={() => toggleSection(section.key)}
          activeOpacity={0.7}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{section.title}</Text>
          <View style={styles.sectionRight}>
            <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>{section.count}</Text>
            <Ionicons
              name={expanded ? 'chevron-down' : 'chevron-forward'}
              size={20}
              color={colors.textSecondary}
            />
          </View>
        </TouchableOpacity>
      );
    },
    [colors, sectionExpanded, toggleSection],
  );

  if (isLoading && conversations.length === 0 && blockedConversations.length === 0) {
    return (
      <ScreenContainer>
        <PageIntro title="Conversas" subtitle="Suas conversas com tutores dos pets favoritados." />
        <View style={styles.loadingWrap}>
          <LoadingLogo size={160} />
        </View>
      </ScreenContainer>
    );
  }

  if (conversations.length === 0 && blockedConversations.length === 0) {
    return (
      <ScreenContainer scroll>
        <PageIntro title="Conversas" subtitle="Suas conversas com tutores dos pets favoritados." />
        <View style={[styles.avisoBox, { backgroundColor: (colors.warning || '#d97706') + '14', borderColor: (colors.warning || '#d97706') + '40' }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.warning || '#d97706'} style={styles.avisoIcon} />
          <Text style={[styles.avisoText, { color: colors.textSecondary }]}>
            Mantenha o respeito no chat e use este espaço apenas para combinar a adoção dos pets. Adoção no Adopet é voluntária e sem custos.
          </Text>
        </View>
        <EmptyState
          title="Nenhuma conversa"
          message="Quando você favoritar um pet e tocar em Conversar, as conversas aparecerão aqui."
          icon={<Ionicons name="chatbubbles-outline" size={48} color={colors.textSecondary} />}
        />
      </ScreenContainer>
    );
  }

  const listHeader = (
    <>
      <PageIntro title="Conversas" subtitle="Suas conversas com tutores dos pets favoritados." />
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Toque e segure em uma conversa para apagá-la.
      </Text>
      <View style={[styles.avisoBox, { backgroundColor: (colors.warning || '#d97706') + '14', borderColor: (colors.warning || '#d97706') + '40' }]}>
        <Ionicons name="information-circle-outline" size={18} color={colors.warning || '#d97706'} style={styles.avisoIcon} />
        <Text style={[styles.avisoText, { color: colors.textSecondary }]}>
          Mantenha o respeito no chat e use este espaço apenas para combinar a adoção dos pets. Adoção no Adopet é voluntária e sem custos.
        </Text>
      </View>
    </>
  );

  return (
    <ScreenContainer scroll={false}>
      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />
      <SectionList
        sections={sections}
        keyExtractor={(c) => c.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  skeletonWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 160 },
  listContent: { paddingBottom: spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    marginTop: spacing.md,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600' },
  sectionRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionCount: { fontSize: 13 },
  hint: {
    fontSize: 12,
    marginBottom: spacing.md,
  },
  avisoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  avisoIcon: { marginRight: spacing.xs, marginTop: 2 },
  avisoText: { flex: 1, fontSize: 12, lineHeight: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  unblockBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    marginLeft: spacing.sm,
  },
  unblockBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  thumb: { width: 48, height: 48, borderRadius: 24, marginRight: spacing.md },
  body: { flex: 1, minWidth: 0 },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },
  rowPreview: { fontSize: 13, marginTop: 2 },
});
