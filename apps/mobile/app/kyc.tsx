import { useState, useCallback, useEffect, useRef } from 'react';
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
  Modal,
  Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, PrimaryButton, LoadingLogo, Toast } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { getKycStatus, submitKyc, cancelKyc, KYC_CANCELLATION_REASONS } from '../src/api/me';
import { presign } from '../src/api/uploads';
import { getFriendlyErrorMessage } from '../src/utils/errorMessage';
import { spacing } from '../src/theme';
import { SUPPORT_EMAIL } from '../src/constants/support';

const CONSENT_TEXT =
  'Li e aceito que minhas fotos (frente do documento, selfie e, se enviado, verso do documento) serão usadas apenas para verificação de identidade e serão excluídas após a análise (aprovado ou rejeitado).';

const KYC_HINT_RG_CNH =
  'Para conferência automática da data de nascimento: use a CNH (a data vem na frente) ou envie também o verso do RG (a data de nascimento costuma estar no verso do RG).';

const WHY_VERIFICATION_MODAL_TEXT = `A verificação de identidade é uma forma de o Adopet tentar tornar o processo de adoção mais eficiente e mais seguro para todos — quem anuncia o pet e quem deseja adotar.

Ela não garante 100% de segurança: nenhum processo online substitui o cuidado e o bom senso no encontro e na entrega do pet. Mesmo assim, acreditamos que conferir a identidade de quem vai confirmar a adoção no app ajuda a reduzir riscos e a dar mais tranquilidade a tutores e adotantes.

Ao solicitar documento e selfie, nosso objetivo é contribuir para que as adoções feitas pela plataforma sejam mais transparentes e confiáveis.`;

