import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  useWindowDimensions,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from './PrimaryButton';
import { spacing } from '../theme';
import type { AnalyticsEvent } from '../analytics';

const ORANGE_CTA = '#d97706';
const ONBOARDING_TEAL = '#2dd4bf';
const ONBOARDING_TEXT = '#ffffff';
const ONBOARDING_TEXT_SEC = 'rgba(255,255,255,0.88)';
const ONBOARDING_OVERLAY = 'rgba(0,20,25,0.65)';
const SHEET_GRADIENT_TOP = 'rgba(20,65,70,0.94)';
const SHEET_GRADIENT_BOTTOM = 'rgba(8,40,48,0.97)';

const LOGO_LIGHT = require('../../assets/brand/logo/logo_horizontal_light.png');

const SLIDES: Array<{
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  showLogo?: boolean;
  title: string;
  message: string;
  type: 'cta' | 'info' | 'location' | 'notifications' | 'kyc';
}> = [
  { key: 'welcome', showLogo: true, icon: 'heart', iconSize: 48, title: 'Bem-vindo ao Adopet', message: 'Conectamos quem quer adotar a pets que precisam de um lar. Adoção voluntária, sem custos e com transparência. Tudo em um só lugar.', type: 'info' },
  { key: 'location', icon: 'location', iconSize: 56, title: 'Pets perto de você', message: 'Com sua localização, mostramos anúncios na sua região. Você pode alterar o raio e os filtros nas preferências quando quiser.', type: 'location' },
  { key: 'how', icon: 'paw', iconSize: 56, title: 'Como funciona', message: 'Descubra pets na sua região no feed e no mapa. Curta os que combinaram e converse com o tutor. Anuncie pets para adoção com fotos e preferências. Tudo com verificação e adoção responsável.', type: 'info' },
  { key: 'notifications', icon: 'notifications', iconSize: 56, title: 'Fique por dentro', message: 'Ative as notificações para receber novidades sobre pets, mensagens dos tutores e lembretes que ajudam na adoção. Você controla quando quer ser avisado.', type: 'notifications' },
  { key: 'kyc', icon: 'shield-checkmark', iconSize: 56, title: 'Verificação de identidade', message: 'Quem anuncia pode solicitar verificação (KYC) para maior segurança. Quem adota também pode se verificar para que o tutor possa confirmar a adoção no app. Tudo voluntário e transparente.', type: 'kyc' },
  { key: 'ready', showLogo: true, icon: 'heart', iconSize: 56, title: 'Pronto para começar?', message: 'Entre na sua conta, crie uma nova ou explore os pets sem cadastro. O que preferir.', type: 'cta' },
];

type Props = {
  visible: boolean;
  onComplete: () => void;
  onLogin: () => void;
  onSignup: () => void;
  onExplore: () => void;
  onTrackEvent: (event: AnalyticsEvent) => void;
  onShowToast: (msg: string) => void;
};

