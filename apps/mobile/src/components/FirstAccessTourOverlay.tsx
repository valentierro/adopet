import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { setOnboardingSeen } from '../storage/onboarding';
import { spacing } from '../theme';
import { PrimaryButton } from './PrimaryButton';

const TOUR_STEPS: Array<{
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
}> = [
  {
    key: 'welcome',
    icon: 'paw',
    title: 'Bem-vindo ao Adopet!',
    message: 'Este tour vai te mostrar as principais partes do app. Você pode pular a qualquer momento tocando em "Pular tour".',
  },
  {
    key: 'inicio',
    icon: 'home',
    title: 'Início',
    message: 'Na aba "Início" você vê um resumo: preview do feed, seus anúncios, adoções e conversas. É sua tela principal.',
  },
  {
    key: 'feed',
    icon: 'paw',
    title: 'Feed de pets',
    message: 'Aqui você vê os pets disponíveis para adoção. Deslize para a direita para curtir (favoritar) ou para a esquerda para passar. Use o filtro por espécie e o raio no mapa.',
  },
  {
    key: 'favoritos',
    icon: 'heart',
    title: 'Favoritos',
    message: 'Pets que você curtiu ficam na aba "Favoritos" no menu inferior. Toque em um pet para ver detalhes e conversar com o tutor.',
  },
  {
    key: 'anunciar',
    icon: 'add-circle',
    title: 'Meus anúncios',
    message: 'Na aba "Anunciar" você cadastra pets para adoção com fotos e descrição. Os anúncios passam por análise antes de aparecer no feed.',
  },
  {
    key: 'conversas',
    icon: 'chatbubbles',
    title: 'Conversas',
    message: 'Na aba "Conversas" ficam suas mensagens com os tutores dos pets favoritados. Só é possível conversar com o tutor de um pet que está nos seus favoritos.',
  },
  {
    key: 'perfil',
    icon: 'person',
    title: 'Perfil e menu',
    message: 'Na aba "Perfil" você acessa preferências, Meus anúncios, Minhas adoções, verificação e outras opções. O menu inferior tem todas as abas principais.',
  },
];

type Props = {
  visible: boolean;
  userId: string;
  onComplete: () => void;
};

export function FirstAccessTourOverlay({ visible, userId, onComplete }: Props) {
  const { colors } = useTheme();
  const [stepIndex, setStepIndex] = useState(0);
  const [internalVisible, setInternalVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setStepIndex(0);
      setInternalVisible(true);
    }
  }, [visible]);

  const step = TOUR_STEPS[stepIndex];
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      finish();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const finish = async () => {
    setInternalVisible(false);
    if (userId) {
      await setOnboardingSeen(userId);
    }
    onComplete();
  };

  if (!internalVisible || !step) return null;

  return (
    <Modal visible={internalVisible} transparent animationType="fade">
      <Pressable
        style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
        onPress={finish}
      >
        <Pressable
          style={[styles.popup, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name={step.icon} size={40} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{step.title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{step.message}</Text>

          <View style={styles.dots}>
            {TOUR_STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: i === stepIndex ? colors.primary : colors.textSecondary + '50' },
                ]}
              />
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.skipBtn]}
              onPress={finish}
            >
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>Pular tour</Text>
            </TouchableOpacity>
            <PrimaryButton
              title={isLast ? 'Começar' : 'Próximo'}
              onPress={handleNext}
              style={styles.nextBtn}
            />
          </View>
        </Pressable>
      </Pressable>
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
  popup: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: spacing.md,
  },
  skipBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
  },
  nextBtn: {
    flex: 1,
  },
});
