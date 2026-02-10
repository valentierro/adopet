import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, PrimaryButton } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { useAuthStore } from '../src/stores/authStore';
import { createPartnerCheckoutSession } from '../src/api/partner';
import { getFriendlyErrorMessage } from '../src/utils/errorMessage';
import { spacing } from '../src/theme';

const LogoLight = require('../assets/brand/logo/logo_horizontal_light.png');
const LogoDark = require('../assets/brand/logo/logo_dark.png');

const EMAIL_PARCEIROS = 'parcerias@adopet.com.br';

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

async function fetchCep(cep: string): Promise<ViaCepResponse | null> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    const data = (await res.json()) as ViaCepResponse;
    return data?.erro ? null : data;
  } catch {
    return null;
  }
}

const PLANOS_OPCOES_EMAIL = [
  { value: '', label: 'Não definido' },
  { value: 'Básico', label: 'Básico (R$ 99/mês)' },
  { value: 'Destaque', label: 'Destaque (R$ 199/mês)' },
  { value: 'Premium', label: 'Premium (sob consulta)' },
];

// Plano único por enquanto: R$ 50/mês com todos os benefícios
const PLANOS_PAGAMENTO: { value: 'BASIC'; label: string }[] = [
  { value: 'BASIC', label: 'Plano Parceiro - R$ 50/mês' },
];

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
const USERNAME_RULE = /^[a-z0-9._]{2,30}$/;

const TIPO_PESSOA_OPCOES: { value: '' | 'PF' | 'CNPJ'; label: string }[] = [
  { value: '', label: 'Selecione o tipo de pessoa' },
  { value: 'PF', label: 'Pessoa física (CPF)' },
  { value: 'CNPJ', label: 'Pessoa jurídica (CNPJ)' },
];

function validarCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * parseInt(d[i], 10);
  let dig = (sum * 10) % 11;
  if (dig === 10) dig = 0;
  if (dig !== parseInt(d[9], 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += (11 - i) * parseInt(d[i], 10);
  dig = (sum * 10) % 11;
  if (dig === 10) dig = 0;
  return dig === parseInt(d[10], 10);
}

function validarCNPJ(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, '');
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += w1[i] * parseInt(d[i], 10);
  let dig = sum % 11;
  dig = dig < 2 ? 0 : 11 - dig;
  if (dig !== parseInt(d[12], 10)) return false;
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) sum += w2[i] * parseInt(d[i], 10);
  dig = sum % 11;
  dig = dig < 2 ? 0 : 11 - dig;
  return dig === parseInt(d[13], 10);
}