export function OnboardingSlidesSheet({
  visible,
  onComplete,
  onLogin,
  onSignup,
  onExplore,
  onTrackEvent,
  onShowToast,
}: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [locationLoading, setLocationLoading] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  const slide = SLIDES[index];
  const sheetWidth = Math.max(280, Math.min((width || 400) - spacing.lg * 2, 400));
  const paddingBottom = 24 + insets.bottom;
  const dotScales = useRef(SLIDES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    SLIDES.forEach((_, i) => {
      Animated.spring(dotScales[i], {
        toValue: i === index ? 1 : 0,
        useNativeDriver: false,
        friction: 6,
        tension: 120,
      }).start();
    });
  }, [index, dotScales]);

  const isCtaSlide = slide?.type === 'cta';
  const isLocationSlide = slide?.type === 'location';
  const isNotifSlide = slide?.type === 'notifications';

  const goNext = useCallback(() => {
    if (index >= SLIDES.length - 1) {
      onComplete();
    } else {
      setIndex((i) => i + 1);
    }
  }, [index, onComplete]);

  const handleSkip = useCallback(() => {
    onTrackEvent({ name: 'onboarding_skipped', properties: {} });
    onExplore();
  }, [onTrackEvent, onExplore]);

  const handleAllowLocation = useCallback(async () => {
    setLocationLoading(true);
    try {
      await Location.requestForegroundPermissionsAsync();
    } catch {
      // ignore
    }
    setLocationLoading(false);
    goNext();
  }, [goNext]);

  const handleAllowNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const Notifications = await import('expo-notifications');
      const { status: existing } = await Notifications.getPermissionsAsync();
      if (existing !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
    } catch {
      // ignore
    }
    setNotifLoading(false);
    goNext();
  }, [goNext]);

  if (!visible) return null;
  if (!slide) return null;

  const btnStyleTeal = { backgroundColor: ONBOARDING_TEAL };

  const renderActions = () => {
    if (isCtaSlide) {
      return (
        <>
          <PrimaryButton title="Entrar" onPress={onLogin} style={[styles.btn, btnStyleTeal]} />
          <TouchableOpacity style={[styles.orangeBtn, { backgroundColor: ORANGE_CTA }]} onPress={onSignup} activeOpacity={0.85}>
            <Text style={styles.orangeBtnText}>Criar conta</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSkip} style={styles.exploreBtn}>
            <Text style={[styles.exploreBtnText, { color: ONBOARDING_TEXT }]}>Explorar sem conta</Text>
          </TouchableOpacity>
          <Text style={[styles.footerHint, { color: ONBOARDING_TEXT_SEC }]}>Você pode criar conta a qualquer momento.</Text>
        </>
      );
    }
    if (isLocationSlide) {
      return (
        <>
          <PrimaryButton
            title={locationLoading ? '...' : 'Permitir localização'}
            onPress={handleAllowLocation}
            style={[styles.btn, btnStyleTeal]}
            disabled={locationLoading}
          />
          {locationLoading && <ActivityIndicator size="small" color={ONBOARDING_TEAL} style={styles.loader} />}
          <TouchableOpacity onPress={goNext} style={styles.notNow}>
            <Text style={[styles.notNowText, { color: ONBOARDING_TEXT_SEC }]}>Agora não</Text>
          </TouchableOpacity>
        </>
      );
    }
    if (isNotifSlide) {
      return (
        <>
          <PrimaryButton
            title={notifLoading ? '...' : 'Ativar notificações'}
            onPress={handleAllowNotifications}
            style={[styles.btn, btnStyleTeal]}
            disabled={notifLoading}
          />
          {notifLoading && <ActivityIndicator size="small" color={ONBOARDING_TEAL} style={styles.loader} />}
          <TouchableOpacity onPress={goNext} style={styles.notNow}>
            <Text style={[styles.notNowText, { color: ONBOARDING_TEXT_SEC }]}>Agora não</Text>
          </TouchableOpacity>
        </>
      );
    }
    return (
      <PrimaryButton title="Continuar" onPress={goNext} style={[styles.btn, btnStyleTeal]} />
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, { backgroundColor: ONBOARDING_OVERLAY }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleSkip} />
        <View style={[styles.sheetWrapper, { width: sheetWidth }]} pointerEvents="box-none">
          <Pressable style={styles.sheetOuter} onPress={(e) => e.stopPropagation()}>
            <LinearGradient
              colors={[SHEET_GRADIENT_TOP, SHEET_GRADIENT_BOTTOM]}
              style={[styles.sheet, { paddingBottom }]}
            >
              <View style={[styles.handle, { backgroundColor: 'rgba(255,255,255,0.4)' }]} />
              <TouchableOpacity style={styles.skipTop} onPress={handleSkip} activeOpacity={0.8}>
                <Text style={[styles.skipText, { color: ONBOARDING_TEXT }]}>Pular</Text>
              </TouchableOpacity>

              <ScrollView
                style={styles.contentScroll}
                contentContainerStyle={styles.contentScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.slideContent}>
                  {slide.showLogo ? (
                    <View style={styles.logoWrap}>
                      <Image source={LOGO_LIGHT} style={styles.logoImage} contentFit="contain" />
                    </View>
                  ) : (
                    <View style={[styles.iconWrap, { backgroundColor: 'rgba(45,212,191,0.28)' }]}>
                      <Ionicons name={slide.icon} size={slide.iconSize ?? 48} color={ONBOARDING_TEAL} />
                    </View>
                  )}
                  <Text style={[styles.title, { color: ONBOARDING_TEXT }]}>{slide.title}</Text>
                  <Text style={[styles.message, { color: ONBOARDING_TEXT_SEC }]}>{slide.message}</Text>
                </View>
              </ScrollView>

              <View style={styles.dots}>
                {SLIDES.map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setIndex(i)}
                    activeOpacity={0.8}
                    style={styles.dotTouch}
                  >
                    <Animated.View
                      style={[
                        styles.dotBase,
                        {
                          backgroundColor: i === index ? ONBOARDING_TEAL : 'rgba(255,255,255,0.4)',
                          width: dotScales[i].interpolate({ inputRange: [0, 1], outputRange: [8, 24] }),
                        },
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.actions}>
                {renderActions()}
              </View>
            </LinearGradient>
          </Pressable>
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
  },
  sheetWrapper: {
    maxHeight: '78%',
    marginHorizontal: spacing.lg,
  },
  sheetOuter: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  sheet: {
    borderRadius: 24,
    paddingTop: 14,
    paddingHorizontal: spacing.lg,
    minHeight: 320,
  },
  contentScroll: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: 220,
  },
  contentScrollContent: {
    paddingBottom: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  skipTop: { position: 'absolute', top: 14, right: spacing.lg, zIndex: 1 },
  skipText: { fontSize: 15, fontWeight: '600' },
  slideContent: { alignItems: 'center', paddingTop: 8 },
  logoWrap: { marginBottom: spacing.md, alignItems: 'center', justifyContent: 'center' },
  logoImage: { height: 44, width: 165, maxWidth: '90%' },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  message: { fontSize: 15, lineHeight: 22, textAlign: 'center', paddingHorizontal: spacing.sm },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: spacing.md,
  },
  dotTouch: { padding: 4 },
  dotBase: { height: 8, borderRadius: 4 },
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
  footerHint: { fontSize: 13, textAlign: 'center', marginTop: 4 },
  notNow: { alignItems: 'center', paddingVertical: 10 },
  notNowText: { fontSize: 15 },
  loader: { marginTop: 8 },
});
