import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Linking,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Toast } from '../../../src/components';
import { useTheme } from '../../../src/hooks/useTheme';
import { getPendingKyc, updateUserKyc, type PendingKycItem } from '../../../src/api/admin';
import { getFriendlyErrorMessage } from '../../../src/utils/errorMessage';
import { spacing } from '../../../src/theme';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function PendingKycScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);

  const { data: list = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'pending-kyc'],
    queryFn: getPendingKyc,
  });

  const updateKyc = useMutation({
    mutationFn: ({ userId, status, reason }: { userId: string; status: 'VERIFIED' | 'REJECTED'; reason?: string }) =>
      updateUserKyc(userId, status, reason),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-kyc'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      setRejectingUserId(null);
      setRejectReason('');
      setToast(status === 'VERIFIED' ? 'KYC aprovado.' : 'KYC rejeitado.');
    },
    onError: (err) => {
      setRejectingUserId(null);
      setToast(getFriendlyErrorMessage(err) || 'Erro ao atualizar KYC.');
    },
  });

  const handleApprove = (item: PendingKycItem) => {
    Alert.alert('Aprovar KYC', `Aprovar verificação de identidade de ${item.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Aprovar', onPress: () => updateKyc.mutate({ userId: item.userId, status: 'VERIFIED' }) },
    ]);
  };

  const handleReject = (item: PendingKycItem) => {
    setRejectingUserId(item.userId);
    setRejectReason('');
  };

  const confirmReject = (userId: string) => {
    updateKyc.mutate({ userId, status: 'REJECTED', reason: rejectReason || undefined });
  };

  const cancelReject = () => {
    setRejectingUserId(null);
    setRejectReason('');
  };

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
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {list.length > 0 ? (
          <Text style={[styles.humanDecisionHint, { color: colors.textSecondary }]}>
            A análise é feita por nossa equipe (decisão humana). Aprove ou rejeite após conferir documento e selfie.
          </Text>
        ) : null}
        {list.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>Nenhum KYC pendente no momento.</Text>
        ) : (
          <>
            <Text style={[styles.humanDecisionNote, { color: colors.textSecondary }]}>
              A análise é feita por nossa equipe (decisão humana). Aprove ou rejeite após conferir documento e selfie.
            </Text>
            {list.map((item) => (
            <View key={item.userId} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.primary + '25' }]}>
              <View style={styles.cardRow}>
                <Text style={[styles.name, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.email, { color: colors.textSecondary }]} numberOfLines={1}>{item.email}</Text>
                {item.phone != null && item.phone !== '' && (
                  <Text style={[styles.phone, { color: colors.textSecondary }]}>{item.phone}</Text>
                )}
                <Text style={[styles.date, { color: colors.textSecondary }]}>Enviado em {formatDate(item.kycSubmittedAt)}</Text>
              </View>

              <View style={styles.thumbRow}>
                {item.documentUrl != null && (
                  <TouchableOpacity
                    style={styles.thumbWrap}
                    onPress={() => item.documentUrl && Linking.openURL(item.documentUrl)}
                  >
                    <ExpoImage source={{ uri: item.documentUrl }} style={styles.thumb} contentFit="cover" />
                    <Text style={[styles.thumbLabel, { color: colors.textSecondary }]}>Documento</Text>
                  </TouchableOpacity>
                )}
                {item.selfieUrl != null && (
                  <TouchableOpacity
                    style={styles.thumbWrap}
                    onPress={() => item.selfieUrl && Linking.openURL(item.selfieUrl)}
                  >
                    <ExpoImage source={{ uri: item.selfieUrl }} style={styles.thumb} contentFit="cover" />
                    <Text style={[styles.thumbLabel, { color: colors.textSecondary }]}>Selfie</Text>
                  </TouchableOpacity>
                )}
              </View>

              {rejectingUserId === item.userId ? (
                <View style={styles.rejectBox}>
                  <TextInput
                    style={[styles.rejectInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
                    placeholder="Motivo da rejeição (opcional)"
                    placeholderTextColor={colors.textSecondary}
                    value={rejectReason}
                    onChangeText={setRejectReason}
                    multiline
                  />
                  <View style={styles.rejectActions}>
                    <TouchableOpacity style={[styles.rejectBtn, { borderColor: colors.textSecondary }]} onPress={cancelReject}>
                      <Text style={[styles.rejectBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.rejectBtn, { backgroundColor: colors.primary }]}
                      onPress={() => confirmReject(item.userId)}
                      disabled={updateKyc.isPending}
                    >
                      {updateKyc.isPending ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={[styles.rejectBtnText, { color: '#fff' }]}>Confirmar rejeição</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.primary + '20' }]}
                    onPress={() => handleApprove(item)}
                    disabled={updateKyc.isPending}
                  >
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    <Text style={[styles.actionBtnText, { color: colors.primary }]}>Aprovar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#dc3545' + '20' }]}
                    onPress={() => handleReject(item)}
                    disabled={updateKyc.isPending}
                  >
                    <Ionicons name="close-circle" size={20} color="#dc3545" />
                    <Text style={[styles.actionBtnText, { color: '#dc3545' }]}>Rejeitar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
          </>
        )}
      </ScrollView>
      <Toast message={toast} onHide={() => setToast(null)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  empty: { fontSize: 15, textAlign: 'center', marginTop: spacing.xl },
  humanDecisionHint: { fontSize: 13, textAlign: 'center', marginBottom: spacing.md, fontStyle: 'italic' },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardRow: { marginBottom: spacing.sm },
  name: { fontSize: 16, fontWeight: '600' },
  email: { fontSize: 13, marginTop: 2 },
  phone: { fontSize: 13, marginTop: 2 },
  date: { fontSize: 12, marginTop: 4 },
  thumbRow: { flexDirection: 'row', gap: spacing.md, marginVertical: spacing.sm },
  thumbWrap: { alignItems: 'center' },
  thumb: { width: 80, height: 100, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.06)' },
  thumbLabel: { fontSize: 11, marginTop: 4 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.sm, borderRadius: 10 },
  actionBtnText: { fontSize: 14, fontWeight: '600' },
  rejectBox: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  rejectInput: { borderWidth: 1, borderRadius: 10, padding: spacing.sm, fontSize: 14, minHeight: 60, textAlignVertical: 'top' },
  rejectActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  rejectBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  rejectBtnText: { fontSize: 14, fontWeight: '600' },
});