export default function SolicitarParceriaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tipo?: string }>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const tipo = params.tipo === 'comercial' ? 'comercial' : 'ong';

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [instituicao, setInstituicao] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [cnpj, setCnpj] = useState('');
  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [anoFundacao, setAnoFundacao] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);

  const [personType, setPersonType] = useState<'PF' | 'CNPJ' | ''>('');
  const [documentoComercial, setDocumentoComercial] = useState('');
  const [planoDesejado, setPlanoDesejado] = useState('');

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [username, setUsername] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [planoPagamento, setPlanoPagamento] = useState<'BASIC' | 'DESTAQUE' | 'PREMIUM'>('BASIC');

  const partnerSignup = useAuthStore((s) => s.partnerSignup);
  const isLoading = useAuthStore((s) => s.isLoading);
  const queryClient = useQueryClient();

  const buscarCep = useCallback(async () => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setLoadingCep(true);
    const data = await fetchCep(cep);
    setLoadingCep(false);
    if (data) {
      setRua(data.logradouro ?? '');
      setBairro(data.bairro ?? '');
      setCidade(data.localidade ?? '');
      setUf(data.uf ?? '');
    } else {
      Alert.alert('CEP não encontrado', 'Verifique o CEP e tente novamente.');
    }
  }, [cep]);

  const handleSubmit = () => {
    const nomeTrim = nome.trim();
    const emailTrim = email.trim();
    const instTrim = instituicao.trim();
    const msgTrim = mensagem.trim();

    if (!nomeTrim) {
      Alert.alert('Campo obrigatório', 'Preencha seu nome.');
      return;
    }
    if (!emailTrim) {
      Alert.alert('Campo obrigatório', 'Preencha seu e-mail.');
      return;
    }
    if (!instTrim) {
      Alert.alert('Campo obrigatório', tipo === 'ong' ? 'Preencha o nome da instituição.' : 'Preencha o nome do estabelecimento.');
      return;
    }

    const telTrim = telefone.trim();
    if (!telTrim) {
      Alert.alert('Campo obrigatório', 'Preencha o telefone de contato.');
      return;
    }

    if (tipo === 'comercial' && personType) {
      const docTrim = documentoComercial.replace(/\D/g, '');
      if (docTrim.length > 0) {
        const valid = personType === 'PF' ? validarCPF(documentoComercial) : validarCNPJ(documentoComercial);
        const expectedLen = personType === 'PF' ? 11 : 14;
        if (docTrim.length !== expectedLen) {
          Alert.alert('Documento inválido', personType === 'PF' ? 'CPF deve ter 11 dígitos.' : 'CNPJ deve ter 14 dígitos.');
          return;
        }
        if (!valid) {
          Alert.alert('Documento inválido', personType === 'PF' ? 'O CPF informado não é válido.' : 'O CNPJ informado não é válido.');
          return;
        }
      }
    }

    setSubmitting(true);

    let body = `Olá, gostaria de solicitar uma parceria com o Adopet (${tipo === 'ong' ? 'ONG/instituição' : 'comercial'}).\n\n`;
    body += `Nome: ${nomeTrim}\nE-mail: ${emailTrim}\n`;
    body += tipo === 'ong' ? `Instituição: ${instTrim}\n` : `Estabelecimento: ${instTrim}\n`;
    if (tipo === 'ong') {
      if (cnpj.trim()) body += `CNPJ: ${cnpj.trim()}\n`;
      body += `Telefone: ${telefone.trim()}\n`;
      if (anoFundacao.trim()) body += `Ano de fundação: ${anoFundacao.trim()}\n`;
      const endParts = [rua.trim(), numero.trim(), complemento.trim(), bairro.trim(), cidade.trim(), uf.trim()].filter(Boolean);
      if (cep.trim()) body += `CEP: ${cep.trim()}\n`;
      if (endParts.length) body += `Endereço: ${endParts.join(', ')}\n`;
    } else {
      body += `Telefone: ${telefone.trim()}\n`;
      if (personType && documentoComercial.replace(/\D/g, '').length > 0) {
        body += `${personType === 'PF' ? 'CPF' : 'CNPJ'}: ${documentoComercial.trim()}\n`;
      }
      if (planoDesejado) body += `Plano desejado: ${planoDesejado}\n`;
    }
    body += '\n' + (msgTrim ? `Mensagem:\n${msgTrim}` : '');

    const subject = encodeURIComponent(`Solicitação de parceria ${tipo === 'ong' ? 'ONG' : 'comercial'} - ${instTrim}`);
    const url = `mailto:${EMAIL_PARCEIROS}?subject=${subject}&body=${encodeURIComponent(body)}`;

    Linking.openURL(url)
      .then(() => {
        setSubmitting(false);
        Alert.alert(
          'Solicitação enviada',
          'Um e-mail foi preparado. Envie-o para que nossa equipe entre em contato. Este formulário é apenas para manifestação de interesse, não realiza cadastro no app.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
      })
      .catch(() => {
        setSubmitting(false);
        Alert.alert('Erro', 'Não foi possível abrir o e-mail. Você pode enviar manualmente para ' + EMAIL_PARCEIROS);
      });
  };

  const handleSubmitComercialCadastro = async () => {
    const nomeTrim = nome.trim();
    const emailTrim = email.trim().toLowerCase();
    const instTrim = instituicao.trim();
    const telDigits = telefone.replace(/\D/g, '');
    const userInput = username.trim().toLowerCase().replace(/^@/, '');

    if (!nomeTrim) {
      Alert.alert('Campo obrigatório', 'Preencha seu nome.');
      return;
    }
    if (!emailTrim) {
      Alert.alert('Campo obrigatório', 'Preencha seu e-mail.');
      return;
    }
    if (!instTrim) {
      Alert.alert('Campo obrigatório', 'Preencha o nome do estabelecimento.');
      return;
    }
    if (telDigits.length < 10 || telDigits.length > 11) {
      Alert.alert('Campo obrigatório', 'Informe um telefone válido com DDD (10 ou 11 dígitos).');
      return;
    }
    if (!userInput || userInput.length < 2 || userInput.length > 30) {
      Alert.alert('Campo obrigatório', 'Nome de usuário deve ter entre 2 e 30 caracteres (letras minúsculas, números, ponto ou underscore).');
      return;
    }
    if (!USERNAME_RULE.test(userInput)) {
      Alert.alert('Nome de usuário inválido', 'Use apenas letras minúsculas, números, ponto e underscore.');
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert('Senha inválida', 'A senha deve ter no mínimo 6 caracteres, com pelo menos uma letra e um número.');
      return;
    }
    if (!PASSWORD_RULE.test(password)) {
      Alert.alert('Senha inválida', 'A senha deve ter pelo menos uma letra e um número.');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('Senhas não coincidem', 'Digite a mesma senha nos dois campos.');
      return;
    }
    if (!acceptedTerms) {
      Alert.alert('Aceite os termos', 'Para criar sua conta, aceite os Termos de Uso e a Política de Privacidade.');
      return;
    }
    if (!personType) {
      Alert.alert('Campo obrigatório', 'Selecione se é Pessoa física (CPF) ou Pessoa jurídica (CNPJ).');
      return;
    }
    const docTrim = documentoComercial.replace(/\D/g, '');
    const expectedLen = personType === 'PF' ? 11 : 14;
    if (docTrim.length !== expectedLen) {
      Alert.alert('Documento obrigatório', personType === 'PF' ? 'Informe um CPF válido (11 dígitos).' : 'Informe um CNPJ válido (14 dígitos).');
      return;
    }
    const docValid = personType === 'PF' ? validarCPF(documentoComercial) : validarCNPJ(documentoComercial);
    if (!docValid) {
      Alert.alert('Documento inválido', personType === 'PF' ? 'O CPF informado não é válido.' : 'O CNPJ informado não é válido.');
      return;
    }
    const endParts = [rua.trim(), numero.trim(), complemento.trim(), bairro.trim(), cidade.trim(), uf.trim()].filter(Boolean);
    const addressStr = endParts.length ? endParts.join(', ') + (cep.trim() ? ` - CEP ${cep.trim().replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2')}` : '') : '';
    if (!addressStr.trim()) {
      Alert.alert('Campo obrigatório', 'Preencha o endereço completo do estabelecimento (CEP, rua, número, cidade e UF).');
      return;
    }

    try {
      await partnerSignup({
        email: emailTrim,
        password,
        name: nomeTrim,
        phone: telDigits,
        username: userInput,
        establishmentName: instTrim,
        personType,
        ...(personType === 'PF' ? { cpf: docTrim } : { cnpj: docTrim }),
        ...(addressStr ? { address: addressStr } : {}),
        planId: planoPagamento,
      });
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      try {
        const { url } = await createPartnerCheckoutSession({
          planId: planoPagamento,
          successUrl: 'adopet://partner-success',
          cancelUrl: 'adopet://partner-cancel',
        });
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          Linking.openURL(url);
          Alert.alert(
            'Conta criada',
            'Sua conta foi criada. Conclua o pagamento na próxima tela para ativar seu portal de parceiro. Depois volte ao app.',
            [{ text: 'OK', onPress: () => router.replace('/(tabs)') }],
          );
        } else {
          Alert.alert('Próximo passo', 'Copie o link de pagamento que enviamos ou acesse pelo computador. Sua conta já está criada.', [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]);
        }
      } catch (paymentError: unknown) {
        const paymentMsg = getFriendlyErrorMessage(paymentError, '');
        const isPaymentNotConfigured = /pagamentos?\s*não\s*configurados?|payments?\s*not\s*configured/i.test(paymentMsg) || (paymentError instanceof Error && /pagamentos?\s*não\s*configurados?/i.test(paymentError.message));
        if (isPaymentNotConfigured) {
          Alert.alert(
            'Conta criada',
            'Sua conta foi criada com sucesso. No momento o pagamento online não está disponível neste ambiente. Você já pode entrar no app; para ativar o portal do parceiro depois, use Perfil → Renovar assinatura do parceiro ou entre em contato com o suporte.',
            [{ text: 'Ir para o app', onPress: () => router.replace('/(tabs)') }],
          );
        } else {
          Alert.alert('Erro ao abrir pagamento', getFriendlyErrorMessage(paymentError, 'Não foi possível abrir a tela de pagamento. Sua conta já foi criada — entre no app e tente em Perfil → Renovar assinatura do parceiro.'));
        }
      }
    } catch (e: unknown) {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível criar a conta. Tente novamente.'));
    }
  };

  const inputStyle = [styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }];
  const labelStyle = [styles.label, { color: colors.textSecondary }];

  return (
    <ScreenContainer scroll={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + 60}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: 4,
              paddingBottom: insets.bottom + spacing.xl,
              paddingHorizontal: spacing.lg,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoWrap}>
            <Image source={isDark ? LogoDark : LogoLight} style={styles.logo} resizeMode="contain" />
          </View>

          <Text style={[styles.intro, { color: colors.textSecondary }]}>
            {tipo === 'ong' ? 'Preencha os dados abaixo. Nossa equipe entrará em contato.' : 'Preencha os dados e escolha o plano. Após o pagamento você acessa o portal no app.'}
          </Text>

          {tipo === 'comercial' && (
            <>
              <Text style={labelStyle}>Tipo de pessoa *</Text>
              <View style={styles.selectWrap}>
                {TIPO_PESSOA_OPCOES.map((opt) => (
                  <TouchableOpacity
                    key={opt.value || 'empty'}
                    style={[styles.selectOpt, { backgroundColor: personType === opt.value ? colors.primary : colors.surface, borderColor: colors.primary + '40' }]}
                    onPress={() => {
                      setPersonType(opt.value);
                      setDocumentoComercial('');
                    }}
                  >
                    <Text style={[styles.selectOptText, { color: personType === opt.value ? '#fff' : colors.textPrimary }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {personType === 'PF' && (
                <>
                  <Text style={labelStyle}>CPF *</Text>
                  <TextInput
                    style={inputStyle}
                    placeholder="000.000.000-00"
                    placeholderTextColor={colors.textSecondary}
                    value={documentoComercial}
                    onChangeText={(t) => {
                      const d = t.replace(/\D/g, '').slice(0, 11);
                      setDocumentoComercial(d.length <= 3 ? d : d.length <= 6 ? `${d.slice(0,3)}.${d.slice(3)}` : `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`);
                    }}
                    keyboardType="numeric"
                  />
                </>
              )}
              {personType === 'CNPJ' && (
                <>
                  <Text style={labelStyle}>CNPJ *</Text>
                  <TextInput
                    style={inputStyle}
                    placeholder="00.000.000/0001-00"
                    placeholderTextColor={colors.textSecondary}
                    value={documentoComercial}
                    onChangeText={(t) => {
                      const d = t.replace(/\D/g, '').slice(0, 14);
                      setDocumentoComercial(d.length <= 2 ? d : d.length <= 5 ? `${d.slice(0,2)}.${d.slice(2)}` : d.length <= 8 ? `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}` : d.length <= 12 ? `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}` : `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`);
                    }}
                    keyboardType="numeric"
                  />
                </>
              )}
            </>
          )}

          <Text style={labelStyle}>Seu nome *</Text>
          <TextInput style={inputStyle} placeholder="Ex: Maria Silva" placeholderTextColor={colors.textSecondary} value={nome} onChangeText={setNome} autoCapitalize="words" />

          <Text style={labelStyle}>E-mail *</Text>
          <TextInput style={inputStyle} placeholder="contato@empresa.com.br" placeholderTextColor={colors.textSecondary} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

          {tipo === 'comercial' ? (
            <>
              <Text style={labelStyle}>Telefone com DDD *</Text>
              <TextInput style={inputStyle} placeholder="(11) 99999-9999" placeholderTextColor={colors.textSecondary} value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" />
              <Text style={labelStyle}>Nome de usuário *</Text>
              <TextInput style={inputStyle} placeholder="maria.silva" placeholderTextColor={colors.textSecondary} value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
              <Text style={[styles.hint, { color: colors.textSecondary }]}>Outros usuários poderão te encontrar por @nome. Use letras minúsculas, números, ponto ou underscore (2 a 30 caracteres).</Text>
              <Text style={labelStyle}>Senha *</Text>
              <TextInput style={inputStyle} placeholder="Mín. 6 caracteres, letra e número" placeholderTextColor={colors.textSecondary} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
              <Text style={labelStyle}>Confirmar senha *</Text>
              <TextInput style={inputStyle} placeholder="Repita a senha" placeholderTextColor={colors.textSecondary} value={passwordConfirm} onChangeText={setPasswordConfirm} secureTextEntry autoCapitalize="none" />
              <View style={[styles.termsRow, { marginTop: spacing.sm }]}>
                <Pressable style={styles.termsCheckWrap} onPress={() => setAcceptedTerms((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: acceptedTerms }}>
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
              <Text style={labelStyle}>Nome do estabelecimento *</Text>
              <TextInput style={inputStyle} placeholder="Ex: Clínica Veterinária Amor de Patas" placeholderTextColor={colors.textSecondary} value={instituicao} onChangeText={setInstituicao} autoCapitalize="words" />
              <Text style={[labelStyle, { marginTop: spacing.md }]}>Endereço completo *</Text>
              <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: spacing.xs }]}>CEP (busca automática)</Text>
              <View style={styles.cepRow}>
                <TextInput
                  style={[inputStyle, styles.cepInput]}
                  placeholder="00000-000"
                  placeholderTextColor={colors.textSecondary}
                  value={cep}
                  onChangeText={(t) => setCep(t.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9))}
                  keyboardType="numeric"
                  onBlur={buscarCep}
                />
                <TouchableOpacity style={[styles.cepBtn, { backgroundColor: colors.primary }]} onPress={buscarCep} disabled={loadingCep}>
                  {loadingCep ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="search" size={22} color="#fff" />}
                </TouchableOpacity>
              </View>
              <Text style={labelStyle}>Rua / Logradouro</Text>
              <TextInput style={inputStyle} placeholder="Rua, avenida..." placeholderTextColor={colors.textSecondary} value={rua} onChangeText={setRua} />
              <View style={styles.row2}>
                <View style={styles.half}>
                  <Text style={labelStyle}>Número</Text>
                  <TextInput style={inputStyle} placeholder="123" placeholderTextColor={colors.textSecondary} value={numero} onChangeText={setNumero} keyboardType="numeric" />
                </View>
                <View style={styles.half}>
                  <Text style={labelStyle}>Complemento</Text>
                  <TextInput style={inputStyle} placeholder="Sala 1" placeholderTextColor={colors.textSecondary} value={complemento} onChangeText={setComplemento} />
                </View>
              </View>
              <Text style={labelStyle}>Bairro</Text>
              <TextInput style={inputStyle} placeholder="Bairro" placeholderTextColor={colors.textSecondary} value={bairro} onChangeText={setBairro} />
              <View style={styles.row2}>
                <View style={styles.half}>
                  <Text style={labelStyle}>Cidade</Text>
                  <TextInput style={inputStyle} placeholder="Cidade" placeholderTextColor={colors.textSecondary} value={cidade} onChangeText={setCidade} />
                </View>
                <View style={styles.ufWrap}>
                  <Text style={labelStyle}>UF</Text>
                  <TextInput style={inputStyle} placeholder="SP" placeholderTextColor={colors.textSecondary} value={uf} onChangeText={(t) => setUf(t.toUpperCase().slice(0, 2))} />
                </View>
              </View>
              <Text style={labelStyle}>Plano *</Text>
              <View style={styles.selectWrap}>
                {PLANOS_PAGAMENTO.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.selectOpt, { backgroundColor: planoPagamento === opt.value ? colors.primary : colors.surface, borderColor: colors.primary + '40' }]}
                    onPress={() => setPlanoPagamento(opt.value)}
                  >
                    <Text style={[styles.selectOptText, { color: planoPagamento === opt.value ? '#fff' : colors.textPrimary }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <PrimaryButton
                title={isLoading ? 'Criando conta...' : 'Criar conta e ir para pagamento'}
                onPress={handleSubmitComercialCadastro}
                disabled={isLoading || !acceptedTerms}
                style={styles.submitBtn}
              />
            </>
          ) : (
            <>
              <Text style={labelStyle}>{tipo === 'ong' ? 'Nome da instituição *' : 'Nome do estabelecimento *'}</Text>
              <TextInput
                style={inputStyle}
                placeholder={tipo === 'ong' ? 'Ex: ONG Amor de Patas' : 'Ex: Clínica Veterinária X'}
                placeholderTextColor={colors.textSecondary}
                value={instituicao}
                onChangeText={setInstituicao}
                autoCapitalize="words"
              />
            </>
          )}

          {tipo === 'ong' && (
            <>
              <Text style={labelStyle}>CNPJ (opcional)</Text>
              <TextInput
                style={inputStyle}
                placeholder="00.000.000/0001-00"
                placeholderTextColor={colors.textSecondary}
                value={cnpj}
                onChangeText={(t) => {
                  const d = t.replace(/\D/g, '').slice(0, 14);
                  setCnpj(d.length <= 2 ? d : d.length <= 5 ? `${d.slice(0,2)}.${d.slice(2)}` : d.length <= 8 ? `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}` : d.length <= 12 ? `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}` : `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`);
                }}
                keyboardType="numeric"
              />
              <Text style={labelStyle}>Telefone de contato *</Text>
              <TextInput
                style={inputStyle}
                placeholder="(11) 99999-9999"
                placeholderTextColor={colors.textSecondary}
                value={telefone}
                onChangeText={setTelefone}
                keyboardType="phone-pad"
              />
              <Text style={labelStyle}>Ano de fundação (opcional)</Text>
              <TextInput
                style={inputStyle}
                placeholder="Ex: 2010"
                placeholderTextColor={colors.textSecondary}
                value={anoFundacao}
                onChangeText={(t) => setAnoFundacao(t.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
              />
              <Text style={labelStyle}>CEP (opcional – busca endereço)</Text>
              <View style={styles.cepRow}>
                <TextInput
                  style={[inputStyle, styles.cepInput]}
                  placeholder="00000-000"
                  placeholderTextColor={colors.textSecondary}
                  value={cep}
                  onChangeText={(t) => setCep(t.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9))}
                  keyboardType="numeric"
                  onBlur={buscarCep}
                />
                <TouchableOpacity style={[styles.cepBtn, { backgroundColor: colors.primary }]} onPress={buscarCep} disabled={loadingCep}>
                  {loadingCep ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="search" size={22} color="#fff" />}
                </TouchableOpacity>
              </View>
              <Text style={labelStyle}>Endereço completo</Text>
              <TextInput style={inputStyle} placeholder="Rua" placeholderTextColor={colors.textSecondary} value={rua} onChangeText={setRua} />
              <View style={styles.row2}>
                <View style={styles.half}>
                  <Text style={labelStyle}>Número</Text>
                  <TextInput style={inputStyle} placeholder="123" placeholderTextColor={colors.textSecondary} value={numero} onChangeText={setNumero} keyboardType="numeric" />
                </View>
                <View style={styles.half}>
                  <Text style={labelStyle}>Complemento</Text>
                  <TextInput style={inputStyle} placeholder="Sala 1" placeholderTextColor={colors.textSecondary} value={complemento} onChangeText={setComplemento} />
                </View>
              </View>
              <TextInput style={inputStyle} placeholder="Bairro" placeholderTextColor={colors.textSecondary} value={bairro} onChangeText={setBairro} />
              <View style={styles.row2}>
                <View style={styles.half}>
                  <Text style={labelStyle}>Cidade</Text>
                  <TextInput style={inputStyle} placeholder="Cidade" placeholderTextColor={colors.textSecondary} value={cidade} onChangeText={setCidade} />
                </View>
                <View style={styles.ufWrap}>
                  <Text style={labelStyle}>UF</Text>
                  <TextInput style={inputStyle} placeholder="SP" placeholderTextColor={colors.textSecondary} value={uf} onChangeText={(t) => setUf(t.toUpperCase().slice(0, 2))} />
                </View>
              </View>
            </>
          )}

          {tipo === 'ong' && (
            <>
              <Text style={labelStyle}>Mensagem (opcional)</Text>
              <TextInput
                style={[inputStyle, styles.textArea]}
                placeholder="Conte um pouco sobre sua instituição e interesse em parceria..."
                placeholderTextColor={colors.textSecondary}
                value={mensagem}
                onChangeText={setMensagem}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <PrimaryButton title={submitting ? 'Abrindo e-mail...' : 'Enviar solicitação'} onPress={handleSubmit} disabled={submitting} style={styles.submitBtn} />
              <Text style={[styles.hint, { color: colors.textSecondary }]}>Ao tocar em "Enviar solicitação", seu app de e-mail será aberto com os dados preenchidos. Basta enviar a mensagem para concluir.</Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  logoWrap: { alignItems: 'center', paddingTop: 0, paddingBottom: spacing.sm },
  logo: { height: 52, width: 195 },
  intro: { fontSize: 15, lineHeight: 22, marginBottom: spacing.lg },
  label: { fontSize: 14, fontWeight: '600', marginBottom: spacing.xs, marginTop: spacing.sm },
  input: { padding: spacing.md, borderRadius: 12, borderWidth: 1, fontSize: 16 },
  textArea: { minHeight: 100, paddingTop: spacing.md },
  cepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cepInput: { flex: 1 },
  cepBtn: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  row2: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1, minWidth: 0 },
  ufWrap: { width: 72 },
  selectWrap: { gap: spacing.sm, marginTop: spacing.xs },
  selectOpt: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 12, borderWidth: 1 },
  selectOptText: { fontSize: 15, fontWeight: '600' },
  submitBtn: { marginTop: spacing.xl },
  hint: { fontSize: 12, lineHeight: 18, marginTop: spacing.md },
  termsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
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
});
