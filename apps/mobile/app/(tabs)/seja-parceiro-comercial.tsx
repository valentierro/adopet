import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer, PrimaryButton } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { fetchPublicStats } from '../../src/api/public';
import { spacing } from '../../src/theme';

const LogoLight = require('../../assets/brand/logo/logo_horizontal_light.png');
const LogoDark = require('../../assets/brand/logo/logo_dark.png');

const BENEFITS_COMERCIAL = [
  { icon: 'storefront' as const, title: 'Visibilidade para seu negócio', description: 'Sua clínica, consultório ou loja aparece na página de parceiros do Adopet, com logo e link para seu site. Alcance tutores que buscam adoção e cuidados.' },
  { icon: 'star' as const, title: 'Planos com destaque no app', description: 'Planos que incluem selo de parceiro nos anúncios vinculados e opção de destaque na lista de parceiros e no feed.' },
  { icon: 'people' as const, title: 'Público engajado', description: 'Milhares de usuários ativos em busca de pets e serviços. Parceria para clínicas veterinárias, pet shops e lojas do segmento.' },
  { icon: 'paw' as const, title: 'Rede pela causa animal', description: 'Associe sua marca à adoção responsável e ao bem-estar animal, reforçando sua imagem perante clientes.' },
];

const PLANOS = [
  { id: 'basico', nome: 'Básico', preco: 'R$ 99', periodo: '/mês', descricao: 'Ideal para começar', itens: ['Página de parceiros com sua marca', 'Selo "Parceiro" nos anúncios vinculados', 'Até 2 usuários da sua equipe'], destaque: false },
  { id: 'destaque', nome: 'Destaque', preco: 'R$ 199', periodo: '/mês', descricao: 'Mais visibilidade', itens: ['Tudo do plano Básico', 'Destaque na lista de parceiros', 'Selo "Patrocinado" no feed', 'Até 5 usuários'], destaque: true },
  { id: 'premium', nome: 'Premium', preco: 'Sob consulta', periodo: '', descricao: 'Solução sob medida', itens: ['Tudo do plano Destaque', 'Posicionamento prioritário', 'Suporte dedicado', 'Usuários ilimitados'], destaque: false },
];

