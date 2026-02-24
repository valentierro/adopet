import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, PrimaryButton, LoadingLogo } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { getKycStatus, submitKyc } from '../src/api/me';
import { presign } from '../src/api/uploads';
import { getFriendlyErrorMessage } from '../src/utils/errorMessage';
import { spacing } from '../src/theme';
import { SUPPORT_EMAIL } from '../src/constants/support';

const CONSENT_TEXT =
  'Li e aceito que minhas fotos serão usadas apenas para verificação de identidade e serão excluídas após a análise (aprovado ou rejeitado).';

export default function KycScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);

  const { data: kycStatus, isLoading } = useQuery({
    queryKey: ['me', 'kyc-status'],
    queryFn: getKycStatus,
  });

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

  const pickSelfieWithDoc = useCallback(async () => {
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
    if (!result.canceled && result.assets[0]?.uri) setSelfieUri(result.assets[0].uri);
  }, []);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selfieUri) throw new Error('Selecione uma foto.');
      if (!consentGiven) throw new Error('Aceite o uso das fotos apenas para análise e exclusão após a decisão.');
      const key = await uploadImageFromUri(selfieUri, 'selfie-with-doc');
      return submitKyc(key, true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'kyc-status'] });
      Alert.alert(
        'Enviado!',
        'Sua verificação de identidade foi enviada. Nossa equipe analisará em breve. Você poderá confirmar adoções após a aprovação.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível enviar. Tente novamente.'));
    },
  });

  if (isLoading) {
    return (
      <ScreenContainer>
        <LoadingLogo />
      </ScreenContainer>
    );
  }

  const status = kycStatus?.kycStatus ?? null;
  const isVerified = status === 'VERIFIED';
  const isPending = status === 'PENDING';
  const isRejected = status === 'REJECTED';

  return (
    <ScreenContainer>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {isVerified && (
          <View style={[styles.card, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
            <Ionicons name="shield-checkmark" size={48} color={colors.primary} style={styles.cardIcon} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Verificação concluída</Text>
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>
              Seu documento e selfie foram aprovados. Você já pode confirmar adoções no app.
            </Text>
            <PrimaryButton title="Voltar" onPress={() => router.back()} style={styles.btn} />
          </View>
        )}

        {isPending && (
          <View style={[styles.card, { backgroundColor: (colors.warning || '#d97706') + '18', borderColor: (colors.warning || '#d97706') + '40' }]}>
            <Ionicons name="time" size={48} color={colors.warning || '#d97706'} style={styles.cardIcon} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Verificação em análise</Text>
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>
              Sua verificação foi enviada e está sendo analisada pela equipe. Você será notificado quando for aprovada.
            </Text>
            <Text style={[styles.disclaimerText, { color: colors.textSecondary, marginTop: spacing.sm }]}>
              Não armazenamos suas fotos; elas são excluídas automaticamente assim que a análise for concluída.
            </Text>
            <PrimaryButton title="Voltar" onPress={() => router.back()} style={styles.btn} />
          </View>
        )}

        {isRejected && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} style={styles.cardIcon} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Verificação não aprovada</Text>
            {kycStatus?.kycRejectionReason ? (
              <Text style={[styles.cardText, { color: colors.textSecondary }]}>{kycStatus.kycRejectionReason}</Text>
            ) : (
              <Text style={[styles.cardText, { color: colors.textSecondary }]}>
                Sua solicitação anterior não foi aprovada. Você pode enviar novamente uma nova foto (selfie segurando o documento).
              </Text>
            )}
            <TouchableOpacity
              style={styles.doubtLinkWrap}
              onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Dúvida sobre verificação de identidade (KYC) - Adopet')}`)}
              activeOpacity={0.8}
            >
              <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
              <Text style={[styles.doubtLinkText, { color: colors.primary }]}>Dúvidas sobre a verificação</Text>
            </TouchableOpacity>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Envie uma selfie segurando um documento com foto (RG ou CNH) legível.
            </Text>
            <View style={styles.disclaimerWrap}>
              <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
                Não armazenamos suas fotos. Elas são usadas apenas para análise e são excluídas automaticamente assim que o processo de verificação for finalizado (aprovado ou rejeitado).
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.consentRow, { borderColor: colors.textSecondary }]}
              onPress={() => setConsentGiven((v) => !v)}
              activeOpacity={0.8}
            >
              <Ionicons name={consentGiven ? 'checkbox' : 'square-outline'} size={22} color={consentGiven ? colors.primary : colors.textSecondary} />
              <Text style={[styles.consentLabel, { color: colors.textPrimary }]}>{CONSENT_TEXT}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickSelfieWithDoc} style={[styles.pickBtn, { borderColor: colors.primary }]} activeOpacity={0.8}>
              {selfieUri ? (
                <Image source={{ uri: selfieUri }} style={styles.preview} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={32} color={colors.primary} />
                  <Text style={[styles.pickBtnText, { color: colors.primary }]}>Escolher foto</Text>
                </>
              )}
            </TouchableOpacity>
            {selfieUri ? (
              <TouchableOpacity onPress={() => setSelfieUri(null)} style={styles.removeWrap} activeOpacity={0.8}>
                <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.removeText, { color: colors.textSecondary }]}>Apagar imagem</Text>
              </TouchableOpacity>
            ) : null}
            <PrimaryButton
              title={submitMutation.isPending ? 'Enviando...' : 'Enviar novamente'}
              onPress={() => submitMutation.mutate()}
              loading={submitMutation.isPending}
              disabled={!selfieUri || !consentGiven}
              style={styles.btn}
            />
          </View>
        )}

        {(!status || (status !== 'VERIFIED' && status !== 'PENDING' && status !== 'REJECTED')) && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Ionicons name="shield-checkmark-outline" size={48} color={colors.primary} style={styles.cardIcon} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Solicitar verificação (KYC)</Text>
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>
              A verificação de identidade é usada exclusivamente para habilitar a confirmação de adoções no app. A análise é feita por nossa equipe (decisão humana).
            </Text>
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>
              Envie uma selfie segurando um documento com foto (RG ou CNH) com os dados legíveis.
            </Text>
            <View style={styles.disclaimerWrap}>
              <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
                Não armazenamos suas fotos. Elas são usadas apenas para análise e são excluídas automaticamente assim que o processo de verificação for finalizado (aprovado ou rejeitado).
              </Text>
            </View>
            <TouchableOpacity
              style={styles.doubtLinkWrap}
              onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Dúvida sobre verificação de identidade (KYC) - Adopet')}`)}
              activeOpacity={0.8}
            >
              <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
              <Text style={[styles.doubtLinkText, { color: colors.primary }]}>Dúvidas sobre a verificação</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.consentRow, { borderColor: colors.textSecondary }]}
              onPress={() => setConsentGiven((v) => !v)}
              activeOpacity={0.8}
            >
              <Ionicons name={consentGiven ? 'checkbox' : 'square-outline'} size={22} color={consentGiven ? colors.primary : colors.textSecondary} />
              <Text style={[styles.consentLabel, { color: colors.textPrimary }]}>{CONSENT_TEXT}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickSelfieWithDoc} style={[styles.pickBtn, { borderColor: colors.primary }]} activeOpacity={0.8}>
              {selfieUri ? (
                <Image source={{ uri: selfieUri }} style={styles.preview} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={32} color={colors.primary} />
                  <Text style={[styles.pickBtnText, { color: colors.primary }]}>Escolher foto (selfie + documento)</Text>
                </>
              )}
            </TouchableOpacity>
            {selfieUri ? (
              <TouchableOpacity onPress={() => setSelfieUri(null)} style={styles.removeWrap} activeOpacity={0.8}>
                <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.removeText, { color: colors.textSecondary }]}>Apagar imagem</Text>
              </TouchableOpacity>
            ) : null}
            <PrimaryButton
              title={submitMutation.isPending ? 'Enviando...' : 'Enviar'}
              onPress={() => submitMutation.mutate()}
              loading={submitMutation.isPending}
              disabled={!selfieUri || !consentGiven}
              style={styles.btn}
            />
            <TouchableOpacity onPress={() => router.push('/terms')} style={styles.legalLinkWrap} activeOpacity={0.8}>
              <Text style={[styles.legalLinkText, { color: colors.textSecondary }]}>
                Termos de Uso e Política de Privacidade (verificação de identidade)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
              <Text style={[styles.backLinkText, { color: colors.textSecondary }]}>Voltar</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
  },
  cardIcon: { marginBottom: spacing.md },
  cardTitle: { fontSize: 20, fontWeight: '700', marginBottom: spacing.sm, textAlign: 'center' },
  cardText: { fontSize: 15, textAlign: 'center', marginBottom: spacing.md, lineHeight: 22 },
  disclaimerWrap: { marginBottom: spacing.md, paddingHorizontal: spacing.sm },
  disclaimerText: { fontSize: 12, textAlign: 'center', lineHeight: 18, fontStyle: 'italic' },
  doubtLinkWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md },
  doubtLinkText: { fontSize: 14, fontWeight: '600' },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: spacing.md,
    alignSelf: 'stretch',
  },
  consentLabel: { flex: 1, fontSize: 13, lineHeight: 19 },
  legalLinkWrap: { marginTop: spacing.md },
  legalLinkText: { fontSize: 13, textDecorationLine: 'underline' },
  hint: { fontSize: 13, textAlign: 'center', marginBottom: spacing.md },
  pickBtn: {
    borderWidth: 2,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    width: '100%',
    marginBottom: spacing.md,
  },
  pickBtnText: { fontSize: 16, fontWeight: '600', marginTop: spacing.sm },
  preview: { width: '100%', height: 180, borderRadius: 8 },
  removeWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: spacing.md },
  removeText: { fontSize: 15, fontWeight: '600' },
  btn: { alignSelf: 'stretch', marginTop: spacing.sm },
  backLink: { marginTop: spacing.lg },
  backLinkText: { fontSize: 15 },
});
