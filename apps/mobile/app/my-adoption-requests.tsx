import { useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Image } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, LoadingLogo } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { getMyAdoptionRequests, type AdoptionRequestWithDetails } from '../src/api/adoption-requests';
import { spacing } from '../src/theme';

const STATUS_LABEL: Record<string, string> = {
  INTERESTED: 'Interesse registrado',
  FORM_SENT: 'Formulário enviado',
  FORM_SUBMITTED: 'Formulário preenchido',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  ADOPTION_PROPOSED: 'Proposta de adoção',
  ADOPTION_CONFIRMED: 'Adoção confirmada',
};

const STATUS_COLOR: Record<string, string> = {
  INTERESTED: '#6b7280',
  FORM_SENT: '#2563eb',
  FORM_SUBMITTED: '#7c3aed',
  APPROVED: '#059669',
  REJECTED: '#dc2626',
  ADOPTION_PROPOSED: '#d97706',
  ADOPTION_CONFIRMED: '#059669',
};

function canFillForm(status: string): boolean {
  return status === 'FORM_SENT';
}

export default function MyAdoptionRequestsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['my-adoption-requests'],
    queryFn: getMyAdoptionRequests,
  });

  const renderItem = ({ item }: { item: AdoptionRequestWithDetails }) => {
    const statusColor = STATUS_COLOR[item.status] ?? colors.textSecondary;
    const canFill = canFillForm(item.status);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface }]}
        onPress={() => {
          if (canFill) {
            router.push(`/adoption-form-fill/${item.id}`);
          } else if (item.conversationId) {
            router.push(`/(tabs)/chat/${item.conversationId}`);
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardRow}>
          {item.pet?.name ? (
            <View style={[styles.petThumb, { backgroundColor: colors.background }]}>
              <Ionicons name="paw" size={24} color={colors.textSecondary} />
            </View>
          ) : null}
          <View style={styles.cardContent}>
            <Text style={[styles.petName, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.pet?.name ?? 'Pet'}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {STATUS_LABEL[item.status] ?? item.status}
              </Text>
            </View>
            {canFill && item.expiresAt && (
              <Text style={[styles.expiresHint, { color: colors.textSecondary }]}>
                Prazo: até {new Date(item.expiresAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </Text>
            )}
            {item.rejectionFeedback ? (
              <Text style={[styles.feedbackText, { color: colors.textSecondary }]} numberOfLines={2}>
                Feedback: {item.rejectionFeedback}
              </Text>
            ) : null}
          </View>
          <Ionicons
            name={canFill ? 'document-text-outline' : 'chevron-forward'}
            size={22}
            color={canFill ? colors.primary : colors.textSecondary}
          />
        </View>
        {canFill && (
          <Text style={[styles.hintText, { color: colors.primary }]}>
            Toque para preencher o formulário
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <LoadingLogo size={120} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <FlatList
        data={requests}
        keyExtractor={(r) => r.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, requests.length === 0 && styles.listEmpty]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Nenhuma solicitação</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Quando uma ONG enviar um formulário de adoção no chat, ele aparecerá aqui.
            </Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  listEmpty: { flex: 1 },
  card: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  petThumb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  cardContent: { flex: 1, minWidth: 0 },
  petName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusText: { fontSize: 13, fontWeight: '600' },
  expiresHint: { fontSize: 12, marginTop: 2 },
  feedbackText: { fontSize: 13, marginTop: 6 },
  hintText: { fontSize: 13, marginTop: spacing.sm, fontWeight: '500' },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: spacing.md, textAlign: 'center' },
  emptySub: { fontSize: 15, marginTop: spacing.sm, textAlign: 'center', lineHeight: 22 },
});
