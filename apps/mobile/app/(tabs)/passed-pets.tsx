import { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, EmptyState, LoadingLogo, VerifiedBadge, StatusBadge } from '../../src/components';
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
    staleTime: 0,
  });
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

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
      <View style={[styles.motivoBox, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
        <Ionicons name="heart" size={18} color={colors.primary} style={styles.motivoIcon} />
        <Text style={[styles.motivoText, { color: colors.textPrimary }]}>
          Às vezes o amor está na segunda olhada. Vale a pena rever com carinho.
        </Text>
      </View>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Toque em "Mover para o feed" para o pet voltar ao feed.
      </Text>
      {items.map((pet) => (
        <View key={pet.id} style={[styles.row, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.thumbWrap}
            onPress={() => router.push({ pathname: `/pet/${pet.id}`, params: { from: 'passed-pets' } })}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: pet.photos?.[0] ?? 'https://placehold.co/80?text=Pet' }}
              style={styles.thumb}
            />
          </TouchableOpacity>
          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>{pet.name}</Text>
              {pet.verified && (
                <VerifiedBadge size={16} iconBackgroundColor={colors.primary} />
              )}
            </View>
            <Text style={[styles.rowSub, { color: colors.textSecondary }]} numberOfLines={2}>
              {pet.species} • {pet.age} ano(s) • {pet.size}
            </Text>
            <View style={styles.badgesRow}>
              {pet.partner && (
                <View style={[styles.partnerBadge, { backgroundColor: (pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? (colors.warning || '#d97706') + '30' : (colors.primary + '25') }]}>
                  <Ionicons name={(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? 'star' : 'heart'} size={12} color={(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? (colors.warning || '#d97706') : colors.primary} />
                  <Text style={[styles.partnerBadgeText, { color: (pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? (colors.warning || '#d97706') : colors.primary }]}>
                    {(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? 'Patrocinado' : 'Parceiro'}
                  </Text>
                </View>
              )}
              <StatusBadge
                label={pet.vaccinated ? 'Vacinado' : 'Não vacinado'}
                variant={pet.vaccinated ? 'success' : 'warning'}
              />
              {pet.distanceKm != null && (
                <StatusBadge label={`${pet.distanceKm.toFixed(1)} km`} variant="neutral" />
              )}
            </View>
            <TouchableOpacity
              style={[styles.undoBtn, { backgroundColor: colors.primary }]}
              onPress={() => undoMutation.mutate(pet.id)}
              disabled={undoMutation.isPending}
            >
              <Ionicons name="arrow-undo" size={18} color="#fff" />
              <Text style={styles.undoBtnText}>Mover para o feed</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.detailLinkWrap}
              onPress={() => router.push({ pathname: `/pet/${pet.id}`, params: { from: 'passed-pets' } })}
            >
              <Text style={[styles.detailLinkText, { color: colors.primary }]}>Ver detalhe do pet</Text>
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
  motivoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  motivoIcon: { marginRight: spacing.sm, marginTop: 2 },
  motivoText: { flex: 1, fontSize: 14, lineHeight: 20, fontStyle: 'italic' },
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowTitle: { fontSize: 17, fontWeight: '600', flex: 1 },
  rowSub: { fontSize: 13, marginTop: 4 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  partnerBadgeText: { fontSize: 11, fontWeight: '600' },
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
  detailLinkWrap: { marginTop: spacing.xs },
  detailLinkText: { fontSize: 14, fontWeight: '600' },
});
