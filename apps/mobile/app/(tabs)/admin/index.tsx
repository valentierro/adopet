import { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../../src/components';
import { useTheme } from '../../../src/hooks/useTheme';
import { getAdminStats } from '../../../src/api/admin';
import { spacing } from '../../../src/theme';

const CARD_GAP = spacing.sm;

const ADMIN_WEB_URL = 'https://admin.appadopet.com.br/';

const ADMIN_GRADIENT: [string, string] = ['#d97706', '#b45309'];

type AdminCard = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: string;
  openUrl?: string;
  badge?: number;
};

export default function AdminHubScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();

  const { data: stats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: getAdminStats,
  });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    }, [queryClient]),
  );

  const openRelatorios = () => {
    Linking.canOpenURL(ADMIN_WEB_URL).then((supported) => {
      if (supported) Linking.openURL(ADMIN_WEB_URL);
      else Alert.alert('Abrir link', 'Não foi possível abrir. Tente acessar pelo navegador: ' + ADMIN_WEB_URL);
    });
  };

  const cards: AdminCard[] = [
    {
      id: 'relatorios',
      title: 'Relatórios',
      subtitle: 'CSV e PDF no portal web',
      icon: 'bar-chart-outline',
      openUrl: ADMIN_WEB_URL,
    },
    {
      id: 'pendingPets',
      title: 'Pets pendentes',
      subtitle: 'Anúncios para aprovar',
      icon: 'images-outline',
      route: '/admin/pending-pets',
      badge: stats?.pendingPetsCount ?? 0,
    },
    {
      id: 'reports',
      title: 'Denúncias',
      subtitle: 'Abertas e resolvidas',
      icon: 'flag-outline',
      route: '/admin/reports',
      badge: stats?.pendingReportsCount ?? 0,
    },
    {
      id: 'adoptions',
      title: 'Adoções',
      subtitle: 'Pendentes de confirmação',
      icon: 'heart-outline',
      route: '/admin/adoptions',
      badge: (stats?.pendingAdoptionsByTutorCount ?? 0) + (stats?.adoptionsPendingAdopetConfirmationCount ?? 0),
    },
    {
      id: 'verifications',
      title: 'Verificações',
      subtitle: 'Usuário e pet',
      icon: 'shield-checkmark-outline',
      route: '/admin/verifications',
      badge: stats?.pendingVerificationsCount ?? 0,
    },
    {
      id: 'pendingKyc',
      title: 'KYC pendentes',
      subtitle: 'Verificação de identidade',
      icon: 'person-circle-outline',
      route: '/admin/pending-kyc',
      badge: stats?.pendingKycCount ?? 0,
    },
    {
      id: 'users',
      title: 'Usuários',
      subtitle: 'Buscar e gerenciar usuários',
      icon: 'people-outline',
      route: '/admin/users',
    },
    {
      id: 'partners',
      title: 'Parceiros',
      subtitle: 'ONGs e parceiros comerciais',
      icon: 'business-outline',
      route: '/admin/partners',
    },
    {
      id: 'bugReports',
      title: 'Bug reports',
      subtitle: 'Sugestões e problemas reportados',
      icon: 'bug-outline',
      route: '/admin/bug-reports',
    },
    {
      id: 'featureFlags',
      title: 'Feature flags',
      subtitle: 'Ativar/desativar funcionalidades',
      icon: 'options-outline',
      route: '/admin/feature-flags',
    },
    {
      id: 'satisfaction',
      title: 'Pesquisa de satisfação',
      subtitle: 'Respostas pós-adoção',
      icon: 'stats-chart-outline',
      route: '/admin/satisfaction',
    },
    {
      id: 'topTutorsPf',
      title: 'Top tutores PF',
      subtitle: 'Tutores com mais adoções (PF)',
      icon: 'trophy-outline',
      route: '/admin/top-tutors-pf',
    },
  ];

  return (
    <ScreenContainer>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, styles.contentFullWidth, { paddingHorizontal: spacing.lg }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          Escolha uma opção abaixo. Cada card abre uma página dedicada.
        </Text>

        <View style={[styles.cardsGrid, { gap: CARD_GAP }]}>
          {cards.map((card) => {
            const hasBadge = card.badge != null && card.badge > 0;
            const onPress = card.openUrl
              ? openRelatorios
              : () => card.route && router.push(card.route as any);

            return (
              <Pressable
                key={card.id}
                style={({ pressed }) => [styles.cardWrap, { opacity: pressed ? 0.88 : 1 }]}
                onPress={onPress}
              >
                <LinearGradient
                  colors={ADMIN_GRADIENT}
                  style={styles.card}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.cardTop}>
                      <View style={[styles.partnersCardIconWrap, styles.iconWrapLight]}>
                        <Ionicons name={card.icon} size={22} color="#fff" />
                      </View>
                      {hasBadge ? (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{card.badge! > 99 ? '99+' : card.badge}</Text>
                        </View>
                      ) : (
                        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.95)" />
                      )}
                    </View>
                    <View style={styles.partnersCardText}>
                      <Text style={[styles.cardTitle, { color: '#fff' }]} numberOfLines={2}>
                        {card.title}
                      </Text>
                      <Text style={[styles.cardSubtitle, { color: 'rgba(255,255,255,0.9)' }]} numberOfLines={2}>
                        {card.subtitle}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: spacing.xl * 2 },
  contentFullWidth: { width: '100%' },
  intro: { fontSize: 14, marginBottom: spacing.lg },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    justifyContent: 'space-between',
  },
  cardWrap: {
    width: '48%',
    marginBottom: CARD_GAP,
  },
  card: {
    borderRadius: 14,
    minHeight: 100,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    shadowOpacity: 0.06,
    elevation: 3,
  },
  cardContent: {
    flex: 1,
    padding: spacing.sm,
    justifyContent: 'space-between',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  partnersCardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapLight: { backgroundColor: 'rgba(255,255,255,0.25)' },
  partnersCardText: { flex: 1, minWidth: 0, justifyContent: 'center' },
  cardTitle: { fontSize: 13, fontWeight: '800' },
  cardSubtitle: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
