import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { getMyNotifications, markNotificationAsRead } from '../api/me';
import type { InAppNotificationItem } from '../api/me';
import { NotificationBanner } from './NotificationBanner';
import { useTheme } from '../hooks/useTheme';

const AUTO_HIDE_MS = 6000;
const MAX_VISIBLE = 2;

/** Roteia para a tela correspondente ao tipo da notificação (mesma lógica da tela Notificações). */
function routeForNotification(router: ReturnType<typeof useRouter>, n: InAppNotificationItem): void {
  const meta = n.metadata ?? {};
  switch (n.type) {
    case 'SATISFACTION_SURVEY':
      if (meta.adoptionId && meta.role) {
        router.push({ pathname: '/survey', params: { adoptionId: String(meta.adoptionId), role: String(meta.role) } });
      }
      break;
    case 'ADOPTION_CONFIRMED_BY_ADOPET':
      router.push('/(tabs)/my-adoptions');
      break;
    case 'PENDING_ADOPTION_BY_TUTOR':
      router.push('/(tabs)/admin/adoptions');
      break;
    case 'PARTNERSHIP_REQUEST_ONG':
      router.push('/(tabs)/admin/partners');
      break;
    case 'ADOPTION_CONFIRMATION_REQUESTED':
      router.push('/(tabs)/adoption-confirm');
      break;
    case 'NEW_MESSAGE':
    case 'NEW_CONVERSATION':
      if (meta.conversationId) {
        router.push(`/chat/${meta.conversationId}`);
      }
      break;
    case 'PET_PUBLICATION_APPROVED':
    case 'PET_PUBLICATION_REJECTED':
      router.push('/(tabs)/my-pets');
      break;
    case 'KYC_APPROVED':
    case 'KYC_REJECTED':
    case 'KYC_REVOKED':
      router.push('/kyc');
      break;
    case 'KYC_FRAUD_SUSPICIOUS':
      router.push('/(tabs)/admin/pending-kyc');
      break;
    case 'KYC_AUTO_APPROVED':
      router.push({ pathname: '/(tabs)/admin/pending-kyc', params: { tab: 'approved' } });
      break;
    case 'VERIFICATION_APPROVED':
    case 'VERIFICATION_REJECTED':
      if (meta.petId) {
        router.push(`/pet/${meta.petId}`);
      } else {
        router.push('/(tabs)/profile');
      }
      break;
    case 'PET_FAVORITED':
      if (meta.petId) {
        router.push(`/pet/${meta.petId}`);
      }
      break;
    case 'ONG_PET_PENDING_APPROVAL':
      router.push('/partner-my-pets');
      break;
    case 'PARTNERSHIP_PAYMENT_PAST_DUE':
    case 'PARTNERSHIP_ENDED_PAID_TODAY':
      router.push('/partner-subscription');
      break;
    default:
      break;
  }
}

/**
 * Mostra até 2 notificações in-app não lidas no topo da tela. Ao fechar, efeito slide e marca como lida.
 * Se houver mais de 2 não lidas, exibe link "Ver todas mensagens" para a página de notificações.
 */
export function NotificationBannerWrapper() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const userId = useAuthStore((s) => s.user?.id);
  const { data: notifications = [] } = useQuery({
    queryKey: ['me', 'notifications'],
    queryFn: () => getMyNotifications(20, false),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  const unread = useMemo(() => notifications.filter((n) => !n.readAt), [notifications]);
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(() => new Set());
  const toShow = useMemo(
    () => unread.filter((n) => !dismissedIds.has(n.id)).slice(0, MAX_VISIBLE),
    [unread, dismissedIds],
  );
  const hasMore = unread.length > MAX_VISIBLE;

  const handleClose = useCallback(
    (id: string) => {
      setDismissedIds((prev) => new Set(prev).add(id));
      markNotificationAsRead(id).then(() => {
        queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] });
        queryClient.invalidateQueries({ queryKey: ['me', 'notifications-unread-count'] });
      }).catch(() => {});
    },
    [queryClient],
  );

  const handleBannerPress = useCallback(
    (n: InAppNotificationItem) => {
      if (n.type === 'KYC_REVOKED' || n.type === 'KYC_APPROVED' || n.type === 'KYC_REJECTED') {
        queryClient.invalidateQueries({ queryKey: ['me'] });
        queryClient.invalidateQueries({ queryKey: ['me', 'kyc-status'] });
      }
      routeForNotification(router, n);
      handleClose(n.id);
    },
    [router, handleClose, queryClient],
  );

  const goToNotifications = useCallback(() => {
    router.push('/notifications');
  }, [router]);

  if (!userId || toShow.length === 0) return null;

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
      {toShow.map((n) => (
        <NotificationBanner
          key={n.id}
          visible
          title={n.title}
          body={n.body}
          onClose={() => handleClose(n.id)}
          autoHideAfterMs={AUTO_HIDE_MS}
          onPress={() => handleBannerPress(n)}
        />
      ))}
      {hasMore && (
        <TouchableOpacity
          onPress={goToNotifications}
          style={styles.verTodas}
          activeOpacity={0.7}
        >
          <Text style={[styles.verTodasText, { color: colors.primary }]}>Ver todas mensagens</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  verTodas: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  verTodasText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
