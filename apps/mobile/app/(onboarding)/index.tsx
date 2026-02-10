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
  Image,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { setOnboardingSeen } from '../../src/storage/onboarding';
import { spacing } from '../../src/theme';

const ONBOARDING_IMAGES = {
  feed: require('../../assets/feed.png'),
  favoritos: require('../../assets/favoritos.png'),
  chat: require('../../assets/chat.jpeg'),
  mapa: require('../../assets/mapa.jpeg'),
  meus_anuncios: require('../../assets/meus_anuncios.png'),
  minhas_adocoes: require('../../assets/minhas_adocoes.jpeg'),
  perfil: require('../../assets/perfil.jpeg'),
};

type SlideImageKey = keyof typeof ONBOARDING_IMAGES;

const SLIDES: Array<{
  key: string;
  image?: SlideImageKey;
  icon: 'paw' | 'heart' | 'chatbubbles' | 'map' | 'add-circle' | 'heart-circle' | 'checkmark-circle';
  title: string;
  message: string;
}> = [
  {
    key: 'feed',
    image: 'feed',
    icon: 'paw',
    title: 'Feed de pets',
    message: 'Deslize pelos anúncios de cachorros e gatos disponíveis para adoção. Use os filtros por espécie e raça e ajuste o raio em Preferências.',
  },
  {
    key: 'like',
    image: 'favoritos',
    icon: 'heart',
    title: 'Curtir é favoritar',
    message: 'Deslize para a direita nos pets que gostar. Eles entram nos Favoritos e você pode iniciar uma conversa com o tutor depois.',
  },
  {
    key: 'chat',
    image: 'chat',
    icon: 'chatbubbles',
    title: 'Conversas',
    message: 'Só é possível conversar com o tutor de um pet que está nos seus Favoritos. Toque e segure em uma conversa para apagá-la.',
  },
  {
    key: 'map',
    image: 'mapa',
    icon: 'map',
    title: 'Mapa',
    message: 'Veja no mapa onde estão os pets. Toque em um marcador para ver nome, foto e idade e acessar o perfil. O raio é o mesmo das suas Preferências.',
  },
  {
    key: 'announce',
    image: 'meus_anuncios',
    icon: 'add-circle',
    title: 'Anunciar um pet',
    message: 'Em "Meus anúncios" você pode cadastrar pets para adoção com fotos e descrição. Os anúncios passam por análise antes de aparecer no feed.',
  },
  {
    key: 'adopt',
    image: 'minhas_adocoes',
    icon: 'heart-circle',
    title: 'Minhas adoções',
    message: 'Quando o pet for adotado, marque no anúncio e indique quem adotou (conversa ou @usuário). A equipe Adopet confirma. Em "Minhas adoções" você vê os pets que adotou.',
  },
  {
    key: 'verify',
    image: 'perfil',
    icon: 'checkmark-circle',
    title: 'Verificação',
    message: 'Você e seus pets podem solicitar o selo "Verificado", que gera mais confiança. A verificação é opcional e analisada pela equipe.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
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

  /** Grava "não exibir novamente" sempre que o checkbox estiver marcado, seja ao tocar em "Pular" ou em "Começar". */
  const finish = async () => {
    if (dontShowAgain) {
      await setOnboardingSeen();
    }
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
            <View style={styles.slideContent}>
              {item.image ? (
                <Image source={ONBOARDING_IMAGES[item.image]} style={styles.slideImage} resizeMode="contain" />
              ) : (
                <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
                  <Ionicons name={item.icon} size={56} color={colors.primary} />
                </View>
              )}
              <Text style={[styles.title, { color: colors.textPrimary }]}>{item.title}</Text>
              <Text style={[styles.message, { color: colors.textSecondary }]}>{item.message}</Text>
            </View>
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

      <Pressable
        style={[styles.checkboxRow, { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }]}
        onPress={() => setDontShowAgain((v) => !v)}
      >
        <View style={[styles.checkbox, { borderColor: colors.primary, backgroundColor: dontShowAgain ? colors.primary : 'transparent' }]}>
          {dontShowAgain && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
        <Text style={[styles.checkboxLabel, { color: colors.textSecondary }]}>
          Não exibir novamente ao entrar no app
        </Text>
      </Pressable>

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
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  slideImage: {
    width: 220,
    height: 220,
    maxWidth: '90%',
    borderRadius: 16,
    marginBottom: spacing.lg,
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
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: spacing.lg,
  },
});
