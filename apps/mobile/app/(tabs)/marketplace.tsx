import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
  Alert,
  TextInput,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer, EmptyState, LoadingLogo, PageIntro, MarketplaceGridSkeleton } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useResponsiveGridColumns } from '../../src/hooks/useResponsiveGridColumns';
import { getMarketplaceItems, type MarketplaceItem, recordPartnerCouponCopy } from '../../src/api/partners';
import { spacing } from '../../src/theme';

type Category = 'all' | 'services' | 'discounts' | 'CLINIC' | 'STORE' | 'ONG';

const CATEGORIES: { value: Category; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'all', label: 'Todos', icon: 'apps' },
  { value: 'services', label: 'Serviços', icon: 'construct' },
  { value: 'discounts', label: 'Descontos', icon: 'pricetag' },
  { value: 'CLINIC', label: 'Clínicas', icon: 'medical' },
  { value: 'STORE', label: 'Lojas', icon: 'storefront' },
  { value: 'ONG', label: 'ONGs', icon: 'heart' },
];

const SEARCH_DEBOUNCE_MS = 400;
const GRID_PAGE_SIZE = 20;
const GRID_GAP = spacing.sm;
const GRID_PADDING = spacing.lg;
const GRID_PADDING_LEFT = spacing.xs;
const GRID_PADDING_RIGHT = spacing.lg;
const HORIZONTAL_CARD_WIDTH = 160;
const HORIZONTAL_CARD_GAP = spacing.sm;

type SortOption = 'name' | 'discount' | 'partner';
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name', label: 'Nome' },
  { value: 'discount', label: 'Desconto' },
  { value: 'partner', label: 'Parceiro' },
];

function partnerTypeLabel(type: string): string {
  switch (type?.toUpperCase()) {
    case 'CLINIC':
      return 'Clínica';
    case 'STORE':
      return 'Loja';
    case 'ONG':
      return 'ONG';
    default:
      return type || 'Parceiro';
  }
}

/** Grid com infinite scroll: só montado para categorias Serviços/Descontos (evita erro em Clínicas/Lojas/ONGs). */
function MarketplaceInfiniteGrid({
  filter,
  searchQuery,
  sortBy,
  paddingLeft,
  paddingRight,
  cardWidth,
  numColumns,
  colors,
  router,
}: {
  filter: 'services' | 'discounts';
  searchQuery: string;
  sortBy: SortOption | undefined;
  paddingLeft: number;
  paddingRight: number;
  cardWidth: number;
  numColumns: number;
  colors: { textPrimary: string; textSecondary: string; primary: string; surface: string };
  router: ReturnType<typeof useRouter>;
}) {
  const infiniteGrid = useInfiniteQuery({
    queryKey: ['marketplace', 'infinite', filter, searchQuery, sortBy ?? ''],
    queryFn: async ({ pageParam = 0 }) => getMarketplaceItems(filter, searchQuery || undefined, undefined, { limit: GRID_PAGE_SIZE, offset: pageParam, sort: sortBy }),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || typeof lastPage.total !== 'number') return undefined;
      const pages = Array.isArray(allPages) ? allPages : [];
      const loaded = pages.reduce((sum, p) => sum + (Array.isArray(p?.items) ? p.items.length : 0), 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    initialPageParam: 0,
    staleTime: 2 * 60_000,
  });
  const gridItems = (infiniteGrid.data?.pages ?? []).flatMap((p) => (Array.isArray(p?.items) ? p.items : []));

  if (infiniteGrid.isLoading && gridItems.length === 0) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.skeletonWrap, { paddingLeft, paddingRight }]} showsVerticalScrollIndicator={false}>
        <MarketplaceGridSkeleton cardWidth={cardWidth} gap={GRID_GAP} />
      </ScrollView>
    );
  }
  if (gridItems.length === 0) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.emptyScrollContent} showsVerticalScrollIndicator={false}>
        <EmptyState
          title={searchQuery ? 'Nenhum resultado' : 'Nada nesta categoria'}
          message={searchQuery ? 'Tente outro termo ou limpe a busca.' : 'Tente "Todos" ou outra categoria.'}
          icon={<Ionicons name="pricetag-outline" size={48} color={colors.textSecondary} />}
        />
      </ScrollView>
    );
  }
  return (
    <FlatList
      data={gridItems}
      keyExtractor={(item, index) => (item && item.id ? `${item.kind ?? 'item'}-${item.id}` : `row-${index}`)}
      numColumns={numColumns}
      key={`grid-${numColumns}`}
      columnWrapperStyle={styles.gridRow}
      contentContainerStyle={[styles.gridContent, { paddingLeft, paddingRight }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={infiniteGrid.isRefetching} onRefresh={() => infiniteGrid.refetch()} tintColor={colors.primary} />
      }
      onEndReached={infiniteGrid.hasNextPage ? () => infiniteGrid.fetchNextPage() : undefined}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        infiniteGrid.isFetchingNextPage ? (
          <View style={styles.footerLoader}>
            <LoadingLogo size={48} />
          </View>
        ) : null
      }
      renderItem={({ item }) => {
        if (!item || !item.partner) return null;
        return (
          <View style={[styles.gridCell, { width: cardWidth }]}>
            {item.kind === 'service' ? (
              <ServiceGridCard
                item={item as MarketplaceItem & { kind: 'service' }}
                colors={colors}
                cardWidth={cardWidth}
                onPress={() => router.push(`/partners/${item.partner.id}?highlightServiceId=${item.id}`)}
              />
            ) : (
              <CouponGridCard
                item={item as MarketplaceItem & { kind: 'coupon' }}
                colors={colors}
                cardWidth={cardWidth}
                onPress={() => router.push(`/partners/${item.partner.id}?highlightCouponId=${item.id}`)}
              />
            )}
          </View>
        );
      }}
    />
  );
}

