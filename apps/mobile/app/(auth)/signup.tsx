import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { PrimaryButton } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/authStore';
import { getApiUrlConfigIssue } from '../../src/api/client';
import { getFriendlyErrorMessage } from '../../src/utils/errorMessage';
import { isSignup409Conflict } from '../../src/utils/signupError';
import { isValidCpfOrCnpj } from '../../src/utils/cpfCnpj';
import { setShouldShowOnboardingAfterSignup } from '../../src/storage/onboarding';
import { formatPhoneInput, getPhoneDigits } from '../../src/utils/phoneMask';
import { spacing } from '../../src/theme';
import { presign } from '../../src/api/uploads';
import { submitKyc } from '../../src/api/me';
import { checkEmailAvailable, checkDocumentAvailable } from '../../src/api/auth';

const LogoSplash = require('../../assets/brand/logo/logo_splash.png');
const APP_VERSION = Constants.expoConfig?.version ?? '1.1.1';

/** Mín. 6 caracteres, pelo menos uma letra e um número */
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
/** Nome de usuário: 2–30 caracteres, apenas a-z 0-9 . _ */
const USERNAME_RULE = /^[a-z0-9._]{2,30}$/;
/** Formato básico de e-mail */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const WHY_VERIFICATION_MODAL_TEXT = `A verificação de identidade é uma forma de o Adopet tentar tornar o processo de adoção mais eficiente e mais seguro para todos — quem anuncia o pet e quem deseja adotar.

Ela não garante 100% de segurança: nenhum processo online substitui o cuidado e o bom senso no encontro e na entrega do pet. Mesmo assim, acreditamos que conferir a identidade de quem vai confirmar a adoção no app ajuda a reduzir riscos e a dar mais tranquilidade a tutores e adotantes.

Ao solicitar documento e selfie, nosso objetivo é contribuir para que as adoções feitas pela plataforma sejam mais transparentes e confiáveis.`;

