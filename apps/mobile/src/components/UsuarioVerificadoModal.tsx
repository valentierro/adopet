import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { VerifiedBadge } from './VerifiedBadge';
import { spacing } from '../theme';

const MODAL_TEXT = `O selo "Verificado" indica que a identidade desta pessoa foi conferida pela equipe Adopet (documento e selfie). A verificação ajuda a dar mais segurança no processo de adoção e permite confirmar adoções no app.

O Adopet não garante autenticidade nem sucesso da adoção. O encontro responsável com o tutor continua essencial.`;

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function UsuarioVerificadoModal({ visible, onClose }: Props) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Pressable
          style={[styles.card, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.iconWrap}>
            <VerifiedBadge variant="user" size={80} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Usuário Verificado</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{MODAL_TEXT}</Text>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.btnText}>Entendi</Text>
          </TouchableOpacity>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  title: { fontSize: 20, fontWeight: '700', marginBottom: spacing.md, textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: spacing.xl },
  btn: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: 12, alignSelf: 'stretch', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
