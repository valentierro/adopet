import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, TouchableOpacity, StyleSheet, RefreshControl, useWindowDimensions, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, EmptyState, LoadingLogo, PageIntro, StatusBadge, VerifiedBadge } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useListViewMode } from '../../src/hooks/useListViewMode';
import { useResponsiveGridColumns } from '../../src/hooks/useResponsiveGridColumns';
import { getMyAdoptions, type MyAdoptionItem } from '../../src/api/me';
import { getMatchScoreColor } from '../../src/utils/matchScoreColor';
import { getSpeciesLabel } from '../../src/utils/petLabels';
import { spacing } from '../../src/theme';
import { gridLayout } from '../../src/theme/grid';

const { gap, padding: gridPadding, aspectRatio } = gridLayout;
const NUM_COLUMNS = 2;
const gridScreenPadding = spacing.sm;
const gridCellSafety = spacing.md;

const SPECIES_OPTIONS: { value: 'BOTH' | 'DOG' | 'CAT'; label: string }[] = [
  { value: 'BOTH', label: 'Todos' },
  { value: 'DOG', label: 'Cachorros' },
  { value: 'CAT', label: 'Gatos' },
];

type TabRole = 'ADOPTER' | 'TUTOR';

export default function MyAdoptionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { colors } = useTheme();
  const numColumns = useResponsiveGridColumns();
  const [tabRole, setTabRole] = useState<TabRole>('ADOPTER');
  const [speciesFilter, setSpeciesFilter] = useState<'BOTH' | 'DOG' | 'CAT'>('BOTH');
  const { viewMode, setViewMode } = useListViewMode('myAdoptionsViewMode', { persist: false });

  const gridContentWidth = screenWidth - insets.left - insets.right - 2 * gridScreenPadding;
  const gridCellWidth = gridContentWidth > 0 ? (gridContentWidth - gap * (numColumns - 1) - gridCellSafety) / numColumns : 0;
  const gridPaddingHorizontal = useMemo(
    () => ({ paddingHorizontal: gridScreenPadding + (insets.left + insets.right) / 2 }),
    [insets.left, insets.right],
  );

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['me', 'adoptions', speciesFilter, tabRole],
    queryFn: () => getMyAdoptions({ species: speciesFilter, role: tabRole }),
    staleTime: 0,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const items: MyAdoptionItem[] = data?.items ?? [];
  const hasFilters = speciesFilter !== 'BOTH';

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

  if (isLoading && items.length === 0) {
    return (
      <ScreenContainer>
        <View style={[styles.filtersWrap, { borderBottomColor: colors.surface }]}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }} />
            <ViewModeToggle />
          </View>
          <PageIntro title="Minhas adoções" subtitle={tabRole === 'ADOPTER' ? 'Pets que você adotou.' : 'Anúncios seus que viraram adoção.'} />
          <View style={[styles.tabRow, { borderBottomColor: colors.surface }]}>
            <TouchableOpacity
              style={[styles.tab, tabRole === 'ADOPTER' && styles.tabActive, tabRole === 'ADOPTER' && { borderBottomColor: colors.primary }]}
              onPress={() => setTabRole('ADOPTER')}
            >
              <Text style={[styles.tabText, { color: tabRole === 'ADOPTER' ? colors.primary : colors.textSecondary }]}>Pets que adotei</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tabRole === 'TUTOR' && styles.tabActive, tabRole === 'TUTOR' && { borderBottomColor: colors.primary }]}
              onPress={() => setTabRole('TUTOR')}
            >
              <Text style={[styles.tabText, { color: tabRole === 'TUTOR' ? colors.primary : colors.textSecondary }]}>Anúncios adotados</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Espécie</Text>
          <View style={styles.chipRow}>
            {SPECIES_OPTIONS.map((opt) => (
              <TouchableOpacity key={opt.value} style={[styles.chip, { backgroundColor: colors.surface }]}>
                <Text style={[styles.chipText, { color: colors.textSecondary }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.loadingWrap}>
          <LoadingLogo size={160} />
        </View>
      </ScreenContainer>
    );
  }

  const emptyTitle = items.length === 0
    ? (hasFilters ? 'Nenhuma adoção com esse filtro' : 'Nenhuma adoção')
    : '';
  const emptyMessage = items.length === 0
    ? (hasFilters
        ? 'Tente alterar o filtro de espécie.'
        : tabRole === 'ADOPTER'
          ? 'Os pets que você adotar por aqui aparecerão aqui.'
          : 'Quando seus anúncios forem adotados, eles aparecerão aqui.')
    : '';

  if (items.length === 0) {
    return (
      <ScreenContainer>
        <View style={[styles.filtersWrap, { borderBottomColor: colors.surface }]}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }} />
            <ViewModeToggle />
          </View>
          <PageIntro title="Minhas adoções" subtitle={tabRole === 'ADOPTER' ? 'Pets que você adotou.' : 'Anúncios seus que viraram adoção.'} />
          <View style={[styles.tabRow, { borderBottomColor: colors.surface }]}>
            <TouchableOpacity
              style={[styles.tab, tabRole === 'ADOPTER' && styles.tabActive, tabRole === 'ADOPTER' && { borderBottomColor: colors.primary }]}
              onPress={() => setTabRole('ADOPTER')}
            >
              <Text style={[styles.tabText, { color: tabRole === 'ADOPTER' ? colors.primary : colors.textSecondary }]}>Pets que adotei</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tabRole === 'TUTOR' && styles.tabActive, tabRole === 'TUTOR' && { borderBottomColor: colors.primary }]}
              onPress={() => setTabRole('TUTOR')}
            >
              <Text style={[styles.tabText, { color: tabRole === 'TUTOR' ? colors.primary : colors.textSecondary }]}>Anúncios adotados</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Espécie</Text>
          <View style={styles.chipRow}>
            {SPECIES_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.chip,
                  { backgroundColor: speciesFilter === opt.value ? colors.primary : colors.surface },
                ]}
                onPress={() => setSpeciesFilter(opt.value)}
              >
                <Text style={[styles.chipText, { color: speciesFilter === opt.value ? '#fff' : colors.textPrimary }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <EmptyState
          title={emptyTitle}
          message={emptyMessage}
          icon={<Ionicons name="heart-circle-outline" size={56} color={colors.textSecondary} />}
        />
        {!hasFilters && (
          <View style={styles.emptyCtaWrap}>
            <Text style={[styles.emptyMotivational, { color: colors.textSecondary }]}>
              Cada adoção muda uma vida. Que tal dar o primeiro passo?
            </Text>
            <TouchableOpacity
              style={[styles.emptyCta, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(tabs)/feed')}
              activeOpacity={0.8}
            >
              <Ionicons name="paw" size={20} color="#fff" />
              <Text style={styles.emptyCtaText}>Venha achar seu melhor amigo</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScreenContainer>
    );
  }

  const adoptedDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <ScreenContainer scroll={false}>
      <View style={[styles.filtersWrap, { borderBottomColor: colors.surface }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }} />
          <ViewModeToggle />
        </View>
        <PageIntro title="Minhas adoções" subtitle={tabRole === 'ADOPTER' ? 'Pets que você adotou.' : 'Anúncios seus que viraram adoção.'} />
        <View style={[styles.tabRow, { borderBottomColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.tab, tabRole === 'ADOPTER' && styles.tabActive, tabRole === 'ADOPTER' && { borderBottomColor: colors.primary }]}
            onPress={() => setTabRole('ADOPTER')}
          >
            <Text style={[styles.tabText, { color: tabRole === 'ADOPTER' ? colors.primary : colors.textSecondary }]}>Pets que adotei</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tabRole === 'TUTOR' && styles.tabActive, tabRole === 'TUTOR' && { borderBottomColor: colors.primary }]}
            onPress={() => setTabRole('TUTOR')}
          >
            <Text style={[styles.tabText, { color: tabRole === 'TUTOR' ? colors.primary : colors.textSecondary }]}>Anúncios adotados</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.filterHeaderRow}>
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Espécie</Text>
        </View>
        <View style={styles.chipRow}>
          {SPECIES_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.chip,
                { backgroundColor: speciesFilter === opt.value ? colors.primary : colors.surface },
              ]}
              onPress={() => setSpeciesFilter(opt.value)}
            >
              <Text style={[styles.chipText, { color: speciesFilter === opt.value ? '#fff' : colors.textPrimary }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {viewMode === 'grid' ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.adoptionId}
          numColumns={numColumns}
          key={`grid-${numColumns}`}
          style={styles.gridList}
          contentContainerStyle={[styles.gridListContent, gridPaddingHorizontal]}
          columnWrapperStyle={styles.gridRow}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.gridCard, { backgroundColor: colors.surface, width: gridCellWidth }]}
              onPress={() => router.push(`/pet/${item.petId}`)}
              activeOpacity={0.7}
            >
              <Image
                source={{ uri: item.photos?.[0] ?? 'https://placehold.co/80?text=Pet' }}
                style={[styles.gridThumb, { width: gridCellWidth, height: gridCellWidth / aspectRatio }]}
                contentFit="cover"
              />
              <View style={styles.gridCardInfo}>
                <View style={styles.gridCardTitleRow}>
                  <Text style={[styles.gridCardName, { color: colors.textPrimary }]} numberOfLines={1}>{item.petName}</Text>
                  {item.verified && <VerifiedBadge size={14} iconBackgroundColor={colors.primary} />}
                </View>
                <View style={styles.gridBadgesRow}>
                  {typeof item.matchScore === 'number' && (
                    <View style={[styles.gridMatchBadge, { backgroundColor: getMatchScoreColor(item.matchScore) + 'e6' }]}>
                      <Ionicons name="speedometer-outline" size={10} color="#fff" />
                      <Text style={styles.gridMatchBadgeText}>{item.matchScore}%</Text>
                    </View>
                  )}
                  {item.partner != null && (
                    <View style={[styles.gridPartnerBadge, { backgroundColor: item.partner?.isPaidPartner ? (colors.warning || '#d97706') + '30' : (colors.primary + '25') }]}>
                      <Ionicons name={item.partner?.isPaidPartner ? 'star' : 'heart'} size={9} color={item.partner?.isPaidPartner ? (colors.warning || '#d97706') : colors.primary} />
                      <Text style={[styles.gridPartnerBadgeText, { color: item.partner?.isPaidPartner ? (colors.warning || '#d97706') : colors.primary }]} numberOfLines={1}>
                        {item.partner?.isPaidPartner ? 'Patrocinado' : 'Parceiro'}
                      </Text>
                    </View>
                  )}
                  {item.vaccinated !== undefined && (
                    <StatusBadge label={item.vaccinated ? 'Vacinado' : 'Não vacinado'} variant={item.vaccinated ? 'success' : 'warning'} />
                  )}
                  {typeof item.neutered === 'boolean' && (
                    <StatusBadge label={item.neutered ? 'Castrado' : 'Não castrado'} variant={item.neutered ? 'success' : 'warning'} />
                  )}
                  {item.adoptionRejectedAt ? (
                    <View style={[styles.gridStatusBadge, { backgroundColor: (colors.error || '#DC2626') + '25' }]}>
                      <Text style={[styles.gridStatusText, { color: colors.error || '#DC2626' }]} numberOfLines={1}>Rejeitado</Text>
                    </View>
                  ) : item.confirmedByAdopet ? (
                    <View style={[styles.gridStatusBadge, { backgroundColor: '#0D9488' + '25' }]}>
                      <Text style={[styles.gridStatusText, { color: '#0D9488' }]} numberOfLines={1}>Confirmado</Text>
                    </View>
                  ) : (
                    <View style={[styles.gridStatusBadge, { backgroundColor: (colors.textSecondary || '#78716c') + '20' }]}>
                      <Text style={[styles.gridStatusText, { color: colors.textSecondary || '#78716c' }]} numberOfLines={1}>Aguardando</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.gridCardMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                  {tabRole === 'ADOPTER' ? `Ex-tutor: ${item.tutorName}` : `Adotante: ${item.adopterName ?? '—'}`}
                </Text>
                <Text style={[styles.gridAdoptedAt, { color: colors.primary }]}>
                  {adoptedDate(item.adoptedAt)}
                </Text>
                {item.surveySubmitted && item.surveyOverallScore != null ? (
                  <View style={styles.surveyRow}>
                    <Ionicons name="star" size={12} color={colors.warning || '#eab308'} />
                    <Text style={[styles.surveyScoreText, { color: colors.textSecondary }]}>Sua avaliação: {item.surveyOverallScore}/5</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.avaliarBtn, { borderColor: colors.primary }]}
                    onPress={(e) => { e.stopPropagation(); router.push({ pathname: '/survey', params: { adoptionId: item.adoptionId, role: tabRole } }); }}
                  >
                    <Ionicons name="stats-chart-outline" size={12} color={colors.primary} />
                    <Text style={[styles.avaliarBtnText, { color: colors.primary }]}>Avaliar processo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item) => item.adoptionId}
          numColumns={1}
          estimatedItemSize={100}
          key="list"
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.surface }]}
              onPress={() => router.push(`/pet/${item.petId}`)}
              activeOpacity={0.7}
            >
              <Image
                source={{ uri: item.photos?.[0] ?? 'https://placehold.co/80?text=Pet' }}
                style={styles.thumb}
              />
              <View style={styles.cardBody}>
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>{item.petName}</Text>
                  {item.verified && <VerifiedBadge size={16} iconBackgroundColor={colors.primary} />}
                </View>
                <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                  {getSpeciesLabel(item.species)}
                </Text>
                <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                  {tabRole === 'ADOPTER' ? `Ex-tutor: ${item.tutorName}` : `Adotante: ${item.adopterName ?? '—'}`}
                </Text>
                {(item.matchScore != null || item.partner != null || item.vaccinated !== undefined || typeof item.neutered === 'boolean') && (
                  <View style={styles.badgesRow}>
                    {typeof item.matchScore === 'number' && (
                      <View style={[styles.listMatchBadge, { backgroundColor: getMatchScoreColor(item.matchScore) + 'e6' }]}>
                        <Ionicons name="speedometer-outline" size={12} color="#fff" />
                        <Text style={styles.listMatchBadgeText}>{item.matchScore}%</Text>
                      </View>
                    )}
                    {item.partner != null && (
                      <View style={[styles.partnerBadge, { backgroundColor: item.partner?.isPaidPartner ? (colors.warning || '#d97706') + '30' : (colors.primary + '25') }]}>
                        <Ionicons name={item.partner?.isPaidPartner ? 'star' : 'heart'} size={10} color={item.partner?.isPaidPartner ? (colors.warning || '#d97706') : colors.primary} />
                        <Text style={[styles.partnerBadgeText, { color: item.partner?.isPaidPartner ? (colors.warning || '#d97706') : colors.primary }]}>
                          {item.partner?.isPaidPartner ? 'Patrocinado' : 'Parceiro'}
                        </Text>
                      </View>
                    )}
                    {item.vaccinated !== undefined && (
                      <StatusBadge label={item.vaccinated ? 'Vacinado' : 'Não vacinado'} variant={item.vaccinated ? 'success' : 'warning'} />
                    )}
                    {typeof item.neutered === 'boolean' && (
                      <StatusBadge label={item.neutered ? 'Castrado' : 'Não castrado'} variant={item.neutered ? 'success' : 'warning'} />
                    )}
                  </View>
                )}
                {item.adoptionRejectedAt ? (
                  <View style={[styles.badge, { backgroundColor: (colors.error || '#DC2626') + '25', marginTop: 8 }]}>
                    <Text style={[styles.badgeText, { color: colors.error || '#DC2626' }]}>Rejeitado pelo Adopet</Text>
                  </View>
                ) : item.confirmedByAdopet ? (
                  <View style={[styles.badge, { backgroundColor: '#0D9488' + '25', marginTop: 8 }]}>
                    <Text style={[styles.badgeText, { color: '#0D9488' }]}>Confirmado pelo Adopet</Text>
                  </View>
                ) : (
                  <View style={[styles.badge, { backgroundColor: (colors.textSecondary || '#78716c') + '20', marginTop: 8 }]}>
                    <Text style={[styles.badgeText, { color: colors.textSecondary || '#78716c' }]}>Aguardando confirmação Adopet</Text>
                  </View>
                )}
                <Text style={[styles.adoptedAt, { color: colors.primary }]}>
                  {tabRole === 'ADOPTER' ? 'Adotado' : 'Adoção'} em {adoptedDate(item.adoptedAt)}
                </Text>
                {item.surveySubmitted && item.surveyOverallScore != null ? (
                  <View style={styles.surveyRow}>
                    <Ionicons name="star" size={14} color={colors.warning || '#eab308'} />
                    <Text style={[styles.surveyScoreText, { color: colors.textSecondary }]}>Sua avaliação: {item.surveyOverallScore}/5</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.avaliarBtn, { borderColor: colors.primary, marginTop: 6 }]}
                    onPress={() => router.push({ pathname: '/survey', params: { adoptionId: item.adoptionId, role: tabRole } })}
                  >
                    <Ionicons name="stats-chart-outline" size={14} color={colors.primary} />
                    <Text style={[styles.avaliarBtnText, { color: colors.primary }]}>Avaliar processo</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={[styles.arrow, { color: colors.textSecondary }]}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}
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
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  chipText: { fontSize: 14, fontWeight: '500' },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {},
  tabText: { fontSize: 14, fontWeight: '600' },
  surveyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  surveyScoreText: { fontSize: 12, fontWeight: '600' },
  avaliarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  avaliarBtnText: { fontSize: 12, fontWeight: '600' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 160 },
  list: { padding: spacing.lg, paddingBottom: spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  thumb: { width: 56, height: 56, borderRadius: 8 },
  cardBody: { flex: 1, marginLeft: spacing.md, minWidth: 0 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardName: { fontSize: 16, fontWeight: '600', flex: 1 },
  cardMeta: { fontSize: 13, marginTop: 2 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  listMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },
  listMatchBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  partnerBadgeText: { fontSize: 10, fontWeight: '600' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  adoptedAt: { fontSize: 13, marginTop: 4, fontWeight: '600' },
  arrow: { fontSize: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  filterHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  viewModeRow: { flexDirection: 'row', gap: 4 },
  viewModeBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  gridList: { paddingBottom: spacing.xl, gap },
  gridListContent: { paddingBottom: spacing.xl, paddingTop: spacing.xs, flexGrow: 1 },
  gridRow: { gap, marginBottom: gap },
  gridCard: { borderRadius: 12, overflow: 'hidden' },
  gridThumb: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  gridCardInfo: { padding: spacing.sm },
  gridCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gridCardName: { fontSize: 14, fontWeight: '700', flex: 1 },
  gridBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  gridMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
  },
  gridMatchBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  gridPartnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  gridPartnerBadgeText: { fontSize: 9, fontWeight: '600' },
  gridStatusBadge: { paddingHorizontal: 4, paddingVertical: 2, borderRadius: 6 },
  gridStatusText: { fontSize: 9, fontWeight: '600' },
  gridCardMeta: { fontSize: 12, marginTop: 2 },
  gridAdoptedAt: { fontSize: 12, marginTop: 4, fontWeight: '600' },
  emptyCtaWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  emptyMotivational: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontStyle: 'italic',
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
  },
  emptyCtaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
