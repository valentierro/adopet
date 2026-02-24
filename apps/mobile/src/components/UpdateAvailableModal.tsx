import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

type Props = {
  visible: boolean;
  forceUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  onUpdate: () => void;
  onDismiss: () => void;
};

export function UpdateAvailableModal({
  visible,
  forceUpdate,
  currentVersion,
  latestVersion,
  onUpdate,
  onDismiss,
}: Props) {
  const { colors } = useTheme();

  const handleStore = () => {
    Linking.openURL(
      'https://play.google.com/store/apps/details?id=br.com.adopet.app'
    ).catch(() => {});
    onUpdate();
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.box, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {forceUpdate ? 'Atualização obrigatória' : 'Nova versão disponível'}
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            A versão {latestVersion} está disponível. Você está na {currentVersion}.
            {forceUpdate
              ? ' Atualize para continuar usando o app.'
              : ' Atualize para ter a melhor experiência.'}
          </Text>
          <View style={styles.actions}>
            {!forceUpdate && (
              <SecondaryButton
                title="Depois"
                onPress={onDismiss}
                style={styles.btn}
              />
            )}
            <PrimaryButton
              title="Atualizar na loja"
              onPress={handleStore}
              style={styles.btn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  box: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  body: { fontSize: 15, marginBottom: 20, lineHeight: 22 },
  actions: { gap: 10 },
  btn: { marginTop: 4 },
});
