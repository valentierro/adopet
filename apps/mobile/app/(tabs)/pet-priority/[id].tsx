import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLayoutEffect } from 'react';
import { ScreenContainer, LoadingLogo, EmptyState } from '../../../src/components';
import { useTheme } from '../../../src/hooks/useTheme';
import { getPriorityAdopters } from '../../../src/api/priority-engine';
import { getPetById } from '../../../src/api/pet';
import { createConversation } from '../../../src/api/conversations';
import { spacing } from '../../../src/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';

export default function PetPriorityScreen() {
  const { id: petId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { colors } = useTheme();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/my-pets')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ padding: 8, marginLeft: 4 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, router, colors.textPrimary]);
  const [refreshing, setRefreshing] = useState(false);

  const { data: pet, isLoading: petLoading } = useQuery({
    queryKey: ['pet', petId],
    queryFn: () => getPetById(petId!),
    enabled: !!petId,
  });

  const {
    data: adopters = [],
    isLoading: adoptersLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['priority-adopters', petId],
    queryFn: () => getPriorityAdopters(petId!),
    enabled: !!petId,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const startConversationMutation = useMutation({
    mutationFn: (adopterId: string) => createConversation(petId!, adopterId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['priority-adopters', petId] });
      router.push(`/chat/${data.id}`);
    },
  });

  const handleOpenAdopterProfile = useCallback(
    (item: { adopterId: string; name: string }) => {
      router.push({ pathname: '/tutor-profile', params: { userId: item.adopterId } });
    },
    [router],
  );

  const handleOpenConversation = useCallback(
    (conversationId: string) => {
      router.push(`/chat/${conversationId}`);
    },
    [router],
  );

  if (petLoading && !pet) {
    return (
      <ScreenContainer>
        <LoadingLogo size={140} />
      </ScreenContainer>
    );
  }

  if (!pet || !petId) {
    return (
      <ScreenContainer>
        <EmptyState
          title="Pet não encontrado"
          message="Volte e tente novamente."
          icon={<Ionicons name="paw-outline" size={48} color={colors.textSecondary} />}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Quem priorizar</Text>
        <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
          Pessoas que favoritaram {pet.name}, ordenadas por quem priorizar primeiro. Toque no card para ver o perfil da pessoa.
        </Text>
        <View style={[styles.scoresExplanation, { backgroundColor: colors.background, borderColor: colors.textSecondary + '30' }]}>
          <Text style={[styles.scoresExplanationTitle, { color: colors.textPrimary }]}>Como ler os scores</Text>
          <Text style={[styles.scoresExplanationText, { color: colors.textSecondary }]}>
            <Text style={styles.scoresBold}>Match %</Text> – compatibilidade da pessoa com as preferências do pet (moradia, quintal, experiência etc.).{'\n\n'}
            <Text style={styles.scoresBold}>Perfil %</Text> – quanto do perfil de triagem a pessoa preencheu. Quem já <Text style={styles.scoresBold}>conversou</Text> aparece com destaque. A lista está ordenada pelo maior match primeiro.
          </Text>
        </View>
      </View>

      {adoptersLoading && adopters.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : adopters.length === 0 ? (
        <EmptyState
          title="Nenhum interessado ainda"
          message="Quando alguém favoritar este pet, aparecerá aqui para você priorizar e conversar."
          icon={<Ionicons name="heart-outline" size={48} color={colors.textSecondary} />}
        />
      ) : (
        <FlatList
          data={adopters}
          keyExtractor={(item) => item.adopterId}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing || isRefetching} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.row, { backgroundColor: colors.surface }]}
              onPress={() => handleOpenAdopterProfile(item)}
              activeOpacity={0.7}
            >
              {item.avatarUrl ? (
                <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.background }]}>
                  <Text style={[styles.avatarLetter, { color: colors.textSecondary }]}>
                    {(item.name ?? '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.rowBody}>
                <Text style={[styles.rowName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.rowBadges}>
                  {item.matchScore != null && (
                    <View style={[styles.badge, { backgroundColor: colors.primary + '22' }]}>
                      <Text style={[styles.badgeText, { color: colors.primary }]}>{item.matchScore}% match</Text>
                    </View>
                  )}
                  <View style={[styles.badge, { backgroundColor: colors.textSecondary + '22' }]}>
                    <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                      {item.profileCompleteness}% perfil
                    </Text>
                  </View>
                  {item.hasConversation && item.conversationId ? (
                    <TouchableOpacity
                      style={[styles.badge, styles.conversationBadge, { backgroundColor: colors.primary + '22' }]}
                      onPress={(e) => {
                        e?.stopPropagation?.();
                        handleOpenConversation(item.conversationId!);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="chatbubble" size={14} color={colors.primary} />
                      <Text style={[styles.badgeText, { color: colors.primary, marginLeft: 4 }]}>Ver conversa</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.badge, styles.conversationBadge, { backgroundColor: colors.primary + '22' }]}
                      onPress={(e) => {
                        e?.stopPropagation?.();
                        startConversationMutation.mutate(item.adopterId);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      disabled={startConversationMutation.isPending}
                    >
                      {startConversationMutation.isPending ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <>
                          <Ionicons name="chatbubble-outline" size={14} color={colors.primary} />
                          <Text style={[styles.badgeText, { color: colors.primary, marginLeft: 4 }]}>Iniciar conversa</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  scoresExplanation: {
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  scoresExplanationTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  scoresExplanationText: {
    fontSize: 12,
    lineHeight: 18,
  },
  scoresBold: {
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: spacing.sm,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 20,
    fontWeight: '700',
  },
  rowBody: {
    flex: 1,
    marginLeft: spacing.md,
    minWidth: 0,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '600',
  },
  rowBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  conversationBadge: {},
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
