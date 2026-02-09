import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  useWindowDimensions,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton, SecondaryButton } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { setOnboardingSeen } from '../../src/storage/onboarding';
import { spacing } from '../../src/theme';

const SLIDES = [
  {
    key: 'like',
    icon: 'heart' as const,
    title: 'Curtir é favoritar',
    message: 'Deslize para a direita nos pets que você gostar. Eles entram nos favoritos e você pode conversar com o tutor depois.',
  },
  {
    key: 'chat',
    icon: 'chatbubbles' as const,
    title: 'Conversar só com favoritos',
    message: 'Para iniciar uma conversa, o pet precisa estar nos seus favoritos. Assim você só fala com quem tem interesse real.',
  },
  {
    key: 'verify',
    icon: 'checkmark-circle' as const,
    title: 'Verificação opcional',
    message: 'Você e seus pets podem solicitar o selo "Verificado" no perfil. Isso gera mais confiança para quem está adotando.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(i);
  };

  const handleNext = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1 });
    } else {
      finish();
    }
  };

  const finish = async () => {
    await setOnboardingSeen();
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        style={[styles.skip, { top: insets.top + 8 }]}
        onPress={finish}
      >
        <Text style={[styles.skipText, { color: colors.textSecondary }]}>Pular</Text>
      </TouchableOpacity>

      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
              <Ionicons name={item.icon} size={56} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{item.title}</Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>{item.message}</Text>
          </View>
        )}
      />

      <View style={[styles.dots, { paddingBottom: insets.bottom + 24 }]}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === index ? colors.primary : colors.surface },
            ]}
          />
        ))}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton
          title={index === SLIDES.length - 1 ? 'Começar' : 'Próximo'}
          onPress={handleNext}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  skip: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 10,
    padding: spacing.sm,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  slide: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: 80,
    alignItems: 'center',
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footer: {
    paddingHorizontal: spacing.lg,
  },
});