export default function MarketplaceScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const numColumns = useResponsiveGridColumns();
  const [category, setCategory] = useState<Category>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption | undefined>(undefined);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      searchDebounceRef.current = null;
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput]);

  const filter = category === 'all' ? 'services' : category === 'services' || category === 'discounts' ? category : 'services';
  const partnerType = category === 'CLINIC' || category === 'STORE' || category === 'ONG' ? category : undefined;
  const showGrid = category !== 'all';
  const isPartnerTypeFilter = !!partnerType;

  const { data: servicesData, isLoading: loadingServices, refetch: refetchServicesAll, isRefetching: isRefetchingServicesAll } = useQuery({
    queryKey: ['marketplace', 'services', searchQuery],
    queryFn: () => getMarketplaceItems('services', searchQuery || undefined, undefined, { limit: 100 }),
    staleTime: 2 * 60_000,
    enabled: category === 'all',
  });
  const services = servicesData?.items ?? [];

  const { data: discountsData, isLoading: loadingDiscounts, refetch: refetchDiscountsAll, isRefetching: isRefetchingDiscountsAll } = useQuery({
    queryKey: ['marketplace', 'discounts', searchQuery],
    queryFn: () => getMarketplaceItems('discounts', searchQuery || undefined, undefined, { limit: 100 }),
    staleTime: 2 * 60_000,
    enabled: category === 'all',
  });
  const discounts = discountsData?.items ?? [];

  const refetchAll = () => {
    refetchServicesAll();
    refetchDiscountsAll();
  };
  const isRefetchingAll = isRefetchingServicesAll || isRefetchingDiscountsAll;

  const { data: servicesByTypeData, isLoading: loadingServicesByType, refetch: refetchServicesByType, isRefetching: isRefetchingServicesByType } = useQuery({
    queryKey: ['marketplace', 'services', searchQuery ?? '', partnerType ?? '', sortBy ?? ''],
    queryFn: () => getMarketplaceItems('services', searchQuery || undefined, partnerType, { limit: 100, sort: sortBy }),
    staleTime: 2 * 60_000,
    enabled: showGrid && isPartnerTypeFilter,
  });
  const servicesByType = Array.isArray(servicesByTypeData?.items) ? servicesByTypeData.items : [];

  const { data: discountsByTypeData, isLoading: loadingDiscountsByType, refetch: refetchDiscountsByType, isRefetching: isRefetchingDiscountsByType } = useQuery({
    queryKey: ['marketplace', 'discounts', searchQuery ?? '', partnerType ?? '', sortBy ?? ''],
    queryFn: () => getMarketplaceItems('discounts', searchQuery || undefined, partnerType, { limit: 100, sort: sortBy }),
    staleTime: 2 * 60_000,
    enabled: showGrid && isPartnerTypeFilter,
  });
  const discountsByType = Array.isArray(discountsByTypeData?.items) ? discountsByTypeData.items : [];

  const gridItemsByType = [...servicesByType, ...discountsByType];
  const loadingGridByType = loadingServicesByType || loadingDiscountsByType;
  const refetchByType = () => {
    refetchServicesByType();
    refetchDiscountsByType();
  };
  const isRefetchingByType = isRefetchingServicesByType || isRefetchingDiscountsByType;

  const paddingLeft = insets.left + GRID_PADDING_LEFT;
  const paddingRight = insets.right + GRID_PADDING_RIGHT;
  const contentWidth = screenWidth - paddingLeft - paddingRight;
  const cardWidth = Math.floor((contentWidth - GRID_GAP * (numColumns - 1)) / numColumns);

  const showAllView = category === 'all';
  const isLoadingAll = showAllView && (loadingServices || loadingDiscounts);
  const hasDiscounts = discounts.length > 0;
  const hasServices = services.length > 0;

  return (
    <ScreenContainer scroll={false}>
      <PageIntro
        title="Para seu pet"
        subtitle="Serviços e descontos dos nossos parceiros."
      />
      <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.textSecondary + '30', marginLeft: paddingLeft, marginRight: paddingRight }]}>
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Buscar serviços, descontos ou parceiros..."
          placeholderTextColor={colors.textSecondary}
          value={searchInput}
          onChangeText={setSearchInput}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      <View style={[styles.categoriesWrap, { paddingLeft, paddingRight }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.value}
              style={[styles.categoryPill, { backgroundColor: category === c.value ? colors.primary : colors.surface, borderColor: colors.textSecondary + '25' }]}
              onPress={() => setCategory(c.value)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Categoria ${c.label}. ${category === c.value ? 'Selecionado' : ''}`}
              accessibilityState={{ selected: category === c.value }}
            >
              <Ionicons name={c.icon} size={20} color={category === c.value ? '#fff' : colors.textSecondary} />
              <Text style={[styles.categoryPillText, { color: category === c.value ? '#fff' : colors.textPrimary }]} numberOfLines={1}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {showGrid && (
        <View style={[styles.sortRow, { paddingLeft, paddingRight, borderBottomColor: colors.textSecondary + '15' }]}>
          <Text style={[styles.sortLabel, { color: colors.textSecondary }]}>Ordenar:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortChips}>
            <TouchableOpacity
              style={[styles.sortChip, { backgroundColor: sortBy == null ? colors.primary + '22' : colors.surface, borderColor: colors.textSecondary + '25' }]}
              onPress={() => setSortBy(undefined)}
              accessibilityRole="button"
              accessibilityLabel="Ordenação aleatória"
            >
              <Text style={[styles.sortChipText, { color: sortBy == null ? colors.primary : colors.textSecondary }]}>Aleatório</Text>
            </TouchableOpacity>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.sortChip, { backgroundColor: sortBy === opt.value ? colors.primary + '22' : colors.surface, borderColor: colors.textSecondary + '25' }]}
                onPress={() => setSortBy(opt.value)}
                accessibilityRole="button"
                accessibilityLabel={`Ordenar por ${opt.label}`}
                accessibilityState={{ selected: sortBy === opt.value }}
              >
                <Text style={[styles.sortChipText, { color: sortBy === opt.value ? colors.primary : colors.textSecondary }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {showAllView ? (
        isLoadingAll && !hasDiscounts && !hasServices ? (
          <View style={styles.loadingWrap}>
            <LoadingLogo size={120} />
          </View>
        ) : !hasDiscounts && !hasServices ? (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.emptyScrollContent} showsVerticalScrollIndicator={false}>
            <EmptyState
              title={searchQuery ? 'Nenhum resultado' : 'Nada por aqui'}
              message={searchQuery ? 'Tente outro termo ou escolha outra categoria.' : 'Nenhuma oferta no momento.'}
              icon={<Ionicons name="pricetag-outline" size={48} color={colors.textSecondary} />}
            />
            {searchQuery ? (
              <TouchableOpacity style={[styles.clearSearchBtn, { backgroundColor: colors.primary + '20', marginTop: spacing.lg }]} onPress={() => setSearchInput('')} activeOpacity={0.8}>
                <Ionicons name="backspace-outline" size={18} color={colors.primary} />
                <Text style={[styles.clearSearchText, { color: colors.primary }]}>Limpar busca</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetchingAll} onRefresh={refetchAll} tintColor={colors.primary} />
            }
          >
            {hasDiscounts && (
              <View style={[styles.section, { paddingLeft, paddingRight }]}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Cupons para você{discounts.length > 0 ? ` (${discounts.length})` : ''}</Text>
                  <TouchableOpacity onPress={() => setCategory('discounts')} hitSlop={12} style={styles.verMaisWrap}>
                    <Text style={[styles.verMais, { color: colors.primary }]}>Ver mais</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[styles.horizontalList, { paddingRight: paddingRight }]}
                >
                  {(discounts as (MarketplaceItem & { kind: 'coupon' })[]).map((item) => (
                    <View key={item.id} style={[styles.horizontalCardWrap, { width: HORIZONTAL_CARD_WIDTH, marginRight: HORIZONTAL_CARD_GAP }]}>
                      <CouponGridCard
                        item={item}
                        colors={colors}
                        cardWidth={HORIZONTAL_CARD_WIDTH - spacing.sm * 2}
                        onPress={() => router.push(`/partners/${item.partner.id}?highlightCouponId=${item.id}`)}
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
            {hasServices && (
              <View style={[styles.section, { paddingLeft, paddingRight }]}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Serviços em destaque{services.length > 0 ? ` (${services.length})` : ''}</Text>
                  <TouchableOpacity onPress={() => setCategory('services')} hitSlop={12} style={styles.verMaisWrap}>
                    <Text style={[styles.verMais, { color: colors.primary }]}>Ver mais</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[styles.horizontalList, { paddingRight: paddingRight }]}
                >
                  {(services as (MarketplaceItem & { kind: 'service' })[]).map((item) => (
                    <View key={item.id} style={[styles.horizontalCardWrap, { width: HORIZONTAL_CARD_WIDTH, marginRight: HORIZONTAL_CARD_GAP }]}>
                      <ServiceGridCard
                        item={item}
                        colors={colors}
                        cardWidth={HORIZONTAL_CARD_WIDTH - spacing.sm * 2}
                        onPress={() => router.push(`/partners/${item.partner.id}?highlightServiceId=${item.id}`)}
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </ScrollView>
        )
      ) : isPartnerTypeFilter ? (
        loadingGridByType && gridItemsByType.length === 0 ? (
          <ScrollView style={styles.scroll} contentContainerStyle={[styles.skeletonWrap, { paddingLeft, paddingRight }]} showsVerticalScrollIndicator={false}>
            <MarketplaceGridSkeleton cardWidth={cardWidth} gap={GRID_GAP} />
          </ScrollView>
        ) : gridItemsByType.length === 0 ? (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.emptyScrollContent} showsVerticalScrollIndicator={false}>
            <EmptyState
              title={searchQuery ? 'Nenhum resultado' : 'Nada nesta categoria'}
              message={searchQuery ? 'Tente outro termo ou limpe a busca. Você também pode ver "Todos".' : 'Tente "Todos" ou outra categoria.'}
              icon={<Ionicons name="pricetag-outline" size={48} color={colors.textSecondary} />}
            />
            {searchQuery ? (
              <TouchableOpacity style={[styles.clearSearchBtn, { backgroundColor: colors.primary + '20', marginTop: spacing.lg }]} onPress={() => setSearchInput('')} activeOpacity={0.8}>
                <Ionicons name="backspace-outline" size={18} color={colors.primary} />
                <Text style={[styles.clearSearchText, { color: colors.primary }]}>Limpar busca</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.clearSearchBtn, { backgroundColor: colors.primary + '20', marginTop: spacing.lg }]} onPress={() => setCategory('all')} activeOpacity={0.8}>
                <Ionicons name="apps" size={18} color={colors.primary} />
                <Text style={[styles.clearSearchText, { color: colors.primary }]}>Ver Todos</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        ) : (
          <FlatList
            data={gridItemsByType}
            keyExtractor={(item, index) => (item && item.id ? `${item.kind ?? 'item'}-${item.id}` : `row-${index}`)}
            numColumns={numColumns}
            key={`grid-${numColumns}`}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={[styles.gridContent, { paddingLeft, paddingRight }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetchingByType} onRefresh={refetchByType} tintColor={colors.primary} />
            }
            renderItem={({ item }) => {
              if (!item || !item.partner) return null;
              return (
                <View style={[styles.gridCell, { width: cardWidth }]}>
                  {item.kind === 'service' ? (
                    <ServiceGridCard
                      item={item as MarketplaceItem & { kind: 'service' }}
                      colors={colors}
                      cardWidth={cardWidth}
                      onPress={() => router.push(`/partners/${item.partner.id}?highlightServiceId=${item.id}`)}
                    />
                  ) : (
                    <CouponGridCard
                      item={item as MarketplaceItem & { kind: 'coupon' }}
                      colors={colors}
                      cardWidth={cardWidth}
                      onPress={() => router.push(`/partners/${item.partner.id}?highlightCouponId=${item.id}`)}
                    />
                  )}
                </View>
              );
            }}
          />
        )
      ) : (
        <MarketplaceInfiniteGrid
          filter={filter}
          searchQuery={searchQuery}
          sortBy={sortBy}
          paddingLeft={paddingLeft}
          paddingRight={paddingRight}
          cardWidth={cardWidth}
          numColumns={numColumns}
          colors={colors}
          router={router}
        />
      )}
    </ScreenContainer>
  );
}

function ServiceGridCard({
  item,
  colors,
  cardWidth,
  onPress,
}: {
  item: MarketplaceItem & { kind: 'service' };
  colors: { textPrimary: string; textSecondary: string; primary: string; surface: string };
  cardWidth: number;
  onPress: () => void;
}) {
  const imgSize = Math.min(cardWidth - spacing.md * 2, 80);
  const a11yLabel = `${item.name}, ${partnerTypeLabel(item.partner.type)}, ${item.partner.name}. ${item.priceDisplay ?? ''}`.trim();
  return (
    <TouchableOpacity
      style={[styles.gridCard, { backgroundColor: colors.surface, borderColor: colors.textSecondary + '20' }]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
    >
      <View style={[styles.gridCardTop, { backgroundColor: colors.textSecondary + '08' }]}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={[styles.gridCardImage, { width: imgSize, height: imgSize }]} resizeMode="cover" />
        ) : (
          <View style={[styles.gridCardImagePlaceholder, { width: imgSize, height: imgSize, backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="construct-outline" size={28} color={colors.primary} />
          </View>
        )}
        <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '22' }]}>
          <Text style={[styles.categoryBadgeText, { color: colors.primary }]}>{partnerTypeLabel(item.partner.type)}</Text>
        </View>
      </View>
      <View style={styles.gridCardBody}>
        <Text style={[styles.gridCardTitle, { color: colors.textPrimary }]} numberOfLines={2}>{item.name}</Text>
        {item.priceDisplay ? (
          <Text style={[styles.gridCardPrice, { color: colors.primary }]} numberOfLines={1}>{item.priceDisplay}</Text>
        ) : null}
        <View style={styles.gridCardPartnerRow}>
          {item.partner.logoUrl ? (
            <Image source={{ uri: item.partner.logoUrl }} style={styles.gridCardPartnerLogo} />
          ) : (
            <View style={[styles.gridCardPartnerLogo, { backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="business" size={12} color={colors.primary} />
            </View>
          )}
          <Text style={[styles.gridCardPartnerName, { color: colors.textSecondary }]} numberOfLines={1}>{item.partner.name}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function CouponGridCard({
  item,
  colors,
  cardWidth,
  onPress,
}: {
  item: MarketplaceItem & { kind: 'coupon' };
  colors: { textPrimary: string; textSecondary: string; primary: string; surface: string };
  cardWidth: number;
  onPress: () => void;
}) {
  const imgSize = Math.min(cardWidth - spacing.md * 2, 80);
  const discountLabel =
    item.discountType === 'PERCENT'
      ? `${item.discountValue}% off`
      : `R$ ${(item.discountValue / 100).toFixed(2).replace('.', ',')}`;

  const copyCode = async (e: { stopPropagation?: () => void }) => {
    e?.stopPropagation?.();
    await Clipboard.setStringAsync(item.code);
    try {
      await recordPartnerCouponCopy(item.partnerId, item.id);
    } catch {}
    Alert.alert('Copiado!', `Código ${item.code} copiado. Use na loja.`);
  };
  const a11yLabel = `Cupom ${item.title || item.code}, ${discountLabel}, ${partnerTypeLabel(item.partner.type)}, ${item.partner.name}. Código ${item.code}.`;
  return (
    <View style={[styles.gridCard, { backgroundColor: colors.surface, borderColor: colors.textSecondary + '20' }]} accessibilityRole="none">
      <TouchableOpacity style={styles.gridCardTouchable} onPress={onPress} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={a11yLabel}>
        <View style={[styles.gridCardTop, { backgroundColor: colors.primary + '0c' }]}>
          {item.partner.logoUrl ? (
            <Image source={{ uri: item.partner.logoUrl }} style={[styles.gridCardImage, styles.couponPartnerLogo, { width: imgSize, height: imgSize }]} resizeMode="contain" />
          ) : (
            <View style={[styles.gridCardImagePlaceholder, { width: imgSize, height: imgSize, backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="pricetag" size={28} color={colors.primary} />
            </View>
          )}
          <View style={[styles.gridCardDiscountBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.gridCardDiscountText}>{discountLabel}</Text>
          </View>
          <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '22' }]}>
            <Text style={[styles.categoryBadgeText, { color: colors.primary }]}>{partnerTypeLabel(item.partner.type)}</Text>
          </View>
        </View>
        <View style={styles.gridCardBody}>
          <Text style={[styles.gridCardTitle, { color: colors.textPrimary }]} numberOfLines={2}>{item.title || item.code}</Text>
          <View style={styles.gridCardPartnerRow}>
            {item.partner.logoUrl ? (
              <Image source={{ uri: item.partner.logoUrl }} style={styles.gridCardPartnerLogo} />
            ) : (
              <View style={[styles.gridCardPartnerLogo, { backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="business" size={12} color={colors.primary} />
              </View>
            )}
            <Text style={[styles.gridCardPartnerName, { color: colors.textSecondary }]} numberOfLines={1}>{item.partner.name}</Text>
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.gridCardCopyBtn, { backgroundColor: colors.primary + '20' }]}
        onPress={copyCode}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Copiar código ${item.code}`}
      >
        <Ionicons name="copy-outline" size={14} color={colors.primary} />
        <Text style={[styles.gridCardCopyBtnText, { color: colors.primary }]} numberOfLines={1}>{item.code}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchIcon: { marginRight: spacing.sm },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 6 },
  categoriesWrap: { marginBottom: spacing.lg },
  categoriesScroll: { flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.lg },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
  },
  categoryPillText: { fontSize: 13, fontWeight: '600', maxWidth: 72 },
  section: { marginBottom: spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm, paddingRight: GRID_PADDING },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  verMaisWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  verMais: { fontSize: 14, fontWeight: '600' },
  clearSearchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, alignSelf: 'center' },
  clearSearchText: { fontSize: 15, fontWeight: '600' },
  horizontalList: { paddingBottom: spacing.sm },
  horizontalCardWrap: {},
  sortRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, marginBottom: spacing.sm, borderBottomWidth: 1 },
  sortLabel: { fontSize: 13, marginRight: spacing.sm },
  sortChips: { flexDirection: 'row', gap: spacing.sm },
  sortChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1 },
  sortChipText: { fontSize: 13, fontWeight: '600' },
  skeletonWrap: { paddingBottom: spacing.xl },
  footerLoader: { paddingVertical: spacing.lg, alignItems: 'center' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  scroll: { flex: 1 },
  emptyScrollContent: { padding: GRID_PADDING, paddingBottom: spacing.xl, flex: 1 },
  gridContent: { paddingBottom: spacing.xl },
  gridRow: { gap: GRID_GAP, marginBottom: GRID_GAP },
  gridCell: {},
  gridCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  gridCardTouchable: { flex: 1 },
  gridCardTop: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    position: 'relative',
  },
  gridCardImage: { borderRadius: 10 },
  couponPartnerLogo: { borderRadius: 10 },
  gridCardImagePlaceholder: { borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  categoryBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  gridCardDiscountBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  gridCardDiscountText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  gridCardBody: { padding: spacing.sm, paddingTop: spacing.xs },
  gridCardTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  gridCardPrice: { fontSize: 12, fontWeight: '600', marginBottom: spacing.xs },
  gridCardPartnerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  gridCardPartnerLogo: { width: 18, height: 18, borderRadius: 9, marginRight: 4 },
  gridCardPartnerName: { fontSize: 11, fontWeight: '600', flex: 1 },
  gridCardCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: 8,
  },
  gridCardCopyBtnText: { fontSize: 11, fontWeight: '600' },
});
