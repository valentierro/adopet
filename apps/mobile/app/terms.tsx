import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { ScreenContainer } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { spacing } from '../src/theme';

export default function TermsScreen() {
  const { colors } = useTheme();

  return (
    <ScreenContainer scroll>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Termos de Uso</Text>
      <Text style={[styles.updated, { color: colors.textSecondary }]}>Última atualização: fevereiro de 2025</Text>
      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>1. Aceitação</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Ao usar o aplicativo Adopet, você concorda com estes Termos de Uso. O Adopet é uma plataforma que conecta pessoas que desejam adotar animais a tutores que buscam um novo lar para seus pets.
        </Text>
      </View>
      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>2. Uso da plataforma</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Você se compromete a publicar apenas informações verdadeiras sobre os pets, a tratar outros usuários com respeito nas conversas e a não usar o app para fins ilegais ou que violem direitos de terceiros. Anúncios com conteúdo inadequado podem ser removidos e a conta suspensa.
        </Text>
      </View>
      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>3. Responsabilidade</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          O Adopet facilita o contato entre usuários, mas não realiza a adoção. A decisão de doar ou adotar é de total responsabilidade dos envolvidos. Recomendamos encontros em locais seguros e a verificação das condições do pet antes da entrega.
        </Text>
      </View>
      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>4. Conta e dados (LGPD)</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Você é responsável por manter a confidencialidade da sua senha. Ao criar conta, você declara ter lido a Política de Privacidade e concorda com o tratamento dos seus dados pessoais nos termos da Lei Geral de Proteção de Dados (LGPD). O tratamento tem como finalidades a prestação do serviço, a melhoria da experiência e o cumprimento de obrigações legais. Você pode exercer seus direitos (acesso, correção, portabilidade, exclusão, etc.) conforme descrito na Política de Privacidade e entrando em contato pelo canal indicado no app.
        </Text>
      </View>
      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>5. Alterações</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Podemos atualizar estes termos periodicamente. O uso continuado do app após alterações constitui aceitação da nova versão. Em caso de dúvidas, entre em contato pelo email de suporte disponível no app.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  updated: {
    fontSize: 13,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
});
