import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, EmptyState, LoadingLogo } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { getPassedPets, undoPass } from '../../src/api/swipes';
import { getFriendlyErrorMessage } from '../../src/utils/errorMessage';
import { spacing } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

export default function PassedPetsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['swipes', 'passed'],
    queryFn: getPassedPets,
  });
  const undoMutation = useMutation({
    mutationFn: undoPass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swipes', 'passed'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível desfazer.'));
    },
  });

  const items = data?.items ?? [];

  if (isLoading && items.length === 0) {
    return (
      <ScreenContainer>
        <View style={styles.loadingWrap}>
          <LoadingLogo size={160} />
        </View>
      </ScreenContainer>
    );
  }

  if (items.length === 0) {
    return (
      <ScreenContainer>
        <EmptyState
          title="Nenhum pet passado"
          message="Quando você passar em um pet no feed, ele aparecerá aqui para você reconsiderar."
          icon={<Ionicons name="arrow-undo-outline" size={48} color={colors.textSecondary} />}
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
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Toque em "Ver de novo" para o pet voltar ao feed.
      </Text>
      {items.map((pet) => (
        <View key={pet.id} style={[styles.row, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.thumbWrap}
            onPress={() => router.push(`/pet/${pet.id}`)}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: pet.photos?.[0] ?? 'https://placehold.co/80?text=Pet' }}
              style={styles.thumb}
            />
          </TouchableOpacity>
          <View style={styles.body}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{pet.name}</Text>
            <Text style={[styles.rowSub, { color: colors.textSecondary }]} numberOfLines={2}>
              {pet.species} • {pet.age} ano(s) • {pet.size}
            </Text>
            <TouchableOpacity
              style={[styles.undoBtn, { backgroundColor: colors.primary }]}
              onPress={() => undoMutation.mutate(pet.id)}
              disabled={undoMutation.isPending}
            >
              <Ionicons name="arrow-undo" size={18} color="#fff" />
              <Text style={styles.undoBtnText}>Ver de novo</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  skeletonWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 160 },
  hint: {
    fontSize: 13,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  thumbWrap: { marginRight: spacing.md },
  thumb: { width: 72, height: 72, borderRadius: 12 },
  body: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 17, fontWeight: '600' },
  rowSub: { fontSize: 13, marginTop: 4 },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
  },
  undoBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
