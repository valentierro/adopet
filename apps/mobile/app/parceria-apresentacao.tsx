import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer, PrimaryButton } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { fetchPublicStats } from '../src/api/public';
import { spacing } from '../src/theme';

const LogoLight = require('../assets/brand/logo/logo_horizontal_light.png');
const LogoDark = require('../assets/brand/logo/logo_dark.png');

const BENEFITS_ONG = [
  { icon: 'heart' as const, title: 'Visibilidade para pets em adoção', description: 'Seus anúncios ganham destaque no feed e o selo de parceiro, alcançando mais pessoas em busca de adoção responsável.' },
  { icon: 'business' as const, title: 'Sua instituição na página de parceiros', description: 'Logo, nome, cidade, descrição e link do site na página oficial de parceiros do app.' },
  { icon: 'people' as const, title: 'Alcance quem quer adotar', description: 'Conecte seus pets a milhares de pessoas que já usam o Adopet para encontrar um novo lar.' },
  { icon: 'paw' as const, title: 'Tudo em um só lugar', description: 'Divulgue vários pets, acompanhe o interesse e as conversas pelo app, de forma simples e gratuita.' },
];

const BENEFITS_COMERCIAL = [
  { icon: 'storefront' as const, title: 'Visibilidade para seu negócio', description: 'Sua clínica, consultório ou loja aparece na página de parceiros do Adopet, com logo e link para seu site.' },
  { icon: 'pricetag' as const, title: 'Cupons de desconto', description: 'Crie ofertas visíveis para milhares de usuários no app e atraia mais clientes.' },
  { icon: 'star' as const, title: 'Planos com destaque', description: 'Selo de parceiro nos anúncios, destaque na lista e no feed conforme o plano escolhido.' },
  { icon: 'phone-portrait' as const, title: 'Portal no app', description: 'Gerencie seu estabelecimento e assinatura direto pelo app, com pagamento seguro.' },
];

/** Plano único por enquanto: R$ 50/mês com todos os benefícios */
const PLANO_UNICO = {
  preco: 'R$ 50',
  periodo: '/mês',
  itens: [
    'Página de parceiros com sua marca e logo',
    'Portal exclusivo no app para gerenciar seu estabelecimento',
    'Cupons de desconto visíveis para os usuários do app',
    'Destaque na lista de parceiros',
    'Selo de parceiro nos anúncios vinculados',
    'Pagamento seguro e cancele quando quiser',
  ],
};

export default function ParceriaApresentacaoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tipo?: string }>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const tipo = params.tipo === 'comercial' ? 'comercial' : 'ong';

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
  const benefits = tipo === 'comercial' ? BENEFITS_COMERCIAL : BENEFITS_ONG;

  return (
    <ScreenContainer scroll={false}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: 4, paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoWrap}>
          <Image source={isDark ? LogoDark : LogoLight} style={styles.logo} resizeMode="contain" />
        </View>
        <LinearGradient colors={['#d97706', '#b45309']} style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconWrap}>
              <Ionicons name={tipo === 'comercial' ? 'storefront' : 'heart'} size={48} color="#fff" />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>
                {tipo === 'comercial' ? 'Parceria para clínicas, veterinários e lojas' : 'Parceria para ONGs e instituições'}
              </Text>
              <Text style={styles.heroSubtitle}>
                {tipo === 'comercial'
                  ? 'Leve sua clínica veterinária, pet shop ou loja para milhares de tutores. Plano único por R$ 50/mês com todos os benefícios: portal no app, cupons de desconto e destaque.'
                  : 'Se sua ONG ou abrigo divulga pets para adoção, faça parte do Adopet. Parceria gratuita: mais visibilidade para seus animais e sua marca.'}
              </Text>
            </View>
          </View>
        </LinearGradient>
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Por que ser parceiro?</Text>
          {benefits.map((item, index) => (
            <View key={index} style={[styles.benefitCard, { backgroundColor: colors.surface, borderColor: colors.background }]}>
              <View style={[styles.benefitIconWrap, { backgroundColor: '#d9770618' }]}>
                <Ionicons name={item.icon} size={28} color="#d97706" />
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
        {tipo === 'comercial' && (
          <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Plano parceiro</Text>
            <Text style={[styles.sectionIntro, { color: colors.textSecondary }]}>
              Um único plano com todos os benefícios. Após o cadastro você paga e já acessa o portal no app.
            </Text>
            <View style={[styles.planCard, { backgroundColor: colors.surface, borderColor: '#d97706', borderWidth: 2 }]}>
              <View style={styles.planHeader}>
                <View style={styles.planPrecoRow}>
                  <Text style={[styles.planPreco, { color: '#d97706' }]}>{PLANO_UNICO.preco}</Text>
                  <Text style={[styles.planPeriodo, { color: colors.textSecondary }]}>{PLANO_UNICO.periodo}</Text>
                </View>
                <Text style={[styles.planDescricao, { color: colors.textSecondary }]}>Todos os benefícios inclusos</Text>
              </View>
              <View style={styles.planItens}>
                {PLANO_UNICO.itens.map((item, i) => (
                  <View key={i} style={styles.planItemRow}>
                    <Ionicons name="checkmark-circle" size={18} color="#d97706" />
                    <Text style={[styles.planItemText, { color: colors.textPrimary }]}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
        <View style={[styles.ctaSection, { paddingHorizontal: spacing.lg }]}>
          <View style={[styles.ctaCard, { backgroundColor: '#d9770618', borderColor: '#d9770640' }]}>
            <Text style={[styles.ctaTitle, { color: colors.textPrimary }]}>
              {tipo === 'comercial' ? 'Pronto para começar?' : 'Quer ser nossa parceira?'}
            </Text>
            <Text style={[styles.ctaSubtitle, { color: colors.textSecondary }]}>
              {tipo === 'comercial'
                ? 'Preencha o formulário de cadastro, escolha seu plano e conclua o pagamento. Em seguida você acessa o portal de parceiros no app.'
                : 'Preencha o formulário com os dados da sua instituição. Nossa equipe entra em contato em até 48h úteis.'}
            </Text>
            <PrimaryButton
              title={tipo === 'comercial' ? 'Realizar cadastro' : 'Solicitar parceria'}
              onPress={() => router.push(`/solicitar-parceria?tipo=${tipo}`)}
              style={styles.ctaButtonFull}
            />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  logoWrap: { alignItems: 'center', paddingTop: 0, paddingBottom: spacing.sm, paddingHorizontal: spacing.md },
  logo: { height: 52, width: 195 },
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
