import { useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { getMyPartner } from '../api/partner';
import { LoadingLogo } from './LoadingLogo';
import { spacing } from '../theme';

const LogoLight = require('../../assets/brand/logo/logo_horizontal_light.png');
const LogoDark = require('../../assets/brand/logo/logo_dark.png');

/** Menu do rodapé no mesmo padrão das outras páginas do app (tab bar). Início usa /(tabs) para evitar Unmatched Route. */
const MAIN_TABS: { href: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { href: '/(tabs)', label: 'Início', icon: 'home' },
  { href: '/(tabs)/favorites', label: 'Favoritos', icon: 'heart' },
  { href: '/(tabs)/add-pet', label: 'Anunciar', icon: 'add-circle' },
  { href: '/(tabs)/chats', label: 'Conversas', icon: 'chatbubbles' },
  { href: '/(tabs)/profile', label: 'Perfil', icon: 'person' },
];

type PartnerPanelLayoutProps = {
  children: React.ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
};

export function PartnerPanelLayout({ children, showHeader = true, showFooter = true }: PartnerPanelLayoutProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { data: partner, isLoading } = useQuery({
    queryKey: ['me', 'partner'],
    queryFn: getMyPartner,
  });

  if (isLoading && !partner) {
    return (
      <View style={styles.loadingWrap}>
        <LoadingLogo size={120} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.logoWrap}>
          <Image source={isDark ? LogoDark : LogoLight} style={styles.appLogo} resizeMode="contain" />
        </View>
      )}

      <View style={styles.content}>{children}</View>

      {showFooter && (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.tabBarBg ?? colors.surface,
              paddingTop: 6,
              paddingBottom: Math.max(insets.bottom, 8),
              minHeight: 49 + Math.max(insets.bottom, 8),
            },
          ]}
        >
          {MAIN_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.href}
              style={styles.footerItem}
              onPress={() => router.replace(tab.href as any)}
              activeOpacity={0.7}
            >
              <Ionicons name={tab.icon} size={24} color={colors.textSecondary} />
              <Text style={[styles.footerLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.xs,
  },
  appLogo: {
    height: 60,
    width: 225,
  },
  content: { flex: 1, minHeight: 0 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  footerItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  footerLabel: { fontSize: 10, fontWeight: '500', marginTop: 2 },
});
