import { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Image } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, LoadingLogo, PageIntro, Toast } from '../../../src/components';
import { useTheme } from '../../../src/hooks/useTheme';
import { getPartnerById, getPartnerCouponsPublic, getPartnerServicesPublic, recordPartnerView, recordPartnerCouponCopy, type PartnerCouponPublic, type PartnerServicePublic } from '../../../src/api/partners';
import { spacing } from '../../../src/theme';

function CouponCard({
  partnerId,
  c,
  colors,
  onCopied,
}: {
  partnerId: string;
  c: PartnerCouponPublic;
  colors: { textPrimary: string; textSecondary: string; primary: string };
  onCopied?: () => void;
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
      style={[couponCardStyles.card, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { colors } = useTheme();
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (partner?.name) {
      navigation.setOptions({ title: partner.name });
    }
  }, [partner?.name, navigation]);

  useEffect(() => {
    if (partner?.id) {
      recordPartnerView(partner.id).catch(() => {});
    }
  }, [partner?.id]);

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

  return (
    <ScreenContainer scroll>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {(partner.logoUrl || hasLocation) ? (
          <View style={styles.logoRow}>
            {partner.logoUrl ? (
              <View style={styles.logoWrap}>
                <Image source={{ uri: partner.logoUrl }} style={styles.logo} resizeMode="contain" />
              </View>
            ) : <View style={styles.logoSpacer} />}
            {hasLocation ? (
              <TouchableOpacity
                style={[styles.comoChegarBtn, { borderColor: colors.primary }]}
                onPress={openAddressInMaps}
                activeOpacity={0.7}
              >
                <Ionicons name="map-outline" size={20} color={colors.primary} />
                <Text style={[styles.comoChegarText, { color: colors.primary }]}>Como chegar</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{partner.name}</Text>
          {partner.isPaidPartner ? (
            <View style={[styles.paidBadge, { backgroundColor: colors.primary + '25' }]}>
              <Ionicons name="star" size={12} color={colors.primary} />
              <Text style={[styles.paidBadgeText, { color: colors.primary }]}>Destaque</Text>
            </View>
          ) : null}
        </View>
        {hasLocation ? (
          <TouchableOpacity
            style={styles.row}
            onPress={openAddressInMaps}
            activeOpacity={0.7}
          >
            <Ionicons name="location-outline" size={18} color={colors.primary} />
            <Text style={[styles.meta, styles.locationText, { color: colors.textPrimary }]} numberOfLines={2}>
              {partner.address || partner.city}
            </Text>
            <Ionicons name="open-outline" size={14} color={colors.textSecondary} style={styles.locationChevron} />
          </TouchableOpacity>
        ) : null}
        {partner.description ? (
          <Text style={[styles.description, { color: colors.textPrimary }]}>{partner.description}</Text>
        ) : null}

        {partner.website ? (
          <TouchableOpacity
            style={[styles.linkBtn, { borderColor: colors.primary }]}
            onPress={() => openUrl(partner.website!)}
          >
            <Ionicons name="open-outline" size={18} color={colors.primary} />
            <Text style={[styles.linkText, { color: colors.primary }]}>Abrir site</Text>
          </TouchableOpacity>
        ) : null}

        {partner.email ? (
          <TouchableOpacity
            style={[styles.linkBtn, { borderColor: colors.primary, marginTop: spacing.sm }]}
            onPress={() => Linking.openURL(`mailto:${partner.email}`)}
          >
            <Ionicons name="mail-outline" size={18} color={colors.primary} />
            <Text style={[styles.linkText, { color: colors.primary }]}>{partner.email}</Text>
          </TouchableOpacity>
        ) : null}

        {partner.phone ? (
          <TouchableOpacity
            style={[styles.linkBtn, { borderColor: colors.primary, marginTop: spacing.sm }]}
            onPress={() => Linking.openURL(`tel:${partner.phone}`)}
          >
            <Ionicons name="call-outline" size={18} color={colors.primary} />
            <Text style={[styles.linkText, { color: colors.primary }]}>{partner.phone}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {services.length > 0 && (
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Serviços</Text>
          <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>Oferecidos pelo estabelecimento</Text>
          {services.map((s) => (
            <View key={s.id} style={[serviceCardStyles.card, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
              <View style={serviceCardStyles.cardTop}>
                {s.imageUrl ? (
                  <Image source={{ uri: s.imageUrl }} style={serviceCardStyles.cardImage} resizeMode="cover" />
                ) : null}
                <View style={serviceCardStyles.cardBody}>
                  <Text style={[serviceCardStyles.name, { color: colors.textPrimary }]}>{s.name}</Text>
                  {s.priceDisplay ? <Text style={[serviceCardStyles.price, { color: colors.primary }]}>{s.priceDisplay}</Text> : null}
                  {s.description ? <Text style={[serviceCardStyles.desc, { color: colors.textSecondary }]} numberOfLines={2}>{s.description}</Text> : null}
                  {s.validUntil && (
                    <Text style={[serviceCardStyles.valid, { color: colors.textSecondary }]}>Válido até {new Date(s.validUntil).toLocaleDateString('pt-BR')}</Text>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {coupons.length > 0 && (
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Cupons de desconto</Text>
          <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>Use no estabelecimento</Text>
          {coupons.map((c) => (
            <CouponCard
              key={c.id}
              partnerId={partner.id}
              c={c}
              colors={colors}
              onCopied={() => setToastMessage('Cupom copiado!')}
            />
          ))}
        </View>
      )}

      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 12,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md, gap: spacing.md },
  logoWrap: {},
  logoSpacer: { width: 96 },
  logo: { width: 96, height: 96, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.06)' },
  comoChegarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
  },
  comoChegarText: { fontSize: 15, fontWeight: '600' },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs },
  name: { fontSize: 22, fontWeight: '700', flex: 1, minWidth: 0 },
  paidBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  paidBadgeText: { fontSize: 11, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md },
  meta: { fontSize: 15, flex: 1 },
  locationText: { fontWeight: '500' },
  locationChevron: { marginLeft: 4 },
  description: { fontSize: 15, lineHeight: 22, marginBottom: spacing.lg },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
  },
  linkText: { fontSize: 15, fontWeight: '600' },
  section: { marginTop: spacing.lg, marginBottom: spacing.xl },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  sectionSub: { fontSize: 13, marginBottom: spacing.md },
  empty: {
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, marginTop: spacing.sm, textAlign: 'center' },
});
