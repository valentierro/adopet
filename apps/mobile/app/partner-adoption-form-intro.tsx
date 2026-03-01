import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, PrimaryButton, SecondaryButton, PartnerPanelLayout } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { FORM_TEMPLATES } from '../src/constants/adoption-form-library';
import { spacing } from '../src/theme';

const ZERO_INTRO = {
  title: 'Começar do zero',
  icon: 'document-outline',
  body: 'Crie um formulário personalizado do zero, escolhendo cada pergunta da biblioteca.\n\nVocê terá total controle sobre as perguntas, ordem e configuração de Match Score. Ideal quando nenhum dos templates prontos atende às suas necessidades.',
};

export default function PartnerAdoptionFormIntroScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ template?: string }>();
  const { colors } = useTheme();

  const templateId = params.template?.trim() || '';
  const template = templateId ? FORM_TEMPLATES.find((t) => t.id === templateId) : null;
  const intro = template
    ? {
        title: template.introTitle ?? template.name,
        icon: template.icon || 'document-outline',
        body: template.introBody ?? template.description,
      }
    : ZERO_INTRO;

  const handleProceed = () => {
    if (templateId) {
      router.replace({ pathname: '/partner-adoption-form-edit', params: { template: templateId } });
    } else {
      router.replace('/partner-adoption-form-edit');
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <ScreenContainer scroll={false}>
      <PartnerPanelLayout>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name={intro.icon as keyof typeof Ionicons.glyphMap} size={48} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{intro.title}</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{intro.body}</Text>
          <View style={styles.actions}>
            <SecondaryButton title="Voltar" onPress={handleBack} style={styles.btn} />
            <PrimaryButton title="Prosseguir" onPress={handleProceed} style={styles.btn} />
          </View>
        </ScrollView>
      </PartnerPanelLayout>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontSize: 22, fontWeight: '800', marginBottom: spacing.md, textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 24, marginBottom: spacing.xl },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  btn: { flex: 1 },
});
