import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { setOnboardingSeen } from '../storage/onboarding';
import { spacing } from '../theme';
import { PrimaryButton } from './PrimaryButton';

export type TourStep = {
  key: string;
  targetRef: React.RefObject<View | null>;
  title: string;
  message: string;
  /** Posição do tooltip em relação ao alvo */
  tooltipPlacement?: 'top' | 'bottom';
};

type Props = {
  visible: boolean;
  userId: string;
  steps: TourStep[];
  onComplete: () => void;
  /** Ref do ScrollView principal para rolar a tela e manter o tooltip visível */
  scrollViewRef?: React.RefObject<ScrollView | null>;
  /** Offset atual do scroll (atualizado via onScroll) */
  scrollOffsetRef?: React.MutableRefObject<number>;
};

type MeasuredLayout = { x: number; y: number; width: number; height: number };

const TOOLTIP_EST_HEIGHT = 200;
const SCROLL_PADDING = 24;

export function DashboardSpotlightTour({
  visible,
  userId,
  steps,
  onComplete,
  scrollViewRef,
  scrollOffsetRef,
}: Props) {
  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const [stepIndex, setStepIndex] = useState(0);
  const [layout, setLayout] = useState<MeasuredLayout | null>(null);
  const [internalVisible, setInternalVisible] = useState(false);

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;
  const stepIndexRef = useRef(stepIndex);
  stepIndexRef.current = stepIndex;

  const measureTarget = useCallback(
    (forStepIndex?: number) => {
      const idx = forStepIndex ?? stepIndex;
      const s = steps[idx];
      if (!s?.targetRef?.current) return;
      s.targetRef.current.measureInWindow((x, y, width, height) => {
        if (stepIndexRef.current !== idx) return;
        setLayout({ x, y, width, height });
      });
    },
    [stepIndex, steps],
  );

  /** Rola a tela para que o alvo e o tooltip fiquem visíveis, depois mede */
  const scrollIntoViewAndMeasure = useCallback(() => {
    const idx = stepIndexRef.current;
    const s = steps[idx];
    if (!s?.targetRef?.current) {
      setTimeout(() => measureTarget(idx), 300);
      return;
    }
    if (!scrollViewRef?.current || !scrollOffsetRef) {
      setTimeout(() => measureTarget(idx), 300);
      return;
    }
    s.targetRef.current.measureInWindow((x, y, width, height) => {
      if (stepIndexRef.current !== idx) return;
      const placement = s.tooltipPlacement ?? 'bottom';
      const scrollY = scrollOffsetRef.current;
      let newScrollY = scrollY;

      if (placement === 'bottom') {
        const tooltipBottom = y + height + 16 + TOOLTIP_EST_HEIGHT;
        if (tooltipBottom > windowHeight - SCROLL_PADDING) {
          const delta = tooltipBottom - (windowHeight - SCROLL_PADDING);
          newScrollY = scrollY + delta;
          newScrollY = Math.max(0, newScrollY);
        }
      } else {
        const tooltipTop = y - TOOLTIP_EST_HEIGHT;
        if (tooltipTop < SCROLL_PADDING) {
          const delta = SCROLL_PADDING - tooltipTop;
          newScrollY = Math.max(0, scrollY - delta);
        }
      }

      if (Math.abs(newScrollY - scrollY) > 2) {
        scrollViewRef.current?.scrollTo({ y: newScrollY, animated: true });
        scrollOffsetRef.current = newScrollY;
        setTimeout(() => measureTarget(idx), 350);
      } else {
        measureTarget(idx);
      }
    });
  }, [steps, scrollViewRef, scrollOffsetRef, windowHeight, measureTarget]);

  useEffect(() => {
    if (visible) {
      setStepIndex(0);
      setInternalVisible(true);
    }
  }, [visible]);

  useEffect(() => {
    if (internalVisible && step) {
      const t = setTimeout(scrollIntoViewAndMeasure, 300);
      return () => clearTimeout(t);
    }
  }, [internalVisible, stepIndex, step, scrollIntoViewAndMeasure]);

  const handleNext = () => {
    if (isLast) {
      finish();
    } else {
      setLayout(null);
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

  const placement = step.tooltipPlacement ?? 'bottom';

  return (
    <Modal visible={internalVisible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={finish}>
        {layout && (
          <View
            style={[
              styles.spotlight,
              {
                left: layout.x - 4,
                top: layout.y - 4,
                width: layout.width + 8,
                height: layout.height + 8,
                borderColor: colors.primary,
              },
            ]}
            pointerEvents="none"
          />
        )}
        <Pressable style={StyleSheet.absoluteFill} onPress={(e) => e.stopPropagation()} />
        <View
          style={[
            styles.tooltipWrap,
            layout
              ? {
                  position: 'absolute',
                  top: placement === 'bottom' ? layout.y + layout.height + 16 : Math.max(16, layout.y - 200),
                  left: 16,
                  right: 16,
                }
              : { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
          ]}
        >
          <View style={[styles.tooltip, { backgroundColor: colors.surface }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{step.title}</Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>{step.message}</Text>
            <View style={styles.actions}>
              <TouchableOpacity onPress={finish} style={styles.skipBtn}>
                <Text style={[styles.skipText, { color: colors.textSecondary }]}>Pular tour</Text>
              </TouchableOpacity>
              <PrimaryButton
                title={isLast ? 'Começar' : 'Próximo'}
                onPress={handleNext}
                style={styles.nextBtn}
              />
            </View>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  spotlight: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
  tooltipWrap: {
    paddingHorizontal: spacing.lg,
  },
  tooltip: {
    borderRadius: 16,
    padding: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
