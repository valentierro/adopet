import { View, Text, ScrollView, StyleSheet, Linking } from 'react-native';
import { ScreenContainer } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { SUPPORT_EMAIL, REQUEST_ACCOUNT_DELETION_URL } from '../src/constants/support';
import { spacing } from '../src/theme';

export default function PrivacyScreen() {
  const { colors } = useTheme();

  const openEmail = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
  };

  const openDeletionRequest = () => {
    Linking.openURL(REQUEST_ACCOUNT_DELETION_URL);
  };

  return (
    <ScreenContainer scroll>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Política de Privacidade</Text>
      <Text style={[styles.updated, { color: colors.textSecondary }]}>Última atualização: fevereiro de 2025</Text>
      <Text style={[styles.intro, { color: colors.textSecondary }]}>
        Esta política descreve como o Adopet trata seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD – Lei 13.709/2018). Ao usar o app, você declara ter lido e concordado com estes termos.
      </Text>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>1. Controlador e finalidade</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          O Adopet é o controlador dos dados coletados no aplicativo. Tratamos seus dados para: (a) prestar o serviço de conexão entre tutores e adotantes; (b) exibir seu perfil no contexto dos anúncios e conversas, conforme suas configurações; (c) enviar notificações push conforme suas preferências; (d) cumprir obrigações legais e (e) confirmar adoções, quando aplicável, por meio de administradores que podem entrar em contato com você.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>2. Dados que coletamos</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Coletamos: nome, email, telefone (com DDD), cidade, foto de perfil, informações sobre moradia e estilo de vida que você optar por preencher; dados dos pets anunciados (fotos, descrição, etc.); favoritos, conversas e mensagens; preferências de busca e localização quando autorizada; e dados técnicos necessários ao funcionamento do app (ex.: token de notificações).
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>3. Base legal (LGPD)</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          O tratamento tem como bases legais: execução de contrato (prestação do serviço), consentimento (quando solicitado para finalidades específicas) e legítimo interesse (segurança, melhoria do serviço e cumprimento legal), nos termos do art. 7º da LGPD.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>4. Compartilhamento e quem vê seus dados</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          <Text style={styles.bold}>Não vendemos nem alugamos seus dados.</Text>
          {'\n\n'}
          • <Text style={styles.bold}>Outros usuários:</Text> em conversas e no perfil vinculado aos anúncios, outros usuários veem apenas nome, foto, cidade e informações que você escolheu exibir (ex.: tipo de moradia). <Text style={styles.bold}>Seu email e telefone não são mostrados a outros usuários.</Text>
          {'\n\n'}
          • <Text style={styles.bold}>Administradores:</Text> o telefone pode ser utilizado apenas por administradores do app para confirmar adoções com você (tutor ou adotante), quando necessário.
          {'\n\n'}
          • Prestadores de serviço (hospedagem, notificações) podem processar dados sob contrato e obrigação de confidencialidade.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>5. Retenção</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Mantemos seus dados enquanto sua conta estiver ativa. Ao desativar a conta, os dados permanecem armazenados para possível reativação; você pode solicitar exclusão definitiva entrando em contato conosco (ver seção 7).
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>6. Seus direitos (art. 18 da LGPD)</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Você tem direito a: confirmação da existência de tratamento; acesso aos dados; correção de dados incompletos ou desatualizados; anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade; portabilidade dos dados (exportar em formato estruturado); eliminação dos dados tratados com consentimento (salvo exceções legais); informação sobre compartilhamento e revogação do consentimento quando o tratamento for com base nele.
          {'\n\n'}
          <Text style={styles.bold}>Como exercer:</Text> acesse e atualize seus dados na tela de perfil do app; use a opção "Exportar meus dados" para portabilidade; use "Desativar conta" nas configurações; para exclusão definitiva, portabilidade detalhada ou outras solicitações, entre em contato pelo email abaixo.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>7. Segurança e contato</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Adotamos medidas técnicas e organizacionais para proteger seus dados. Para dúvidas sobre esta política, para exercer seus direitos ou comunicar o encarregado (DPO), entre em contato:
        </Text>
        <Text style={[styles.contactLink, { color: colors.primary }]} onPress={openEmail}>
          {SUPPORT_EMAIL}
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary }, { marginTop: spacing.md }]}>
          Para solicitar a exclusão da sua conta e dos seus dados pessoais, use o link abaixo:
        </Text>
        <Text style={[styles.contactLink, { color: colors.primary }]} onPress={openDeletionRequest}>
          Solicitar exclusão da conta e dos dados
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
    marginBottom: spacing.lg,
  },
  intro: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.lg,
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
  bold: {
    fontWeight: '700',
  },
  contactLink: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: spacing.sm,
    textDecorationLine: 'underline',
  },
});
