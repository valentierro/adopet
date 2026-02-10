import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, EmptyState, LoadingLogo, PageIntro, Toast } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { getConversations, deleteConversation } from '../../src/api/conversations';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../../src/theme';

export default function ChatsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { data: conversations = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
  });

  const handleDeleteConversation = (conversationId: string, petName: string) => {
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
              setToastMessage('Conversa apagada.');
            } catch {
              setToastMessage('Não foi possível apagar a conversa.');
            }
          },
        },
      ],
    );
  };

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  if (isLoading && conversations.length === 0) {
    return (
      <ScreenContainer>
        <PageIntro title="Conversas" subtitle="Suas conversas com tutores dos pets favoritados." />
        <View style={styles.loadingWrap}>
          <LoadingLogo size={160} />
        </View>
      </ScreenContainer>
    );
  }

  if (conversations.length === 0) {
    return (
      <ScreenContainer>
        <PageIntro title="Conversas" subtitle="Suas conversas com tutores dos pets favoritados." />
        <EmptyState
          title="Nenhuma conversa"
          message="Quando você favoritar um pet e tocar em Conversar, as conversas aparecerão aqui."
          icon={<Ionicons name="chatbubbles-outline" size={48} color={colors.textSecondary} />}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      scroll
      onRefresh={() => refetch()}
      refreshing={isRefetching}
    >
      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />
      <PageIntro title="Conversas" subtitle="Suas conversas com tutores dos pets favoritados." />
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Toque e segure em uma conversa para apagá-la.
      </Text>
      {conversations.map((c) => (
        <TouchableOpacity
          key={c.id}
          style={[styles.row, { backgroundColor: colors.surface }]}
          onPress={() => router.push(`/chat/${c.id}`)}
          onLongPress={() => handleDeleteConversation(c.id, c.pet.name)}
          activeOpacity={0.7}
        >
          <Image
            source={{ uri: c.pet.photos[0] ?? 'https://placehold.co/56?text=Pet' }}
            style={styles.thumb}
          />
          <View style={styles.body}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{c.pet.name}</Text>
            <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
              {c.otherUser.name}
            </Text>
            {c.lastMessage ? (
              <Text style={[styles.rowPreview, { color: colors.textSecondary }]} numberOfLines={1}>
                {c.lastMessage.content}
              </Text>
            ) : null}
          </View>
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
        </TouchableOpacity>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  skeletonWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 160 },
  hint: {
    fontSize: 12,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
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
