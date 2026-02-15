import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer, PrimaryButton, SecondaryButton } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { fetchFeed } from '../../src/api/feed';
import { fetchPublicStats } from '../../src/api/public';
import { spacing } from '../../src/theme';

const LogoLight = require('../../assets/brand/logo/logo_horizontal_light.png');
const LogoDark = require('../../assets/brand/logo/logo_dark.png');

const BENEFITS = [
  {
    icon: 'eye' as const,
    title: 'Mais visibilidade para seus pets',
    description: 'Seus anúncios ganham destaque no feed e o selo de parceiro, alcançando mais pessoas em busca de adoção.',
  },
  {
    icon: 'business' as const,
    title: 'Sua marca na página de parceiros',
    description: 'Sua instituição ganha destaque na página oficial de parceiros do app: logo da marca, nome, cidade, descrição e link para seu site, para que quem busca adoção conheça e reconheça sua organização.',
  },
  {
    icon: 'people' as const,
    title: 'Alcance quem quer adotar',
    description: 'Conecte seus pets a milhares de pessoas que já usam o Adopet para encontrar um novo lar.',
  },
  {
    icon: 'paw' as const,
    title: 'Tudo em um só lugar',
    description: 'Divulgue vários pets, acompanhe o interesse e as conversas pelo app, de forma simples.',
  },
  {
    icon: 'heart' as const,
    title: 'Rede pela adoção responsável',
    description: 'Faça parte de um movimento que valoriza o bem-estar animal e a adoção consciente.',
  },
];

export default function SejaParceiroScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { data: feedData } = useQuery({
    queryKey: ['feed', 'seja-parceiro'],
    queryFn: () => fetchFeed({}),
    staleTime: 5 * 60_000,
  });
  const { data: publicStats } = useQuery({
    queryKey: ['public', 'stats'],
    queryFn: fetchPublicStats,
    staleTime: 10 * 60_000,
  });
  const feedItems = feedData?.items ?? [];
  const feedThumbs = feedItems.slice(0, 5).map((p) => p.photos?.[0]).filter(Boolean) as string[];

  const stats = publicStats
    ? [
        { label: 'Adoções', value: publicStats.totalAdoptions, icon: 'heart' as const },
        { label: 'Usuários', value: publicStats.totalUsers, icon: 'people' as const },
        { label: 'Pets no app', value: publicStats.totalPets, icon: 'paw' as const },
      ]
    : [];
  const maxStat = stats.length ? Math.max(...stats.map((s) => s.value), 1) : 1;

  return (
    <ScreenContainer scroll={false}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(0, insets.top - 48),
            paddingBottom: insets.bottom + spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoWrap}>
          <Image
            source={isDark ? LogoDark : LogoLight}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <LinearGradient
          colors={['#d97706', '#b45309']}
          style={[styles.hero, { paddingTop: spacing.lg }]}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="heart" size={40} color="#fff" />
            </View>
            {feedThumbs.length > 0 ? (
              <View style={styles.feedThumbsRow}>
                {feedThumbs.map((uri, i) => (
                  <Image key={`${uri}-${i}`} source={{ uri }} style={styles.feedThumb} />
                ))}
                {feedItems.length > 5 && (
                  <View style={[styles.feedThumb, styles.feedThumbMore]}>
                    <Text style={styles.feedThumbMoreText}>+{Math.min(feedItems.length - 5, 99)}</Text>
                  </View>
                )}
              </View>
            ) : null}
          </View>
          <Text style={styles.heroTitle}>Seja um parceiro Adopet</Text>
          <Text style={styles.heroSubtitle}>
            Instituições, ONGs, clínicas e negócios: divulgue seus pets e alcance mais pessoas em busca de adoção.
          </Text>
        </LinearGradient>

        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Por que ser parceiro?</Text>
          <Text style={[styles.sectionIntro, { color: colors.textSecondary }]}>
            Parceria pensada para quem cuida de animais e quer aumentar as chances de adoção.
          </Text>

          {BENEFITS.map((item, index) => (
            <View
              key={index}
              style={[styles.benefitCard, { backgroundColor: colors.surface, borderColor: colors.background }]}
            >
              <View style={[styles.benefitIconWrap, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name={item.icon} size={28} color={colors.primary} />
              </View>
              <View style={styles.benefitText}>
                <Text style={[styles.benefitTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.benefitDescription, { color: colors.textSecondary }]}>{item.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {stats.length > 0 && (
          <View style={[styles.metricsSection, { paddingHorizontal: spacing.lg }]}>
            <Text style={[styles.metricsTitle, { color: colors.textPrimary }]}>Adopet em números</Text>
            <Text style={[styles.metricsSubtitle, { color: colors.textSecondary }]}>
              Dados que mostram o impacto da nossa comunidade
            </Text>
            <View style={styles.metricsGrid}>
              {stats.map((item) => (
                <View
                  key={item.label}
                  style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.background }]}
                >
                  <View style={styles.metricHeader}>
                    <View style={[styles.metricIconWrap, { backgroundColor: colors.primary + '18' }]}>
                      <Ionicons name={item.icon} size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                  </View>
                  <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                    {item.value.toLocaleString('pt-BR')}
                  </Text>
                  <View style={[styles.metricBarBg, { backgroundColor: colors.background }]}>
                    <View
                      style={[
                        styles.metricBarFill,
                        {
                          width: `${Math.min(100, (item.value / maxStat) * 100)}%`,
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={[styles.ctaSection, { paddingHorizontal: spacing.lg }]}>
          <View style={[styles.ctaCard, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
            <Text style={[styles.ctaTitle, { color: colors.textPrimary }]}>Pronto para começar?</Text>
            <Text style={[styles.ctaSubtitle, { color: colors.textSecondary }]}>
              Solicite sua parceria preenchendo o formulário ou conheça quem já é parceiro.
            </Text>
            <PrimaryButton
              title="Solicitar parceria"
              onPress={() => router.push('/solicitar-parceria')}
              style={styles.ctaButton}
            />
            <SecondaryButton
              title="Ver parceiros atuais"
              onPress={() => router.push('/partners')}
              style={styles.ctaButtonSecondary}
            />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  logoWrap: {
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  logo: {
    height: 60,
    width: 225,
  },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    marginBottom: spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedThumbsRow: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
    flexWrap: 'wrap',
  },
  feedThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  feedThumbMore: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedThumbMoreText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.95)',
  },
  metricsSection: {
    marginBottom: spacing.xl,
  },
  metricsTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  metricsSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  metricsGrid: {
    gap: spacing.md,
  },
  metricCard: {
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  metricBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  metricBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  sectionIntro: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  benefitCard: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  benefitIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  benefitText: {
    flex: 1,
    minWidth: 0,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  benefitDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  ctaSection: {
    marginTop: spacing.md,
  },
  ctaCard: {
    padding: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  ctaSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  ctaButton: {
    alignSelf: 'flex-start',
  },
  ctaButtonSecondary: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
});
