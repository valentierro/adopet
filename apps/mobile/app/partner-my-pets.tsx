import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
  ActionSheetIOS,
  Platform,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  ScreenContainer,
  EmptyState,
  LoadingLogo,
  PageIntro,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  VerifiedBadge,
} from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { useListViewMode } from '../src/hooks/useListViewMode';
import { useResponsiveGridColumns } from '../src/hooks/useResponsiveGridColumns';
import {
  getMyPartner,
  getMyPartnerOngPets,
  getMyPartnerOngPetsPendingCount,
  approveOngPet,
  rejectOngPet,
  deleteOngPet,
  type OngPetItem,
} from '../src/api/partner';
import { getSpeciesLabel } from '../src/utils/petLabels';
import { getMatchScoreColor } from '../src/utils/matchScoreColor';
import { getFriendlyErrorMessage } from '../src/utils/errorMessage';
import { spacing } from '../src/theme';
import { gridLayout } from '../src/theme/grid';

const { gap, padding: gridPadding } = gridLayout;
const gridCellSafety = spacing.md;
const GRID_IMAGE_ASPECT = 1;

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: 'Disponível',
  IN_PROCESS: 'Em processo',
  ADOPTED: 'Adotado',
};

const STATUS_COLOR: Record<string, string> = {
  AVAILABLE: '#0D9488',
  IN_PROCESS: '#D97706',
  ADOPTED: '#57534E',
};

const PUBLICATION_STATUS_LABEL: Record<string, string> = {
  PENDING_ONG_APPROVAL: 'Aguardando aprovação',
  PENDING: 'Pendente (Adopet)',
  APPROVED: 'Publicado',
  REJECTED: 'Rejeitado',
};

const PUBLICATION_STATUS_COLOR: Record<string, string> = {
  PENDING_ONG_APPROVAL: '#D97706',
  PENDING: '#94A3B8',
  APPROVED: '#0D9488',
  REJECTED: '#DC2626',
};

const SPECIES_OPTIONS: { value: 'BOTH' | 'DOG' | 'CAT'; label: string }[] = [
  { value: 'BOTH', label: 'Todos' },
  { value: 'DOG', label: 'Cachorros' },
  { value: 'CAT', label: 'Gatos' },
];

const PUBLICATION_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'PENDING_ONG_APPROVAL', label: 'Pendentes' },
  { value: 'APPROVED', label: 'Publicados' },
  { value: 'REJECTED', label: 'Rejeitados' },
];

const formatPublicationDate = (dateStr: string | undefined) =>
  dateStr ? new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null;

