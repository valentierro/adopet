import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { getAdminStats } from '../api/admin';
import { NotificationBanner } from './NotificationBanner';
import { useTheme } from '../hooks/useTheme';

const AUTO_HIDE_MS = 0; // não auto-esconder; admin fecha manualmente ou ao tocar

/**
 * Banner in-app para admin: exibe "Você tem X verificação(ões) KYC pendente(s)" quando há KYC pendente.
 * Ao tocar, navega para a página de KYC pendentes do admin. Pode ser dispensado na sessão.
 */
export function AdminPendingKycBanner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((s) => s.user?.isAdmin === true);
  const [dismissedThisSession, setDismissedThisSession] = useState(false);

  const { data: adminStats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: getAdminStats,
    enabled: isAdmin,
    refetchInterval: 60_000,
  });

  const pendingCount = adminStats?.pendingKycCount ?? 0;
  const show = isAdmin && pendingCount > 0 && !dismissedThisSession;

  const handlePress = useCallback(() => {
    setDismissedThisSession(true);
    queryClient.invalidateQueries({ queryKey: ['admin', 'pending-kyc'] });
    router.push('/(tabs)/admin/pending-kyc');
  }, [router, queryClient]);

  const handleClose = useCallback(() => {
    setDismissedThisSession(true);
  }, []);

  if (!show) return null;

  const label =
    pendingCount === 1
      ? '1 verificação KYC pendente'
      : `${pendingCount} verificações KYC pendentes`;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 8,
          paddingBottom: 8,
        },
      ]}
      pointerEvents="box-none"
    >
      <NotificationBanner
        visible
        title="KYC pendentes"
        body={`Você tem ${label}. Toque para ver.`}
        onClose={handleClose}
        autoHideAfterMs={AUTO_HIDE_MS}
        onPress={handlePress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1001, // acima do NotificationBannerWrapper (1000) para admin ver primeiro
  },
});
