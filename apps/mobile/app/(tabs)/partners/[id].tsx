import { useEffect, useCallback, useRef, useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Image, ScrollView } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { ScreenContainer, LoadingLogo, PageIntro, Toast } from '../../../src/components';
import { useTheme } from '../../../src/hooks/useTheme';
import { useToastWithDedupe } from '../../../src/hooks/useToastWithDedupe';
import { getPartnerById, getPartnerCouponsPublic, getPartnerServicesPublic, recordPartnerView, recordPartnerCouponCopy, recordPartnerMarketplaceVisit, type PartnerCouponPublic, type PartnerServicePublic } from '../../../src/api/partners';
import { spacing } from '../../../src/theme';

function CouponCard({
  partnerId,
  c,
  colors,
  onCopied,
  highlighted,
}: {
  partnerId: string;
  c: PartnerCouponPublic;
  colors: { textPrimary: string; textSecondary: string; primary: string };
  onCopied?: () => void;
  highlighted?: boolean;
}) {
  const discountLabel = c.discountType === 'PERCENT' ? `${c.discountValue}%` : `R$ ${(c.discountValue / 100).toFixed(2)}`;

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(c.code);
    onCopied?.();
    try {
      await recordPartnerCouponCopy(partnerId, c.id);
    } catch {}
  }, [partnerId, c.id, c.code, onCopied]);

  return (
    <TouchableOpacity
      style={[
        couponCardStyles.card,
        { backgroundColor: colors.primary + '12', borderColor: highlighted ? colors.primary : colors.primary + '30', borderWidth: highlighted ? 2 : 1 },
      ]}
      onPress={handleCopy}
      activeOpacity={0.8}
    >
      <View style={couponCardStyles.header}>
        <Text style={[couponCardStyles.code, { color: colors.primary }]}>{c.code}</Text>
        <View style={couponCardStyles.headerRight}>
          <Text style={[couponCardStyles.discount, { color: colors.primary }]}>{discountLabel} off</Text>
          <View style={[couponCardStyles.copyBadge, { backgroundColor: colors.primary + '25' }]}>
            <Ionicons name="copy-outline" size={14} color={colors.primary} />
            <Text style={[couponCardStyles.copyText, { color: colors.primary }]}>Copiar</Text>
          </View>
        </View>
      </View>
      {(c.title || c.description) && (
        <Text style={[couponCardStyles.desc, { color: colors.textSecondary }]} numberOfLines={2}>
          {c.title || c.description}
        </Text>
      )}
      {c.validUntil && (
        <Text style={[couponCardStyles.valid, { color: colors.textSecondary }]}>
          Válido até {new Date(c.validUntil).toLocaleDateString('pt-BR')}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const couponCardStyles = StyleSheet.create({
  card: { padding: spacing.md, borderRadius: 12, borderWidth: 1, marginBottom: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  code: { fontSize: 16, fontWeight: '700' },
  headerRight: { alignItems: 'flex-end', gap: 4 },
  discount: { fontSize: 14, fontWeight: '700' },
  copyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  copyText: { fontSize: 12, fontWeight: '600' },
  desc: { fontSize: 13, marginTop: 4 },
  valid: { fontSize: 12, marginTop: 4 },
});

const serviceCardStyles = StyleSheet.create({
  card: { padding: spacing.md, borderRadius: 12, borderWidth: 1, marginBottom: spacing.sm },
  cardTop: { flexDirection: 'row', gap: spacing.md },
  cardImage: { width: 80, height: 80, borderRadius: 10 },
  cardBody: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  price: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  desc: { fontSize: 13 },
  valid: { fontSize: 12, marginTop: 4 },
});

export default function PartnerDetailScreen() {
  const { id, fromPet, from: fromParam, highlightServiceId, highlightCouponId } = useLocalSearchParams<{
    id: string;
    fromPet?: string;
    from?: string;
    highlightServiceId?: string;
    highlightCouponId?: string;
  }>();
  const navigation = useNavigation();
  const router = useRouter();
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const servicesSectionY = useRef<number>(0);
  const couponsSectionY = useRef<number>(0);

  useLayoutEffect(() => {
    if (fromPet) {
      const petHref = fromParam === 'map' ? `/pet/${fromPet}?from=map` : `/pet/${fromPet}`;
      navigation.setOptions({
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.replace(petHref)}
            style={{ padding: 8, marginLeft: 4 }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ),
      });
    }
  }, [fromPet, fromParam, navigation, router, colors.textPrimary]);

  const { data: partner, isLoading } = useQuery({
    queryKey: ['partners', id],
    queryFn: () => getPartnerById(id!),
    enabled: !!id,
    staleTime: 5 * 60_000,
  });
  const { data: coupons = [] } = useQuery({
    queryKey: ['partners', id, 'coupons'],
    queryFn: () => getPartnerCouponsPublic(id!),
    enabled: !!id && !!partner,
    staleTime: 2 * 60_000,
  });
  const { data: services = [] } = useQuery({
    queryKey: ['partners', id, 'services'],
    queryFn: () => getPartnerServicesPublic(id!),
    enabled: !!id && !!partner,
    staleTime: 2 * 60_000,
  });
  const { toastMessage, setToastMessage, showToast } = useToastWithDedupe();

  useEffect(() => {
    if (partner?.name) {
      navigation.setOptions({ title: partner.name });
    }
  }, [partner?.name, navigation]);

  const marketplaceVisitRecorded = useRef(false);
  useEffect(() => {
    if (partner?.id) {
      recordPartnerView(partner.id).catch(() => {});
    }
  }, [partner?.id]);

  useEffect(() => {
    if (!partner?.id || marketplaceVisitRecorded.current || (!highlightServiceId && !highlightCouponId)) return;
    marketplaceVisitRecorded.current = true;
    recordPartnerMarketplaceVisit(partner.id, {
      ...(highlightServiceId && { serviceId: highlightServiceId }),
      ...(highlightCouponId && { couponId: highlightCouponId }),
    }).catch(() => {});
  }, [partner?.id, highlightServiceId, highlightCouponId]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const t = setTimeout(() => {
      if (highlightServiceId && services.length > 0) {
        scrollRef.current?.scrollTo({ y: Math.max(0, servicesSectionY.current - 48), animated: true });
      } else if (highlightCouponId && coupons.length > 0) {
        scrollRef.current?.scrollTo({ y: Math.max(0, couponsSectionY.current - 48), animated: true });
      }
    }, 150);
    return () => clearTimeout(t);
  }, [highlightServiceId, highlightCouponId, services.length, coupons.length]);

  const scrollToSection = useCallback((y: number) => {
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 48), animated: true });
  }, []);

  if (isLoading && !partner) {
    return (
      <ScreenContainer>
        <LoadingLogo size={120} />
      </ScreenContainer>
    );
  }

  if (!partner) {
    return (
      <ScreenContainer>
        <PageIntro
          title="Parceiro não encontrado"
          subtitle="O link pode estar incorreto ou o parceiro não está mais disponível."
        />
        <View style={[styles.empty, { backgroundColor: colors.surface }]}>
          <Ionicons name="help-buoy-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Tente voltar e abrir novamente da lista de parceiros.</Text>
        </View>
      </ScreenContainer>
    );
  }

  const openUrl = (url: string) => {
    const href = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(href);
  };

  const openAddressInMaps = () => {
    const query = partner.address
      ? encodeURIComponent(partner.address)
      : encodeURIComponent([partner.name, partner.city].filter(Boolean).join(', '));
    if (!query.trim()) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    Linking.openURL(url);
  };

  const hasLocation = !!(partner.address || partner.city);
  const typeLabel = partner.type === 'ONG' ? 'ONG' : partner.type === 'CLINIC' ? 'Clínica' : 'Loja';

  return (
    <ScreenContainer ref={scrollRef} scroll>
      {/* Hero / Header */}
      <View style={[styles.hero, { backgroundColor: colors.primary + '18' }]}>
        <View style={[styles.heroInner, { backgroundColor: colors.surface }]}>
          {partner.logoUrl ? (
            <View style={[styles.logoWrap, { backgroundColor: colors.background }]}>
              <Image source={{ uri: partner.logoUrl }} style={styles.logo} resizeMode="contain" />
            </View>
          ) : null}
          <View style={styles.nameBadgeRow}>
            <Text style={[styles.name, { color: colors.textPrimary }]}>{partner.name}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.typeBadge, { backgroundColor: colors.primary + '30' }]}>
                <Ionicons name={partner.type === 'ONG' ? 'heart' : partner.type === 'CLINIC' ? 'medkit' : 'storefront'} size={14} color={colors.primary} />
                <Text style={[styles.typeBadgeText, { color: colors.primary }]}>{typeLabel}</Text>
              </View>
              {partner.isPaidPartner ? (
                <View style={[styles.paidBadge, { backgroundColor: colors.primary + '25' }]}>
                  <Ionicons name="star" size={12} color={colors.primary} />
                  <Text style={[styles.paidBadgeText, { color: colors.primary }]}>Destaque</Text>
                </View>
              ) : null}
            </View>
          </View>
          {hasLocation && (
            <TouchableOpacity
              style={[styles.comoChegarBtn, { backgroundColor: colors.primary }]}
              onPress={openAddressInMaps}
              activeOpacity={0.8}
            >
              <Ionicons name="navigate" size={20} color="#fff" />
              <Text style={styles.comoChegarText}>Como chegar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Info card */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {hasLocation ? (
          <TouchableOpacity
            style={styles.addressRow}
            onPress={openAddressInMaps}
            activeOpacity={0.7}
          >
            <View style={[styles.addressIconWrap, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="location" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.addressText, { color: colors.textPrimary }]} numberOfLines={2}>
              {partner.address || partner.city}
            </Text>
            <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}

        {partner.description && !partner.description.startsWith('Solicitação aprovada') ? (
          <Text style={[styles.description, { color: colors.textSecondary }]}>{partner.description}</Text>
        ) : null}

        <View style={styles.contactGrid}>
          {partner.email ? (
            <TouchableOpacity
              style={[styles.contactBtn, { borderColor: colors.primary + '50', backgroundColor: colors.primary + '08' }]}
              onPress={() => Linking.openURL(`mailto:${partner.email}`)}
              activeOpacity={0.7}
            >
              <Ionicons name="mail" size={20} color={colors.primary} />
              <Text style={[styles.contactBtnText, { color: colors.textPrimary }]} numberOfLines={1}>{partner.email}</Text>
            </TouchableOpacity>
          ) : null}
          {partner.phone ? (
            <TouchableOpacity
              style={[styles.contactBtn, { borderColor: colors.primary + '50', backgroundColor: colors.primary + '08' }]}
              onPress={() => Linking.openURL(`tel:${partner.phone}`)}
              activeOpacity={0.7}
            >
              <Ionicons name="call" size={20} color={colors.primary} />
              <Text style={[styles.contactBtnText, { color: colors.textPrimary }]}>{partner.phone}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {partner.website ? (
          <TouchableOpacity
            style={[styles.linkBtn, { borderColor: colors.primary }]}
            onPress={() => openUrl(partner.website!)}
            activeOpacity={0.7}
          >
            <Ionicons name="globe-outline" size={18} color={colors.primary} />
            <Text style={[styles.linkText, { color: colors.primary }]}>Abrir site</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.linkBtn, styles.linkBtnPrimary, { backgroundColor: colors.primary }]}
          onPress={() => router.push({ pathname: '/partner-pets', params: { id: partner.id, partnerName: partner.name } })}
          activeOpacity={0.8}
        >
          <Ionicons name="paw" size={18} color="#fff" />
          <Text style={styles.linkBtnPrimaryText}>Ver anúncios vinculados</Text>
        </TouchableOpacity>
      </View>

      <View
        style={[styles.section, styles.sectionCard, { backgroundColor: colors.surface }]}
        onLayout={(e) => {
          servicesSectionY.current = e.nativeEvent.layout.y;
          if (highlightServiceId && services.length > 0) scrollToSection(e.nativeEvent.layout.y);
        }}
      >
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconWrap, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name={partner.type === 'ONG' ? 'heart' : 'construct'} size={22} color={colors.primary} />
          </View>
          <View style={styles.sectionTitleWrap}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {partner.type === 'ONG' ? 'Serviços prestados pela ONG' : 'Serviços'}
            </Text>
            <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
              {partner.type === 'ONG'
                ? 'Serviços voluntários oferecidos pela ONG (sem cobrança).'
                : 'Oferecidos pelo estabelecimento'}
            </Text>
          </View>
        </View>
        {services.length === 0 ? (
          <Text style={[styles.emptyServicesText, { color: colors.textSecondary }]}>
            {partner.type === 'ONG'
              ? 'A ONG ainda não cadastrou serviços voluntários.'
              : 'Nenhum serviço cadastrado ainda.'}
          </Text>
        ) : (
          services.map((s) => (
            <View
              key={s.id}
              style={[
                serviceCardStyles.card,
                {
                  backgroundColor: colors.primary + '12',
                  borderColor: highlightServiceId === s.id ? colors.primary : colors.primary + '30',
                  borderWidth: highlightServiceId === s.id ? 2 : 1,
                },
              ]}
            >
              <View style={serviceCardStyles.cardTop}>
                {s.imageUrl ? (
                  <Image source={{ uri: s.imageUrl }} style={serviceCardStyles.cardImage} resizeMode="cover" />
                ) : null}
                <View style={serviceCardStyles.cardBody}>
                  <Text style={[serviceCardStyles.name, { color: colors.textPrimary }]}>{s.name}</Text>
                  {partner.type !== 'ONG' && s.priceDisplay ? (
                    <Text style={[serviceCardStyles.price, { color: colors.primary }]}>{s.priceDisplay}</Text>
                  ) : null}
                  {s.description ? <Text style={[serviceCardStyles.desc, { color: colors.textSecondary }]} numberOfLines={2}>{s.description}</Text> : null}
                  {s.validUntil && (
                    <Text style={[serviceCardStyles.valid, { color: colors.textSecondary }]}>Válido até {new Date(s.validUntil).toLocaleDateString('pt-BR')}</Text>
                  )}
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {coupons.length > 0 && (
        <View
          style={[styles.section, styles.sectionCard, { backgroundColor: colors.surface }]}
          onLayout={(e) => {
            couponsSectionY.current = e.nativeEvent.layout.y;
            if (highlightCouponId && coupons.length > 0) scrollToSection(e.nativeEvent.layout.y);
          }}
        >
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="pricetag" size={22} color={colors.primary} />
            </View>
            <View style={styles.sectionTitleWrap}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Cupons de desconto</Text>
              <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>Use no estabelecimento</Text>
            </View>
          </View>
          {coupons.map((c) => (
            <CouponCard
              key={c.id}
              partnerId={partner.id}
              c={c}
              colors={colors}
              onCopied={() => showToast('Cupom copiado!')}
              highlighted={highlightCouponId === c.id}
            />
          ))}
        </View>
      )}

      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  heroInner: {
    padding: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  logoWrap: {
    width: 100,
    height: 100,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  logo: { width: 88, height: 88 },
  nameBadgeRow: { alignItems: 'center', marginBottom: spacing.md },
  name: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: spacing.sm },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  typeBadgeText: { fontSize: 13, fontWeight: '700' },
  paidBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  paidBadgeText: { fontSize: 11, fontWeight: '700' },
  comoChegarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  comoChegarText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  card: {
    margin: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  addressIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressText: { flex: 1, fontSize: 15, fontWeight: '500', lineHeight: 22 },
  description: { fontSize: 15, lineHeight: 22, marginBottom: spacing.lg },
  contactGrid: { gap: spacing.sm, marginBottom: spacing.md },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'stretch',
  },
  contactBtnText: { fontSize: 14, fontWeight: '600', flex: 1 },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  linkBtnPrimary: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    borderWidth: 0,
    marginTop: spacing.sm,
  },
  linkText: { fontSize: 15, fontWeight: '600' },
  linkBtnPrimaryText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  section: { marginTop: spacing.lg, marginBottom: spacing.xl },
  sectionCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md },
  sectionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleWrap: { flex: 1, minWidth: 0 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  sectionSub: { fontSize: 13 },
  emptyServicesText: { fontSize: 15, fontStyle: 'italic', marginTop: spacing.sm },
  empty: {
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, marginTop: spacing.sm, textAlign: 'center' },
});
