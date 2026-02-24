import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { spacing } from '../theme';

const ORANGE_CTA = '#d97706';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  onLogin: () => void;
  onSignup: () => void;
};

export function GuestWelcomeSheet({ visible, onDismiss, onLogin, onSignup }: Props) {
  const { colors } = useTheme();
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide">
      <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={onDismiss}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.iconWrap}>
            <Ionicons name="heart" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Pronto para começar?</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Entre na sua conta, crie uma nova ou explore os pets sem cadastro. O que preferir.
          </Text>
          <View style={styles.actions}>
            <PrimaryButton title="Entrar" onPress={onLogin} style={styles.btn} />
            <TouchableOpacity
              style={[styles.orangeBtn, { backgroundColor: ORANGE_CTA }]}
              onPress={onSignup}
              activeOpacity={0.85}
            >
              <Text style={styles.orangeBtnText}>Criar conta</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDismiss} style={styles.exploreBtn}>
              <Text style={[styles.exploreBtnText, { color: colors.textPrimary }]}>Explorar sem conta</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.footerHint, { color: colors.textSecondary }]}>
            Você pode criar conta a qualquer momento.
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
    paddingTop: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  iconWrap: { alignItems: 'center', marginBottom: spacing.sm },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 22, marginBottom: spacing.lg, textAlign: 'center' },
  actions: { gap: 12 },
  btn: {},
  orangeBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orangeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  exploreBtn: { paddingVertical: 12, alignItems: 'center' },
  exploreBtnText: { fontSize: 15, fontWeight: '600' },
  footerHint: { fontSize: 13, textAlign: 'center', marginTop: spacing.sm },
});
