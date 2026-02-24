import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Toast, LoadingLogo } from '../../../src/components';
import { useTheme } from '../../../src/hooks/useTheme';
import { getPendingPets, setPetPublication } from '../../../src/api/admin';
import { getFriendlyErrorMessage } from '../../../src/utils/errorMessage';
import { getSpeciesLabel } from '../../../src/utils/petLabels';
import { spacing } from '../../../src/theme';

function getPartnerTypeLabel(type: string | undefined): string {
  if (!type) return '';
  const u = type.toUpperCase();
  if (u === 'ONG') return 'ONG';
  if (u === 'CLINIC') return 'Clínica';
  if (u === 'STORE') return 'Loja';
  return type;
}

export default function AdminPendingPetsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [selectedPetIds, setSelectedPetIds] = useState<Set<string>>(new Set());
  const [batchPublicationStatus, setBatchPublicationStatus] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [pendingPetSpeciesFilter, setPendingPetSpeciesFilter] = useState<'ALL' | 'dog' | 'cat'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { data: pendingPets = [], isLoading: loadingPets, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'pending-pets'],
    queryFn: getPendingPets,
  });

  const setPublicationMutation = useMutation({
    mutationFn: ({ petId, status }: { petId: string; status: 'APPROVED' | 'REJECTED' }) =>
      setPetPublication(petId, status),
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-pets'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      setToastMessage(v.status === 'APPROVED' ? 'Anúncio aprovado.' : 'Anúncio rejeitado.');
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível atualizar.')),
  });

  const togglePetSelection = (id: string) => {
    setSelectedPetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePetPublication = (petId: string, status: 'APPROVED' | 'REJECTED') => {
    Alert.alert(
      status === 'APPROVED' ? 'Aprovar anúncio' : 'Rejeitar anúncio',
      status === 'APPROVED' ? 'Este pet passará a aparecer no feed geral.' : 'Este anúncio não aparecerá no feed.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: status === 'APPROVED' ? 'Aprovar' : 'Rejeitar',
          style: status === 'REJECTED' ? 'destructive' : 'default',
          onPress: () => setPublicationMutation.mutate({ petId, status }),
        },
      ]
    );
  };

  const handleBatchPetPublication = (status: 'APPROVED' | 'REJECTED') => {
    const ids = Array.from(selectedPetIds);
    if (ids.length === 0) return;
    Alert.alert(
      status === 'APPROVED' ? 'Aprovar selecionados' : 'Rejeitar selecionados',
      `Confirmar ${status === 'APPROVED' ? 'aprovação' : 'rejeição'} de ${ids.length} anúncio(s)?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: status === 'APPROVED' ? 'Aprovar todos' : 'Rejeitar todos',
          style: status === 'REJECTED' ? 'destructive' : 'default',
          onPress: async () => {
            setBatchPublicationStatus(status);
            try {
              for (const petId of ids) {
                await setPetPublication(petId, status);
              }
              setSelectedPetIds(new Set());
              queryClient.invalidateQueries({ queryKey: ['admin', 'pending-pets'] });
              queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
              queryClient.invalidateQueries({ queryKey: ['feed'] });
              setToastMessage(
                status === 'APPROVED' ? `${ids.length} anúncio(s) aprovado(s).` : `${ids.length} anúncio(s) rejeitado(s).`
              );
            } catch (e: unknown) {
              Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível atualizar alguns anúncios.'));
            } finally {
              setBatchPublicationStatus(null);
            }
          },
        },
      ]
    );
  };

  const filteredPendingPets =
    pendingPetSpeciesFilter === 'ALL' ? pendingPets : pendingPets.filter((pet) => pet.species === pendingPetSpeciesFilter);

  return (
    <ScreenContainer
      scroll
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
      }
    >
      <View>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Anúncios pendentes ({pendingPets.length})
        </Text>
        <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
          Novos pets só entram no feed após aprovação.
        </Text>
        <View style={[styles.rowWrap, { marginBottom: spacing.sm, flexWrap: 'wrap', gap: spacing.xs }]}>
          {(['ALL', 'dog', 'cat'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.chip,
                {
                  backgroundColor: pendingPetSpeciesFilter === tab ? colors.primary + '30' : colors.surface,
                  borderWidth: 1,
                  borderColor: pendingPetSpeciesFilter === tab ? colors.primary : colors.background,
                },
              ]}
              onPress={() => setPendingPetSpeciesFilter(tab)}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: pendingPetSpeciesFilter === tab ? colors.primary : colors.textSecondary },
                ]}
              >
                {tab === 'ALL' ? 'Todos' : tab === 'dog' ? 'Cachorro' : 'Gato'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {pendingPets.length > 0 && selectedPetIds.size > 0 && (
          <View style={styles.batchBar}>
            <Text style={[styles.batchLabel, { color: colors.textSecondary }]}>
              {selectedPetIds.size} selecionado(s)
            </Text>
            <View style={styles.batchActions}>
              <TouchableOpacity
                style={[styles.batchBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleBatchPetPublication('APPROVED')}
                disabled={batchPublicationStatus !== null || setPublicationMutation.isPending}
              >
                {batchPublicationStatus === 'APPROVED' || setPublicationMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="checkmark-circle" size={16} color="#fff" />
                )}
                <Text style={styles.batchBtnText}>
                  {batchPublicationStatus === 'APPROVED' || setPublicationMutation.isPending
                    ? 'Aprovando...'
                    : 'Aprovar'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.batchBtn, { backgroundColor: colors.error || '#DC2626' }]}
                onPress={() => handleBatchPetPublication('REJECTED')}
                disabled={batchPublicationStatus !== null || setPublicationMutation.isPending}
              >
                {batchPublicationStatus === 'REJECTED' || setPublicationMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="close-circle" size={16} color="#fff" />
                )}
                <Text style={styles.batchBtnText}>
                  {batchPublicationStatus === 'REJECTED' || setPublicationMutation.isPending
                    ? 'Rejeitando...'
                    : 'Rejeitar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {loadingPets ? (
          <View style={styles.sectionLoading}>
            <LoadingLogo size={100} />
          </View>
        ) : filteredPendingPets.length === 0 ? (
          <View style={[styles.emptyBlock, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {pendingPets.length === 0
                ? 'Nenhum anúncio pendente.'
                : pendingPetSpeciesFilter === 'dog'
                  ? 'Nenhum cachorro pendente.'
                  : 'Nenhum gato pendente.'}
            </Text>
          </View>
        ) : (
          filteredPendingPets.map((pet) => (
            <View key={pet.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.background }]}>
              <View style={styles.petRowWrap}>
                {pendingPets.length > 0 && (
                  <TouchableOpacity
                    style={[styles.checkbox, selectedPetIds.has(pet.id) && { backgroundColor: colors.primary }]}
                    onPress={() => togglePetSelection(pet.id)}
                  >
                    {selectedPetIds.has(pet.id) && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.petRow}
                  onPress={() => router.push(`/pet/${pet.id}`)}
                  activeOpacity={0.8}
                >
                  {pet.photos?.[0] ? (
                    <ExpoImage source={{ uri: pet.photos[0] }} style={styles.petThumb} contentFit="cover" />
                  ) : (
                    <View style={[styles.petThumb, styles.petThumbPlaceholder, { backgroundColor: colors.background }]} />
                  )}
                  <View style={styles.petInfo}>
                    <View style={styles.petNameRow}>
                      <Text style={[styles.petName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {pet.name}
                      </Text>
                      <View style={styles.pendingPetBadges}>
                        {pet.partner && (
                          <View
                            style={[
                              styles.partnerBadge,
                              {
                                backgroundColor: (pet.partner as { isPaidPartner?: boolean }).isPaidPartner
                                  ? colors.primary + '25'
                                  : colors.textSecondary + '20',
                              },
                            ]}
                          >
                            <Ionicons
                              name={(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? 'star' : 'heart'}
                              size={12}
                              color={(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? colors.primary : colors.textSecondary}
                            />
                            <Text
                              style={[
                                styles.partnerBadgeText,
                                {
                                  color: (pet.partner as { isPaidPartner?: boolean }).isPaidPartner
                                    ? colors.primary
                                    : colors.textSecondary,
                                },
                              ]}
                            >
                              {(pet.partner as { isPaidPartner?: boolean }).isPaidPartner ? 'Patrocinado' : 'Parceiro'}
                            </Text>
                          </View>
                        )}
                        {pet.hasPendingPartnership && (
                          <View
                            style={[
                              styles.partnerBadge,
                              styles.partnerTypeBadge,
                              { backgroundColor: (colors.warning || '#d97706') + '25' },
                            ]}
                          >
                            <Text style={[styles.partnerBadgeText, { color: colors.warning || '#d97706' }]}>
                              Parceria não confirmada
                            </Text>
                          </View>
                        )}
                        {pet.partner?.type && getPartnerTypeLabel(pet.partner.type) ? (
                          <View
                            style={[
                              styles.partnerBadge,
                              styles.partnerTypeBadge,
                              { backgroundColor: colors.primary + '18' },
                            ]}
                          >
                            <Text style={[styles.partnerBadgeText, { color: colors.primary }]}>
                              {getPartnerTypeLabel(pet.partner.type)}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                      {getSpeciesLabel(pet.species)} • {pet.age} ano(s)
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={styles.linkRow}>
                <TouchableOpacity onPress={() => router.push(`/pet/${pet.id}`)} style={styles.linkBtn}>
                  <Ionicons name="image-outline" size={14} color={colors.primary} />
                  <Text style={[styles.linkText, { color: colors.primary }]}>Ver anúncio</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/tutor-profile', params: { petId: pet.id } })}
                  style={styles.linkBtn}
                >
                  <Ionicons name="person-outline" size={14} color={colors.primary} />
                  <Text style={[styles.linkText, { color: colors.primary }]}>Ver perfil do tutor</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handlePetPublication(pet.id, 'APPROVED')}
                  disabled={setPublicationMutation.isPending}
                >
                  {setPublicationMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  )}
                  <Text style={styles.actionBtnText}>
                    {setPublicationMutation.isPending ? 'Aprovando...' : 'Aprovar'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.error || '#DC2626' }]}
                  onPress={() => handlePetPublication(pet.id, 'REJECTED')}
                  disabled={setPublicationMutation.isPending}
                >
                  {setPublicationMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="close-circle" size={18} color="#fff" />
                  )}
                  <Text style={styles.actionBtnText}>
                    {setPublicationMutation.isPending ? 'Rejeitando...' : 'Rejeitar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.xs },
  sectionSub: { fontSize: 13, marginBottom: spacing.md },
  rowWrap: {},
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  chipText: { fontSize: 14, fontWeight: '600' },
  batchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  batchLabel: { fontSize: 13 },
  batchActions: { flexDirection: 'row', gap: spacing.xs },
  batchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  batchBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  sectionLoading: { paddingVertical: spacing.xl, alignItems: 'center', justifyContent: 'center', minHeight: 120 },
  emptyBlock: { padding: spacing.lg, borderRadius: 12, marginBottom: spacing.sm },
  emptyText: { fontSize: 14 },
  card: { padding: spacing.md, borderRadius: 12, borderWidth: 1, marginBottom: spacing.sm },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.2)',
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petRowWrap: { flexDirection: 'row', alignItems: 'center' },
  petRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  petThumb: { width: 48, height: 48, borderRadius: 8 },
  petThumbPlaceholder: {},
  petInfo: { flex: 1, marginLeft: spacing.sm, minWidth: 0 },
  petNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  petName: { fontSize: 16, fontWeight: '600', flex: 1, minWidth: 0 },
  pendingPetBadges: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  partnerBadgeText: { fontSize: 11, fontWeight: '600' },
  partnerTypeBadge: {},
  linkRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkText: { fontSize: 13, fontWeight: '500' },
  cardMeta: { fontSize: 13 },
  cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