export default function PartnerMyPetsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { colors } = useTheme();
  const numColumns = useResponsiveGridColumns();
  const [speciesFilter, setSpeciesFilter] = useState<'BOTH' | 'DOG' | 'CAT'>('BOTH');
  const [publicationFilter, setPublicationFilter] = useState<string>('');
  const { viewMode, setViewMode } = useListViewMode('partnerMyPetsViewMode', { persist: false });
  const [rejectModalItem, setRejectModalItem] = useState<OngPetItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const gridContentWidth = screenWidth - insets.left - insets.right - 2 * gridPadding;
  const gridCellWidth = gridContentWidth > 0 ? (gridContentWidth - gap * (numColumns - 1) - gridCellSafety) / numColumns : 0;

  const { data: partner, isLoading: loadingPartner } = useQuery({
    queryKey: ['me', 'partner'],
    queryFn: getMyPartner,
  });

  const { data: pendingCount = 0, refetch: refetchPending } = useQuery({
    queryKey: ['me', 'partner', 'ong-pets', 'pending-count'],
    queryFn: getMyPartnerOngPetsPendingCount,
    enabled: !!partner?.isOngAdmin && partner?.type === 'ONG',
  });

  const {
    data,
    isLoading: loadingPets,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['me', 'partner', 'ong-pets', speciesFilter, publicationFilter || 'all'],
    queryFn: ({ pageParam }) =>
      getMyPartnerOngPets({
        cursor: pageParam,
        species: speciesFilter,
        publicationStatus: publicationFilter || undefined,
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!partner?.isOngAdmin && partner?.type === 'ONG',
  });

  const approveMutation = useMutation({
    mutationFn: approveOngPet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'ong-pets'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'ong-pets', 'pending-count'] });
      Alert.alert('Sucesso', 'Anúncio aprovado com sucesso. O pet já aparece no feed.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ petId, reason }: { petId: string; reason: string }) => rejectOngPet(petId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'ong-pets'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'ong-pets', 'pending-count'] });
      setRejectModalItem(null);
      setRejectReason('');
      Alert.alert('Sucesso', 'Anúncio rejeitado. O membro será notificado com o motivo informado.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOngPet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'ong-pets'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'ong-pets', 'pending-count'] });
    },
  });

  useFocusEffect(
    useCallback(() => {
      if (partner?.isOngAdmin) {
        refetch();
        refetchPending();
      }
    }, [partner?.isOngAdmin, refetch, refetchPending]),
  );

  const allPets = data?.pages.flatMap((p) => p.items) ?? [];
  const statusOrder: Record<string, number> = { AVAILABLE: 0, IN_PROCESS: 1, ADOPTED: 2 };
  const pubOrder: Record<string, number> = { PENDING_ONG_APPROVAL: 0, PENDING: 1, APPROVED: 2, REJECTED: 3 };
  const pets = allPets
    .slice()
    .sort(
      (a, b) =>
        (pubOrder[a.publicationStatus ?? ''] ?? 99) - (pubOrder[b.publicationStatus ?? ''] ?? 99) ||
        (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99),
    );

  const handleApprove = (item: OngPetItem) => {
    Alert.alert('Aprovar anúncio', `Publicar o anúncio de ${item.name} no feed?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Aprovar', onPress: () => approveMutation.mutate(item.id, { onError: (e) => Alert.alert('Erro', getFriendlyErrorMessage(e)) }) },
    ]);
  };

  const handleReject = (item: OngPetItem) => {
    setRejectModalItem(item);
    setRejectReason('');
  };

  const handleConfirmReject = () => {
    const reason = rejectReason.trim();
    if (!reason || !rejectModalItem) return;
    rejectMutation.mutate(
      { petId: rejectModalItem.id, reason },
      { onError: (e) => Alert.alert('Erro', getFriendlyErrorMessage(e)) },
    );
  };

  const handleRemove = (item: OngPetItem) => {
    Alert.alert(
      'Remover anúncio',
      `Remover permanentemente o anúncio de ${item.name}? Esta ação não pode ser desfeita e todos os dados relacionados serão excluídos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () =>
            deleteMutation.mutate(item.id, {
              onError: (e) => Alert.alert('Erro', getFriendlyErrorMessage(e)),
            }),
        },
      ],
    );
  };

  const showPetActions = (item: OngPetItem) => {
    const options: string[] = [];
    const handlers: (() => void)[] = [];

    if (item.publicationStatus === 'PENDING_ONG_APPROVAL') {
      options.push('Aprovar');
      handlers.push(() => handleApprove(item));
      options.push('Rejeitar');
      handlers.push(() => handleReject(item));
    }
    options.push('Ver anúncio');
    handlers.push(() => router.push(`/pet/${item.id}`));
    options.push('Ver solicitações');
    handlers.push(() => router.push({ pathname: '/partner-adoption-requests', params: { petId: item.id } }));
    options.push('Remover anúncio');
    handlers.push(() => handleRemove(item));

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...options, 'Cancelar'],
          cancelButtonIndex: options.length,
          destructiveButtonIndex: options.indexOf('Remover anúncio'),
        },
        (i) => {
          if (i < handlers.length) handlers[i]();
        },
      );
    } else {
      Alert.alert(
        item.name,
        undefined,
        [
          ...options.slice(0, -1).map((opt, i) => ({
            text: opt,
            onPress: handlers[i],
          })),
          { text: 'Remover anúncio', onPress: () => handleRemove(item), style: 'destructive' as const },
          { text: 'Cancelar', style: 'cancel' as const },
        ],
      );
    }
  };

  const ViewModeToggle = () => (
    <View style={styles.viewModeRow}>
      <TouchableOpacity
        style={[styles.viewModeBtn, viewMode === 'list' && { backgroundColor: colors.primary }]}
        onPress={() => setViewMode('list')}
      >
        <Ionicons name="list" size={22} color={viewMode === 'list' ? '#fff' : colors.textSecondary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.viewModeBtn, viewMode === 'grid' && { backgroundColor: colors.primary }]}
        onPress={() => setViewMode('grid')}
      >
        <Ionicons name="grid-outline" size={22} color={viewMode === 'grid' ? '#fff' : colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  if (loadingPartner || (!partner && !loadingPartner)) {
    return (
      <ScreenContainer>
        {loadingPartner ? (
          <LoadingLogo size={120} />
        ) : (
          <EmptyState
            title="Nenhuma ONG vinculada"
            message="Sua conta não está vinculada a uma ONG. Acesse o portal do parceiro a partir do perfil ou solicite uma parceria."
            icon={<Ionicons name="business-outline" size={56} color={colors.textSecondary} />}
          />
        )}
      </ScreenContainer>
    );
  }

  if (partner?.type === 'ONG' && !partner?.isOngAdmin) {
    return (
      <ScreenContainer>
        <EmptyState
          title="Acesso restrito"
          message="Apenas o administrador da ONG pode gerenciar os anúncios. Entre em contato com o admin da sua instituição."
          icon={<Ionicons name="lock-closed-outline" size={56} color={colors.textSecondary} />}
        />
      </ScreenContainer>
    );
  }

  if (partner?.type !== 'ONG') {
    return (
      <ScreenContainer>
        <EmptyState
          title="Apenas para ONGs"
          message="Esta página é destinada à administração de anúncios de ONGs."
          icon={<Ionicons name="business-outline" size={56} color={colors.textSecondary} />}
        />
      </ScreenContainer>
    );
  }

  const isLoading = loadingPets && pets.length === 0;
  const FiltersSection = () => (
    <View style={[styles.filtersWrap, { borderBottomColor: colors.surface }]}>
      <View style={styles.headerRow}>
        {pendingCount > 0 && (
          <View style={[styles.pendingBadge, { backgroundColor: '#D97706' }]}>
            <Text style={styles.pendingBadgeText}>{pendingCount} aguardando</Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        <ViewModeToggle />
      </View>
      <PageIntro
        title="Anúncios da ONG"
        subtitle={`Gerencie os anúncios de ${partner?.name ?? 'sua ONG'}. Aprove, rejeite ou remova anúncios feitos por membros.`}
      />
      <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Status de publicação</Text>
      <View style={styles.chipRow}>
        {PUBLICATION_FILTER_OPTIONS.map((opt) => {
          const label =
            opt.value === 'PENDING_ONG_APPROVAL' && pendingCount > 0 ? `Pendentes (${pendingCount})` : opt.label;
          return (
            <TouchableOpacity
              key={opt.value || 'all'}
              style={[styles.chip, { backgroundColor: publicationFilter === opt.value ? colors.primary : colors.surface }]}
              onPress={() => setPublicationFilter(opt.value)}
            >
              <Text style={[styles.chipText, { color: publicationFilter === opt.value ? '#fff' : colors.textPrimary }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Espécie</Text>
      <View style={styles.chipRow}>
        {SPECIES_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, { backgroundColor: speciesFilter === opt.value ? colors.primary : colors.surface }]}
            onPress={() => setSpeciesFilter(opt.value)}
          >
            <Text style={[styles.chipText, { color: speciesFilter === opt.value ? '#fff' : colors.textPrimary }]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <ScreenContainer>
        <FiltersSection />
        <View style={styles.loadingWrap}>
          <LoadingLogo size={160} />
        </View>
      </ScreenContainer>
    );
  }

  const emptyTitle = publicationFilter === 'PENDING_ONG_APPROVAL'
    ? 'Nenhum anúncio pendente'
    : publicationFilter
      ? 'Nenhum anúncio com esse status'
      : 'Nenhum anúncio ainda';
  const emptyMessage =
    publicationFilter || speciesFilter !== 'BOTH'
      ? 'Não há anúncios com os filtros selecionados.'
      : 'Os anúncios criados por você ou pelos membros da ONG aparecerão aqui.';

  if (pets.length === 0 && !isFetchingNextPage) {
    return (
      <ScreenContainer>
        <FiltersSection />
        <EmptyState
          title={emptyTitle}
          message={emptyMessage}
          icon={<Ionicons name="paw-outline" size={56} color={colors.textSecondary} />}
        />
      </ScreenContainer>
    );
  }

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  const renderItem = ({ item }: { item: OngPetItem }) => {
    const pubStatus = item.publicationStatus ?? 'APPROVED';
    const pubColor = PUBLICATION_STATUS_COLOR[pubStatus] ?? colors.textSecondary;

    const cardContent = (
      <>
        <Image
          source={{ uri: item.photos?.[0] ?? 'https://placehold.co/80?text=Pet' }}
          style={viewMode === 'grid' ? [styles.gridThumb, { width: gridCellWidth, height: gridCellWidth / GRID_IMAGE_ASPECT }] : styles.thumb}
          contentFit="cover"
          contentPosition="center"
        />
        <View style={[viewMode === 'grid' ? styles.gridCardInfo : styles.cardBody]}>
          <View style={styles.cardTitleRow}>
            <Text style={[viewMode === 'grid' ? styles.gridCardName : styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.verified && <VerifiedBadge variant="pet" size={viewMode === 'grid' ? 14 : 16} iconBackgroundColor={colors.primary} />}
          </View>
          {item.ownerName && (
            <Text style={[styles.ownerLabel, { color: colors.textSecondary }]}>Por {item.ownerName}</Text>
          )}
          <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
            {getSpeciesLabel(item.species)} • {item.age} anos
          </Text>
          <View style={[styles.publicationBadge, { backgroundColor: pubColor + '25' }]}>
            <Text style={[styles.publicationText, { color: pubColor }]} numberOfLines={1}>
              {PUBLICATION_STATUS_LABEL[pubStatus] ?? pubStatus}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[item.status] ?? colors.background) + '25' }]}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[item.status] ?? colors.textSecondary }]} />
            <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] ?? colors.textSecondary }]}>
              {STATUS_LABEL[item.status] ?? item.status}
            </Text>
          </View>
          {viewMode === 'list' && pubStatus === 'APPROVED' && (
            <TouchableOpacity
              style={[styles.solicitacoesLink, { borderColor: colors.primary + '60', alignSelf: 'flex-start', marginTop: spacing.sm }]}
              onPress={(e) => {
                e.stopPropagation();
                router.push({ pathname: '/partner-adoption-requests', params: { petId: item.id } });
              }}
            >
              <Ionicons name="list-outline" size={14} color={colors.primary} />
              <Text style={[styles.solicitacoesLinkText, { color: colors.primary }]}>Ver solicitações</Text>
            </TouchableOpacity>
          )}
          {viewMode === 'grid' && pubStatus === 'PENDING_ONG_APPROVAL' && (
            <View style={styles.gridActions}>
              <TouchableOpacity
                style={[styles.miniBtn, { backgroundColor: '#0D9488' }]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleApprove(item);
                }}
                disabled={approveMutation.isPending}
              >
                <Ionicons name="checkmark" size={14} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.miniBtn, { backgroundColor: '#DC2626' }]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleReject(item);
                }}
                disabled={rejectMutation.isPending}
              >
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </>
    );

    if (viewMode === 'grid') {
      return (
        <TouchableOpacity
          style={[styles.gridCard, { backgroundColor: colors.surface, marginHorizontal: gap / 2, marginBottom: gap }]}
          onPress={() => showPetActions(item)}
          activeOpacity={0.7}
        >
          {cardContent}
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface }]}
        onPress={() => showPetActions(item)}
        activeOpacity={0.7}
      >
        {cardContent}
        <Text style={[styles.arrow, { color: colors.textSecondary }]}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer scroll={false}>
      <FiltersSection />
      <FlashList
        data={pets}
        keyExtractor={(p) => p.id}
        numColumns={viewMode === 'grid' ? numColumns : 1}
        estimatedItemSize={viewMode === 'grid' ? 200 : 120}
        contentContainerStyle={[styles.list, viewMode === 'grid' && styles.gridList]}
        key={`${viewMode}-${numColumns}`}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        renderItem={renderItem}
      />
      <Modal visible={!!rejectModalItem} transparent animationType="fade">
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
          onPress={() => !rejectMutation.isPending && setRejectModalItem(null)}
        >
          <Pressable style={[styles.rejectModalContent, { backgroundColor: colors.background }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.rejectModalTitle, { color: colors.textPrimary }]}>Rejeitar anúncio</Text>
            <Text style={[styles.rejectModalSubtitle, { color: colors.textSecondary }]}>
              Informe o motivo da rejeição para {rejectModalItem?.ownerName ?? 'o membro'}. O membro será notificado.
            </Text>
            <TextInput
              style={[styles.rejectModalInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Motivo da rejeição (obrigatório)"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
            <View style={styles.rejectModalActions}>
              <SecondaryButton
                title="Cancelar"
                onPress={() => !rejectMutation.isPending && setRejectModalItem(null)}
                style={styles.rejectModalBtn}
              />
              <PrimaryButton
                title={rejectMutation.isPending ? 'Rejeitando...' : 'Rejeitar'}
                onPress={handleConfirmReject}
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                style={styles.rejectModalBtn}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  filtersWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  pendingBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  viewModeRow: { flexDirection: 'row', gap: 4 },
  viewModeBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  filterLabel: { fontSize: 12, fontWeight: '600', marginBottom: spacing.xs, marginTop: spacing.sm },
  chipRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs, flexWrap: 'wrap' },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20 },
  chipText: { fontSize: 14, fontWeight: '500' },
  list: { padding: spacing.lg, paddingBottom: spacing.xl },
  gridList: { paddingHorizontal: gridPadding, gap },
  footerLoader: { padding: spacing.md, alignItems: 'center' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 160 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  thumb: { width: 56, height: 56, borderRadius: 8 },
  cardBody: { flex: 1, marginLeft: spacing.md, minWidth: 0 },
  gridCard: { borderRadius: 12, overflow: 'hidden' },
  gridThumb: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  gridCardInfo: { padding: spacing.xs, paddingBottom: spacing.sm },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardName: { fontSize: 16, fontWeight: '600', flex: 1 },
  gridCardName: { fontSize: 13, fontWeight: '700', flex: 1 },
  ownerLabel: { fontSize: 11, marginTop: 1 },
  cardMeta: { fontSize: 13, marginTop: 2 },
  publicationBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  publicationText: { fontSize: 11, fontWeight: '600' },
  statusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },
  arrow: { fontSize: 24 },
  solicitacoesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  solicitacoesLinkText: { fontSize: 12, fontWeight: '600' },
  gridActions: { flexDirection: 'row', gap: 6, marginTop: 6 },
  miniBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  rejectModalContent: { borderRadius: 16, padding: spacing.lg, width: '100%', maxWidth: 400 },
  rejectModalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.xs },
  rejectModalSubtitle: { fontSize: 14, marginBottom: spacing.md },
  rejectModalInput: { borderWidth: 1, borderRadius: 12, padding: spacing.md, fontSize: 16, minHeight: 100, textAlignVertical: 'top' },
  rejectModalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  rejectModalBtn: { flex: 1 },
});