export default function SejaParceiroComercialScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { data: publicStats } = useQuery({
    queryKey: ['public', 'stats'],
    queryFn: fetchPublicStats,
    staleTime: 10 * 60_000,
  });
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
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(0, insets.top - 48), paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoWrap}>
          <Image source={isDark ? LogoDark : LogoLight} style={styles.logo} resizeMode="contain" />
        </View>
        <LinearGradient colors={['#d97706', '#b45309']} style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="storefront" size={48} color="#fff" />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>Parceria para clínicas, veterinários e lojas</Text>
              <Text style={styles.heroSubtitle}>
                Leve sua clínica veterinária, pet shop ou loja do segmento para milhares de tutores. Planos com preços a partir de R$ 99/mês e opção de destaque no app.
              </Text>
            </View>
          </View>
        </LinearGradient>
        {stats.length > 0 && (
          <View style={[styles.metricsSection, { paddingHorizontal: spacing.lg }]}>
            <Text style={[styles.metricsTitle, { color: colors.textPrimary }]}>Adopet em números</Text>
            <View style={styles.metricsGrid}>
              {stats.map((item) => (
                <View key={item.label} style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.background }]}>
                  <View style={[styles.metricIconWrap, { backgroundColor: colors.primary + '18' }]}>
                    <Ionicons name={item.icon} size={20} color={colors.primary} />
                  </View>
                  <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{item.value.toLocaleString('pt-BR')}</Text>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                  <View style={[styles.metricBarBg, { backgroundColor: colors.background }]}>
                    <View style={[styles.metricBarFill, { width: `${Math.min(100, (item.value / maxStat) * 100)}%`, backgroundColor: colors.primary }]} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Por que ser parceiro?</Text>
          {BENEFITS_COMERCIAL.map((item, index) => (
            <View key={index} style={[styles.benefitCard, { backgroundColor: colors.surface, borderColor: colors.background }]}>
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
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Planos de parceria</Text>
          <Text style={[styles.sectionIntro, { color: colors.textSecondary }]}>
            Escolha o plano que melhor se encaixa no seu negócio. Valores podem variar conforme região e pacote.
          </Text>
          {PLANOS.map((plano) => (
            <View
              key={plano.id}
              style={[styles.planCard, { backgroundColor: colors.surface, borderColor: colors.background }, plano.destaque && { borderColor: colors.primary, borderWidth: 2 }]}
            >
              {plano.destaque && (
                <View style={[styles.planBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.planBadgeText}>Recomendado</Text>
                </View>
              )}
              <View style={styles.planHeader}>
                <Text style={[styles.planNome, { color: colors.textPrimary }]}>{plano.nome}</Text>
                <View style={styles.planPrecoRow}>
                  <Text style={[styles.planPreco, { color: colors.primary }]}>{plano.preco}</Text>
                  <Text style={[styles.planPeriodo, { color: colors.textSecondary }]}>{plano.periodo}</Text>
                </View>
                <Text style={[styles.planDescricao, { color: colors.textSecondary }]}>{plano.descricao}</Text>
              </View>
              <View style={styles.planItens}>
                {plano.itens.map((item, i) => (
                  <View key={i} style={styles.planItemRow}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                    <Text style={[styles.planItemText, { color: colors.textPrimary }]}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
        <View style={[styles.ctaSection, { paddingHorizontal: spacing.lg }]}>
          <View style={[styles.ctaCard, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
            <Text style={[styles.ctaTitle, { color: colors.textPrimary }]}>Interessado em um plano?</Text>
            <Text style={[styles.ctaSubtitle, { color: colors.textSecondary }]}>
              Envie sua solicitação pelo formulário. Nossa equipe entra em contato com valores e condições para sua região.
            </Text>
            <PrimaryButton title="Realizar cadastro" onPress={() => router.push('/solicitar-parceria?tipo=comercial')} style={styles.ctaButtonFull} />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  logoWrap: { alignItems: 'center', paddingTop: 0, paddingBottom: spacing.sm, paddingHorizontal: spacing.md },
  logo: { height: 56, width: 210 },
  hero: {
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: 24,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  heroIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTextWrap: { flex: 1, minWidth: 0 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: spacing.sm },
  heroSubtitle: { fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.95)' },
  metricsSection: { marginBottom: spacing.xl },
  metricsTitle: { fontSize: 20, fontWeight: '700', marginBottom: spacing.lg },
  metricsGrid: { gap: spacing.md },
  metricCard: { padding: spacing.md, borderRadius: 16, borderWidth: 1, marginBottom: spacing.md },
  metricIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  metricValue: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  metricLabel: { fontSize: 13, fontWeight: '600', marginBottom: spacing.sm },
  metricBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  metricBarFill: { height: '100%', borderRadius: 3 },
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: spacing.xs },
  sectionIntro: { fontSize: 14, lineHeight: 21, marginBottom: spacing.lg },
  benefitCard: { flexDirection: 'row', padding: spacing.md, borderRadius: 16, borderWidth: 1, marginBottom: spacing.md },
  benefitIconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  benefitText: { flex: 1, minWidth: 0 },
  benefitTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.xs },
  benefitDescription: { fontSize: 14, lineHeight: 20 },
  planCard: { padding: spacing.lg, borderRadius: 16, borderWidth: 1, marginBottom: spacing.md, position: 'relative' },
  planBadge: { position: 'absolute', top: -10, right: spacing.md, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 8 },
  planBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  planHeader: { marginBottom: spacing.md },
  planNome: { fontSize: 18, fontWeight: '700', marginBottom: spacing.xs },
  planPrecoRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  planPreco: { fontSize: 24, fontWeight: '800' },
  planPeriodo: { fontSize: 14 },
  planDescricao: { fontSize: 13, marginTop: 2 },
  planItens: { gap: spacing.xs },
  planItemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  planItemText: { fontSize: 14, flex: 1 },
  ctaSection: { marginTop: spacing.md },
  ctaCard: { padding: spacing.lg, borderRadius: 20, borderWidth: 1 },
  ctaTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  ctaSubtitle: { fontSize: 14, lineHeight: 21, marginBottom: spacing.lg },
  ctaButtonFull: { alignSelf: 'stretch', width: '100%' },
});