export default function KycScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [versoUri, setVersoUri] = useState<string | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [showWhyModal, setShowWhyModal] = useState(false);
  const [showCancelKycModal, setShowCancelKycModal] = useState(false);
  const [cancelKycReason, setCancelKycReason] = useState<string | null>(null);
  const [cancelSuccessToast, setCancelSuccessToast] = useState<string | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisPhase, setAnalysisPhase] = useState<'analyzing' | 'success' | 'manual' | 'pending'>('analyzing');
  const [progressPercent, setProgressPercent] = useState(0);
  const pollCountRef = useRef(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: kycStatus, isLoading, refetch: refetchKycStatus } = useQuery({
    queryKey: ['me', 'kyc-status'],
    queryFn: getKycStatus,
  });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'kyc-status'] });
    }, [queryClient]),
  );

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

  const pickVersoDoc = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão', 'Precisamos acessar suas fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) setVersoUri(result.assets[0].uri);
  }, []);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selfieUri) throw new Error('Selecione a foto da selfie com o documento.');
      if (!consentGiven) throw new Error('Aceite o uso das fotos apenas para análise e exclusão após a decisão.');
      const selfieKey = await uploadImageFromUri(selfieUri, 'selfie-with-doc');
      let versoKey: string | undefined;
      if (versoUri) {
        versoKey = await uploadImageFromUri(versoUri, 'doc-verso');
      }
      return submitKyc(selfieKey, true, versoKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'kyc-status'] });
      pollCountRef.current = 0;
      setProgressPercent(0);
      setAnalysisPhase('analyzing');
      setShowAnalysisModal(true);
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível enviar. Tente novamente.'));
    },
  });

  const cancelKycMutation = useMutation({
    mutationFn: (reason: string) => cancelKyc(reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'kyc-status'] });
      setShowCancelKycModal(false);
      setCancelKycReason(null);
      setCancelSuccessToast('Solicitação de verificação cancelada. Você pode solicitar novamente quando quiser.');
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível cancelar. Tente novamente.'));
    },
  });

  useEffect(() => {
    if (!showAnalysisModal || analysisPhase !== 'analyzing') return;
    const MAX_POLLS = 22;
    const POLL_MS = 2000;
    const progressStep = 90 / 20;
    progressIntervalRef.current = setInterval(() => {
      setProgressPercent((p) => Math.min(90, p + progressStep));
    }, 1000);
    pollIntervalRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      const data = await refetchKycStatus().then((r) => r.data);
      if (data?.kycStatus === 'VERIFIED') {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setProgressPercent(100);
        setAnalysisPhase('success');
        return;
      }
      if (
        data?.kycStatus === 'PENDING' &&
        (data.kycExtractionStatus === 'DIVERGENT' || data.kycExtractionStatus === 'NOT_EXTRACTED')
      ) {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setProgressPercent(100);
        setAnalysisPhase('manual');
        return;
      }
      if (pollCountRef.current >= MAX_POLLS) {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setProgressPercent(100);
        setAnalysisPhase('pending');
      }
    }, POLL_MS);
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [showAnalysisModal, analysisPhase, refetchKycStatus]);

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
            <TouchableOpacity
              onPress={() => setShowCancelKycModal(true)}
              style={[styles.cancelKycBtn, { borderColor: colors.textSecondary }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelKycBtnText, { color: colors.textSecondary }]}>Cancelar solicitação</Text>
            </TouchableOpacity>
            <PrimaryButton title="Voltar" onPress={() => router.back()} style={styles.btn} />
          </View>
        )}

        {(!status || status !== 'VERIFIED' && status !== 'PENDING') && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Ionicons name="shield-checkmark-outline" size={48} color={colors.primary} style={styles.cardIcon} />
            <View style={styles.titleRow}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Solicitar verificação (KYC)</Text>
              <TouchableOpacity
                style={styles.whyTooltipWrap}
                onPress={() => setShowWhyModal(true)}
                activeOpacity={0.8}
                accessibilityLabel="Por que precisa da verificação?"
              >
                <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
                <Text style={[styles.whyTooltipText, { color: colors.primary }]}>Por que precisa da verificação?</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>
              A verificação de identidade é usada exclusivamente para habilitar a confirmação de adoções no app. A análise é feita por nossa equipe (decisão humana).
            </Text>
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>
              Envie uma selfie segurando a frente do documento (RG ou CNH) com os dados legíveis. Se for RG, envie também o verso do documento — a data de nascimento costuma estar no verso do RG e precisamos dela para conferir com seu cadastro.
            </Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>{KYC_HINT_RG_CNH}</Text>
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
                  <Text style={[styles.pickBtnText, { color: colors.primary }]}>Selfie + documento (frente)</Text>
                </>
              )}
            </TouchableOpacity>
            {selfieUri ? (
              <TouchableOpacity onPress={() => setSelfieUri(null)} style={styles.removeWrap} activeOpacity={0.8}>
                <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.removeText, { color: colors.textSecondary }]}>Apagar</Text>
              </TouchableOpacity>
            ) : null}
            <Text style={[styles.versoLabel, { color: colors.textSecondary }]}>Verso do documento (se for RG)</Text>
            <TouchableOpacity onPress={pickVersoDoc} style={[styles.pickBtn, styles.pickBtnSmall, { borderColor: colors.textSecondary + '80' }]} activeOpacity={0.8}>
              {versoUri ? (
                <Image source={{ uri: versoUri }} style={styles.previewSmall} />
              ) : (
                <>
                  <Ionicons name="document-outline" size={28} color={colors.textSecondary} />
                  <Text style={[styles.pickBtnText, { color: colors.textSecondary, fontSize: 14 }]}>Escolher verso (opcional)</Text>
                </>
              )}
            </TouchableOpacity>
            {versoUri ? (
              <TouchableOpacity onPress={() => setVersoUri(null)} style={styles.removeWrap} activeOpacity={0.8}>
                <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.removeText, { color: colors.textSecondary }]}>Remover verso</Text>
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

      <Modal
        visible={showWhyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWhyModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowWhyModal(false)}>
          <Pressable style={[styles.modalBox, { backgroundColor: colors.background }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Por que pedimos a verificação?</Text>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalBody, { color: colors.textSecondary }]}>{WHY_VERIFICATION_MODAL_TEXT}</Text>
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowWhyModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCloseText}>Entendi</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showCancelKycModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelKycModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowCancelKycModal(false)}>
          <Pressable style={[styles.modalBox, { backgroundColor: colors.background }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Cancelar solicitação de verificação</Text>
            <View style={styles.cancelKycWarningWrap}>
              <Ionicons name="warning-outline" size={24} color={colors.warning ?? '#d97706'} style={styles.cancelKycWarningIcon} />
              <Text style={[styles.cancelKycWarningText, { color: colors.textPrimary }]}>
                Só é possível concluir adoções com o KYC finalizado. Ao cancelar, você poderá solicitar a verificação novamente quando quiser.
              </Text>
            </View>
            <Text style={[styles.cancelKycSelectLabel, { color: colors.textSecondary }]}>Por que está cancelando?</Text>
            <View style={styles.cancelKycOptionsWrap}>
              {KYC_CANCELLATION_REASONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.cancelKycOptionRow,
                    { borderColor: cancelKycReason === opt.value ? colors.primary : colors.textSecondary + '60' },
                    cancelKycReason === opt.value && { backgroundColor: colors.primary + '18' },
                  ]}
                  onPress={() => setCancelKycReason(opt.value)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={cancelKycReason === opt.value ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={cancelKycReason === opt.value ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.cancelKycOptionLabel, { color: colors.textPrimary }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.cancelKycModalActions}>
              <TouchableOpacity
                style={[styles.cancelKycSecondaryBtn, { borderColor: colors.textSecondary }]}
                onPress={() => { setShowCancelKycModal(false); setCancelKycReason(null); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelKycSecondaryBtnText, { color: colors.textSecondary }]}>Manter solicitação</Text>
              </TouchableOpacity>
              <PrimaryButton
                title={cancelKycMutation.isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
                onPress={() => cancelKycReason && cancelKycMutation.mutate(cancelKycReason)}
                loading={cancelKycMutation.isPending}
                disabled={!cancelKycReason}
                style={styles.cancelKycConfirmBtn}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showAnalysisModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (analysisPhase !== 'analyzing') {
            setShowAnalysisModal(false);
            queryClient.invalidateQueries({ queryKey: ['me'] });
            queryClient.invalidateQueries({ queryKey: ['me', 'kyc-status'] });
            router.back();
          }
        }}
      >
        <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
          <View style={[styles.analysisModalBox, { backgroundColor: colors.surface }]}>
            {analysisPhase === 'analyzing' && (
              <>
                <ActivityIndicator size="large" color={colors.primary} style={styles.analysisSpinner} />
                <Text style={[styles.analysisTitle, { color: colors.textPrimary }]}>Analisando documento</Text>
                <Text style={[styles.analysisPercent, { color: colors.primary }]}>{Math.round(progressPercent)}%</Text>
                <Text style={[styles.analysisSub, { color: colors.textSecondary }]}>
                  Conferindo dados do documento com seu cadastro…
                </Text>
              </>
            )}
            {analysisPhase === 'success' && (
              <>
                <View style={[styles.analysisIconWrap, { backgroundColor: ((colors as { success?: string }).success ?? '#22c55e') + '22' }]}>
                  <Ionicons name="checkmark-circle" size={56} color={(colors as { success?: string }).success ?? '#22c55e'} />
                </View>
                <Text style={[styles.analysisTitle, { color: colors.textPrimary }]}>Aprovado!</Text>
                <Text style={[styles.analysisBody, { color: colors.textSecondary }]}>
                  Sua verificação foi aprovada automaticamente. Você já pode confirmar adoções no app.
                </Text>
                <PrimaryButton
                  title="Entendi"
                  onPress={() => {
                    setShowAnalysisModal(false);
                    queryClient.invalidateQueries({ queryKey: ['me'] });
                    queryClient.invalidateQueries({ queryKey: ['me', 'kyc-status'] });
                    router.back();
                  }}
                  style={styles.analysisBtn}
                />
              </>
            )}
            {analysisPhase === 'manual' && (
              <>
                <View style={[styles.analysisIconWrap, { backgroundColor: (colors.warning ?? '#d97706') + '22' }]}>
                  <Ionicons name="time-outline" size={56} color={colors.warning ?? '#d97706'} />
                </View>
                <Text style={[styles.analysisTitle, { color: colors.textPrimary }]}>Análise manual necessária</Text>
                <Text style={[styles.analysisBody, { color: colors.textSecondary }]}>
                  Não foi possível aprovar automaticamente. Sua solicitação será analisada pela equipe em até 48 horas. Você receberá uma notificação quando houver resultado.
                </Text>
                <PrimaryButton
                  title="Entendi"
                  onPress={() => {
                    setShowAnalysisModal(false);
                    queryClient.invalidateQueries({ queryKey: ['me'] });
                    queryClient.invalidateQueries({ queryKey: ['me', 'kyc-status'] });
                    router.back();
                  }}
                  style={styles.analysisBtn}
                />
              </>
            )}
            {analysisPhase === 'pending' && (
              <>
                <View style={[styles.analysisIconWrap, { backgroundColor: colors.primary + '22' }]}>
                  <Ionicons name="document-text-outline" size={56} color={colors.primary} />
                </View>
                <Text style={[styles.analysisTitle, { color: colors.textPrimary }]}>Solicitação recebida</Text>
                <Text style={[styles.analysisBody, { color: colors.textSecondary }]}>
                  Sua verificação foi enviada. A análise pode levar até 48 horas. Você receberá uma notificação quando houver resultado.
                </Text>
                <PrimaryButton
                  title="Entendi"
                  onPress={() => {
                    setShowAnalysisModal(false);
                    queryClient.invalidateQueries({ queryKey: ['me'] });
                    queryClient.invalidateQueries({ queryKey: ['me', 'kyc-status'] });
                    router.back();
                  }}
                  style={styles.analysisBtn}
                />
              </>
            )}
          </View>
        </View>
      </Modal>

      <Toast message={cancelSuccessToast} onHide={() => setCancelSuccessToast(null)} />
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
  titleRow: { alignItems: 'center', marginBottom: spacing.sm, width: '100%' },
  cardTitle: { fontSize: 20, fontWeight: '700', marginBottom: spacing.xs, textAlign: 'center' },
  whyTooltipWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.xs },
  whyTooltipText: { fontSize: 14, fontWeight: '600' },
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
  pickBtnSmall: { minHeight: 90, marginTop: spacing.xs },
  versoLabel: { fontSize: 13, marginBottom: spacing.xs, alignSelf: 'flex-start' },
  pickBtnText: { fontSize: 16, fontWeight: '600', marginTop: spacing.sm },
  preview: { width: '100%', height: 180, borderRadius: 8 },
  previewSmall: { width: '100%', height: 120, borderRadius: 8 },
  removeWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: spacing.md },
  removeText: { fontSize: 15, fontWeight: '600' },
  btn: { alignSelf: 'stretch', marginTop: spacing.sm },
  cancelKycBtn: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  cancelKycBtnText: { fontSize: 15, fontWeight: '600' },
  backLink: { marginTop: spacing.lg },
  backLinkText: { fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalBox: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: spacing.xl,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md, textAlign: 'center' },
  modalScroll: { maxHeight: 280, marginBottom: spacing.md },
  modalBody: { fontSize: 15, lineHeight: 24, textAlign: 'center' },
  modalCloseBtn: { paddingVertical: spacing.md, borderRadius: 12, alignItems: 'center' },
  modalCloseText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelKycWarningWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  cancelKycWarningIcon: { marginTop: 2 },
  cancelKycWarningText: { flex: 1, fontSize: 15, lineHeight: 22, fontWeight: '600' },
  cancelKycSelectLabel: { fontSize: 14, marginBottom: spacing.sm, alignSelf: 'flex-start' },
  cancelKycOptionsWrap: { marginBottom: spacing.lg, gap: spacing.xs },
  cancelKycOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: 10,
  },
  cancelKycOptionLabel: { fontSize: 15, flex: 1 },
  cancelKycModalActions: { gap: spacing.sm },
  cancelKycSecondaryBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelKycSecondaryBtnText: { fontSize: 16, fontWeight: '600' },
  cancelKycConfirmBtn: { alignSelf: 'stretch' },
  analysisModalBox: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
  },
  analysisSpinner: { marginBottom: spacing.md },
  analysisTitle: { fontSize: 20, fontWeight: '700', marginBottom: spacing.sm, textAlign: 'center' },
  analysisPercent: { fontSize: 28, fontWeight: '700', marginBottom: spacing.xs },
  analysisSub: { fontSize: 14, textAlign: 'center', paddingHorizontal: spacing.sm },
  analysisIconWrap: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  analysisBody: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: spacing.lg, paddingHorizontal: spacing.sm },
  analysisBtn: { alignSelf: 'stretch' },
});