export default function SignupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ redirectPetId?: string }>();
  const redirectPetId = params.redirectPetId?.trim();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const signup = useAuthStore((s) => s.signup);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [phone, setPhone] = useState('');
  const [document, setDocument] = useState('');
  const [username, setUsername] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [wantKycNow, setWantKycNow] = useState(false);
  const [selfieWithDocUri, setSelfieWithDocUri] = useState<string | null>(null);
  const [isUploadingKyc, setIsUploadingKyc] = useState(false);
  const [showWhyKycModal, setShowWhyKycModal] = useState(false);

  /** Envia uma imagem já escolhida (URI local) para o servidor; retorna a key. Requer estar logado. */
  const uploadImageFromUri = useCallback(async (uri: string, label: string): Promise<string> => {
    const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `${label}-${Date.now()}.${ext === 'jpg' ? 'jpg' : ext}`;
    const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const { uploadUrl, key } = await presign(filename, contentType);
    const response = await fetch(uri);
    const blob = await response.blob();
    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': blob.type || 'image/jpeg' },
    });
    if (!putRes.ok) throw new Error(`Upload falhou: ${putRes.status}`);
    return key;
  }, []);

  const pickSelfieWithDocForKyc = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão', 'Precisamos acessar suas fotos para enviar a verificação.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) setSelfieWithDocUri(result.assets[0].uri);
  }, []);

  /** Formata como CPF (11 dígitos) ou CNPJ (14 dígitos) conforme o usuário digita. */
  const formatDocumentDisplay = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    if (digits.length <= 11) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    // CNPJ: XX.XXX.XXX/XXXX-XX
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  };

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password || !passwordConfirm || !phone.trim() || !document.trim()) {
      Alert.alert('Erro', 'Preencha nome, email, CPF ou CNPJ, telefone, senha e confirmação da senha.');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      Alert.alert('E-mail inválido', 'Informe um endereço de e-mail válido (ex: seu@email.com).');
      return;
    }
    const userInput = username.trim().toLowerCase().replace(/^@/, '');
    if (!userInput) {
      Alert.alert('Erro', 'Informe um nome de usuário. Ele será usado para outros usuários te encontrarem (@nome).');
      return;
    }
    if (userInput.length < 2 || userInput.length > 30) {
      Alert.alert('Erro', 'O nome de usuário deve ter entre 2 e 30 caracteres.');
      return;
    }
    if (!USERNAME_RULE.test(userInput)) {
      Alert.alert('Erro', 'Use apenas letras minúsculas, números, ponto e underscore no nome de usuário.');
      return;
    }
    const documentDigits = document.replace(/\D/g, '');
    if (documentDigits.length !== 11 && documentDigits.length !== 14) {
      Alert.alert('Erro', 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).');
      return;
    }
    if (!isValidCpfOrCnpj(documentDigits)) {
      Alert.alert('Documento inválido', 'CPF ou CNPJ inválido. Verifique os dígitos.');
      return;
    }
    const phoneDigits = getPhoneDigits(phone);
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      Alert.alert('Erro', 'Informe um telefone válido com DDD (10 ou 11 dígitos).');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('Erro', 'As senhas não coincidem. Digite a mesma senha nos dois campos.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Erro', 'A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (!PASSWORD_RULE.test(password)) {
      Alert.alert('Erro', 'A senha deve ter pelo menos uma letra e um número.');
      return;
    }
    if (!acceptedTerms) {
      Alert.alert('Aceite os termos', 'Para criar sua conta, você precisa aceitar os Termos de Uso e a Política de Privacidade.');
      return;
    }
    if (wantKycNow && !selfieWithDocUri) {
      Alert.alert(
        'Verificação de identidade',
        'Selecione a foto (selfie com documento) para enviar a verificação agora ou desmarque a opção para fazer depois.'
      );
      return;
    }
    try {
      const [emailCheck, documentCheck] = await Promise.all([
        checkEmailAvailable(email.trim()),
        checkDocumentAvailable(documentDigits),
      ]);
      if (!emailCheck.available) {
        Alert.alert('E-mail já cadastrado', 'Este e-mail já possui uma conta. Use outro e-mail ou faça login.');
        return;
      }
      if (!documentCheck.available) {
        Alert.alert('Documento já cadastrado', 'Este CPF ou CNPJ já possui uma conta. Use outro documento ou faça login.');
        return;
      }
    } catch (preCheckErr: unknown) {
      const preMsg = preCheckErr instanceof Error ? preCheckErr.message : String(preCheckErr ?? '');
      if (/^API\s+400/i.test(preMsg)) {
        const friendly = getFriendlyErrorMessage(preCheckErr, 'Dados inválidos. Verifique e-mail e documento.');
        Alert.alert('Dados inválidos', friendly);
        return;
      }
      // Se a verificação falhou (404, 500, rede), segue para o signup; o servidor retornará 409 se e-mail/documento já existir
      if (__DEV__) {
        console.warn('[Signup] Verificação de e-mail/documento falhou, tentando signup mesmo assim:', preMsg.slice(0, 120));
      }
    }
    try {
      const res = await signup(email.trim(), password, name.trim(), phoneDigits, documentDigits, userInput);
      try {
        const { trackEvent } = await import('../../src/analytics');
        trackEvent({ name: 'signup_complete', properties: {} });
      } catch {
        // não falhar o fluxo se analytics der erro
      }
      if (res.requiresEmailVerification) {
        Alert.alert(
          'Conta criada!',
          'Enviamos um e-mail de confirmação para você. Clique no link que enviamos para ativar sua conta. Depois, faça login com seu e-mail e senha.',
          [{ text: 'Ir para o login', onPress: () => router.replace('/(auth)/login') }]
        );
      } else {
        if (!redirectPetId) {
          setShouldShowOnboardingAfterSignup();
          try {
            const { clearOnboardingSeen } = await import('../../src/storage/onboarding');
            await clearOnboardingSeen();
          } catch {
            // Não falhar o fluxo; a flag em memória garante que o onboarding será exibido
          }
        }
        if (wantKycNow && selfieWithDocUri) {
          setIsUploadingKyc(true);
          try {
            const key = await uploadImageFromUri(selfieWithDocUri, 'selfie-with-doc');
            await submitKyc(key, true);
            queryClient.invalidateQueries({ queryKey: ['me'] });
            queryClient.invalidateQueries({ queryKey: ['me', 'kyc-status'] });
            Alert.alert(
              'Conta criada!',
              'Sua conta foi criada e sua verificação de identidade foi enviada. Em breve nossa equipe analisará e você poderá confirmar adoções.',
              [{ text: 'Continuar', onPress: () => (redirectPetId ? router.replace(`/(tabs)/pet/${redirectPetId}`) : router.replace('/(tabs)')) }]
            );
          } catch (kycErr) {
            Alert.alert(
              'Conta criada!',
              'Sua conta foi criada com sucesso. O envio da verificação de identidade falhou; você pode fazer depois em Perfil > Solicitar verificação.',
              [{ text: 'Continuar', onPress: () => (redirectPetId ? router.replace(`/(tabs)/pet/${redirectPetId}`) : router.replace('/(tabs)')) }]
            );
          } finally {
            setIsUploadingKyc(false);
          }
        } else {
          Alert.alert('Conta criada!', 'Sua conta foi criada com sucesso. Bem-vindo(a)!', [
            {
              text: 'Continuar',
              onPress: () => (redirectPetId ? router.replace(`/(tabs)/pet/${redirectPetId}`) : router.replace('/(tabs)')),
            },
          ]);
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e ?? '');
      const isHmrBug = /HMRClient\.registerBundle|registerBundle is not a function/i.test(msg);
      if (isHmrBug && __DEV__) {
        console.warn('[Signup] Erro HMR após resposta da API (conta criada). Exibindo sucesso.', msg);
        setShouldShowOnboardingAfterSignup();
        Alert.alert('Conta criada!', 'Sua conta foi criada com sucesso. Bem-vindo(a)!', [
          {
            text: 'Continuar',
            onPress: () => (redirectPetId ? router.replace(`/(tabs)/pet/${redirectPetId}`) : router.replace('/(tabs)')),
          },
        ]);
        return;
      }
      if (__DEV__ && !isSignup409Conflict(msg)) {
        const raw = e instanceof Error ? { message: e.message, name: e.name, stack: e.stack } : e;
        console.error('[Signup] Erro ao criar conta (causa real):', raw);
      }
      const configMsg = getApiUrlConfigIssue();
      const isConnectionError = /network|fetch|connection|timeout|ECONNREFUSED|failed to fetch|could not connect|request timeout/i.test(msg);
      const friendlyMsg = getFriendlyErrorMessage(e, 'Tente outro email ou mais tarde.');
      const isDevEnvError = /ambiente de desenvolvimento|dev:mobile:clear/i.test(friendlyMsg);
      const isServerOrUncertain = /API\s+5\d{2}|request timeout|ambiente de desenvolvimento|dev:mobile:clear/i.test(msg) || isConnectionError;
      if (isServerOrUncertain) {
        setShouldShowOnboardingAfterSignup();
      }
      const title = 'Não foi possível completar';
      const body = configMsg
        ? configMsg
        : isConnectionError
          ? 'Não foi possível conectar ao servidor. Sua conta pode ter sido criada — tente fazer login com seu e-mail e senha. Se funcionar, use o app normalmente; se não, tente criar a conta novamente.'
          : isDevEnvError
            ? 'Pode ser um problema temporário. Tente fazer login com esse e-mail e senha (a conta pode ter sido criada). Se não funcionar, tente criar a conta novamente.'
            : friendlyMsg;
      Alert.alert(title, body, [
        { text: 'OK' },
        { text: 'Ir para o login', onPress: () => router.replace('/(auth)/login') },
      ]);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(8, insets.top - 32),
            paddingBottom: insets.bottom + spacing.xl + 120,
            paddingHorizontal: spacing.md + insets.left,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Image source={LogoSplash} style={styles.logo} resizeMode="contain" />
        <View style={[styles.dataNotice, { backgroundColor: (colors.warning || '#d97706') + '18', borderColor: (colors.warning || '#d97706') + '50' }]}>
          <Ionicons name="shield-checkmark" size={20} color={colors.warning || '#d97706'} style={styles.dataNoticeIcon} />
          <Text style={[styles.dataNoticeText, { color: colors.textPrimary }]}>
            Informe apenas dados reais. Seus dados estão protegidos e não serão compartilhados com outros usuários.
          </Text>
        </View>
        <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={Platform.OS === 'android' ? insets.top : 0} style={styles.form}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
            placeholder="Nome"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            autoComplete="name"
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
            placeholder="Email"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
            placeholder="(11) 98765-4321"
            placeholderTextColor={colors.textSecondary}
            value={phone}
            onChangeText={(t) => setPhone(formatPhoneInput(t))}
            keyboardType="phone-pad"
            maxLength={16}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
            placeholder="CPF ou CNPJ (apenas números)"
            placeholderTextColor={colors.textSecondary}
            value={document}
            onChangeText={(t) => setDocument(formatDocumentDisplay(t))}
            keyboardType="number-pad"
            maxLength={18}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
            placeholder="Nome de usuário (ex: maria.silva)"
            placeholderTextColor={colors.textSecondary}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: -4, marginBottom: 4 }}>
            Outros usuários poderão te encontrar por @nome. Use letras minúsculas, números, ponto ou underscore (2 a 30 caracteres).
          </Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, styles.passwordInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
              placeholder="Senha"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password-new"
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)} accessibilityLabel={showPassword ? 'Ocultar senha' : 'Ver senha'}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: -4, marginBottom: 4 }}>
            Mínimo 6 caracteres, com pelo menos uma letra e um número.
          </Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, styles.passwordInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
              placeholder="Confirmar senha"
              placeholderTextColor={colors.textSecondary}
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              secureTextEntry={!showPasswordConfirm}
              autoComplete="password-new"
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPasswordConfirm((v) => !v)} accessibilityLabel={showPasswordConfirm ? 'Ocultar senha' : 'Ver senha'}>
              <Ionicons name={showPasswordConfirm ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={[styles.privacyBox, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
            <Text style={[styles.privacyTitle, { color: colors.textPrimary }]}>Seus dados estão seguros</Text>
            <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
              Nome, email e telefone não são compartilhados com outros usuários. Usamos o telefone apenas para o administrador confirmar adoções com você quando necessário.
            </Text>
          </View>
          <View style={[styles.kycCheckWrap, { backgroundColor: colors.surface, borderColor: colors.primary + '30' }]}>
            <Pressable
              style={styles.termsCheckWrap}
              onPress={() => setWantKycNow((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: wantKycNow }}
              accessibilityLabel="Deseja fazer a verificação de identidade (KYC) agora?"
            >
              <View style={[styles.checkbox, { borderColor: wantKycNow ? colors.primary : colors.textSecondary, backgroundColor: wantKycNow ? colors.primary : 'transparent' }]}>
                {wantKycNow ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
              </View>
              <Text style={[styles.termsLabel, { color: colors.textPrimary }]}>
                Deseja fazer a verificação de identidade (KYC) agora?
              </Text>
            </Pressable>
            <TouchableOpacity
              style={styles.kycWhyTooltipWrap}
              onPress={() => setShowWhyKycModal(true)}
              activeOpacity={0.8}
              accessibilityLabel="Por que precisa da verificação?"
            >
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.kycWhyTooltipText, { color: colors.primary }]}>Por que precisa da verificação?</Text>
            </TouchableOpacity>
            <Text style={[styles.kycCheckHint, { color: colors.textSecondary }]}>
              Se preferir, você pode fazer depois em Perfil {'>'} Solicitar verificação.
            </Text>
            {wantKycNow && (
              <View style={styles.kycFields}>
                <Text style={[styles.kycLabel, { color: colors.textSecondary }]}>Selfie com a frente do documento (RG ou CNH)</Text>
                <Text style={[styles.kycRetentionHint, { color: colors.textSecondary }]}>
                  A imagem é usada apenas para esta verificação e não é armazenada após a análise.
                </Text>
                <TouchableOpacity
                  style={[styles.kycUploadBox, { borderColor: colors.primary + '60', backgroundColor: colors.background + '80' }]}
                  onPress={pickSelfieWithDocForKyc}
                >
                  {selfieWithDocUri ? (
                    <View style={styles.kycUploadDone}>
                      <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
                      <Text style={[styles.kycUploadDoneText, { color: colors.textPrimary }]}>Foto selecionada</Text>
                    </View>
                  ) : (
                    <>
                      <Ionicons name="person-outline" size={40} color={colors.primary} />
                      <Text style={[styles.kycUploadHint, { color: colors.textSecondary }]}>Toque para escolher (documento e rosto visíveis)</Text>
                    </>
                  )}
                </TouchableOpacity>
                {selfieWithDocUri ? (
                  <TouchableOpacity
                    onPress={() => setSelfieWithDocUri(null)}
                    style={styles.kycRemoveWrap}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
                    <Text style={[styles.kycRemoveText, { color: colors.textSecondary }]}>Apagar imagem</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </View>
          <View style={[styles.termsRow, { marginTop: spacing.sm }]}>
            <Pressable
              style={styles.termsCheckWrap}
              onPress={() => setAcceptedTerms((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptedTerms }}
              accessibilityLabel="Concordo com os Termos de Uso e a Política de Privacidade"
            >
              <View style={[styles.checkbox, { borderColor: acceptedTerms ? colors.primary : colors.textSecondary, backgroundColor: acceptedTerms ? colors.primary : 'transparent' }]}>
                {acceptedTerms ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
              </View>
              <Text style={[styles.termsLabel, { color: colors.textPrimary }]}>Concordo com os </Text>
            </Pressable>
            <TouchableOpacity onPress={() => router.push('/terms')}>
              <Text style={[styles.legalLink, { color: colors.primary }]}>Termos de Uso</Text>
            </TouchableOpacity>
            <Text style={[styles.termsLabel, { color: colors.textPrimary }]}> e a </Text>
            <TouchableOpacity onPress={() => router.push('/privacy')}>
              <Text style={[styles.legalLink, { color: colors.primary }]}>Política de Privacidade</Text>
            </TouchableOpacity>
          </View>
          <PrimaryButton
            title={isLoading ? 'Cadastrando...' : isUploadingKyc ? 'Enviando verificação...' : 'Criar conta'}
            onPress={handleSubmit}
            disabled={isLoading || isUploadingKyc || !acceptedTerms}
          />
        </KeyboardAvoidingView>
        <Text style={[styles.versionText, { color: colors.textSecondary }]}>
          Versão {APP_VERSION}
        </Text>
      </ScrollView>
      <Modal
        visible={showWhyKycModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWhyKycModal(false)}
      >
        <Pressable style={styles.whyModalOverlay} onPress={() => setShowWhyKycModal(false)}>
          <Pressable style={[styles.whyModalBox, { backgroundColor: colors.background }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.whyModalTitle, { color: colors.textPrimary }]}>Por que pedimos a verificação?</Text>
            <ScrollView style={styles.whyModalScroll} showsVerticalScrollIndicator={false}>
              <Text style={[styles.whyModalBody, { color: colors.textSecondary }]}>{WHY_VERIFICATION_MODAL_TEXT}</Text>
            </ScrollView>
            <TouchableOpacity
              style={[styles.whyModalCloseBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowWhyKycModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.whyModalCloseText}>Entendi</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  logo: {
    width: 180,
    height: 180 * 1.2,
    alignSelf: 'center',
    marginTop: -24,
    marginBottom: spacing.xl,
  },
  dataNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  dataNoticeIcon: { marginRight: spacing.sm, marginTop: 2 },
  dataNoticeText: { flex: 1, fontSize: 13, lineHeight: 20 },
  form: { gap: spacing.md },
  termsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  termsCheckWrap: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsLabel: { fontSize: 13 },
  legalLink: { fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  privacyBox: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  privacyTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing.xs },
  privacyText: { fontSize: 13, lineHeight: 20 },
  kycCheckWrap: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  kycWhyTooltipWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.xs },
  kycWhyTooltipText: { fontSize: 14, fontWeight: '600' },
  kycCheckHint: { fontSize: 12, marginTop: spacing.xs, paddingLeft: 30 },
  kycFields: { marginTop: spacing.md, gap: spacing.sm },
  kycLabel: { fontSize: 13, marginBottom: spacing.xs },
  kycRetentionHint: { fontSize: 12, lineHeight: 18, marginBottom: spacing.xs },
  kycUploadBox: {
    borderWidth: 2,
    borderRadius: 10,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  kycUploadDone: { alignItems: 'center', gap: spacing.xs },
  kycUploadDoneText: { fontSize: 14, fontWeight: '600' },
  kycUploadHint: { fontSize: 13, marginTop: spacing.xs },
  kycRemoveWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.sm },
  kycRemoveText: { fontSize: 14, fontWeight: '600' },
  whyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  whyModalBox: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: spacing.xl,
    maxHeight: '80%',
  },
  whyModalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md, textAlign: 'center' },
  whyModalScroll: { maxHeight: 280, marginBottom: spacing.md },
  whyModalBody: { fontSize: 15, lineHeight: 24, textAlign: 'center' },
  whyModalCloseBtn: { paddingVertical: spacing.md, borderRadius: 12, alignItems: 'center' },
  whyModalCloseText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  passwordWrap: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeBtn: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
  input: {
    padding: spacing.md,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  versionText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
});
