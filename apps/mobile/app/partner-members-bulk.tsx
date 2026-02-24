/**
 * Importação em lote de membros da ONG (stepper em 4 passos).
 * Passo 1: Carregar CSV (template + ajuda). Passo 2: Validar. Passo 3: Preview. Passo 4: Resultado.
 */
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Share,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, PartnerPanelLayout, ProfileMenuFooter, PrimaryButton } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import {
  bulkAddMyPartnerMembers,
  BULK_MEMBERS_MAX,
  PARTNER_MEMBER_ROLE_LABELS,
  type AddPartnerMemberBody,
  type PartnerMemberRole,
} from '../src/api/partner';
import { getFriendlyErrorMessage } from '../src/utils/errorMessage';
import { spacing } from '../src/theme';

const ROLES: PartnerMemberRole[] = [
  'VOLUNTARIO',
  'COORDENADOR',
  'CUIDADOR',
  'RECEPCIONISTA',
  'VETERINARIO',
  'ADMINISTRATIVO',
  'OUTRO',
];

const CSV_TEMPLATE = [
  'email,nome,telefone,funcao',
  'membro@exemplo.org,Maria Silva,11999999999,VOLUNTARIO',
].join('\n');

function parseCSV(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const lines = normalized.split('\n').filter((l) => l.length > 0);
  const rows: string[][] = [];
  for (const line of lines) {
    const cells: string[] = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        i += 1;
        let cell = '';
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') {
            cell += '"';
            i += 2;
          } else if (line[i] === '"') {
            i += 1;
            break;
          } else {
            cell += line[i];
            i += 1;
          }
        }
        cells.push(cell.trim());
        if (line[i] === ',') i += 1;
      } else {
        const comma = line.indexOf(',', i);
        const value = comma === -1 ? line.slice(i) : line.slice(i, comma);
        cells.push(value.trim());
        i = comma === -1 ? line.length : comma + 1;
      }
    }
    rows.push(cells);
  }
  return rows;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ValidationError = {
  row: number;
  message: string;
  suggestion?: string;
};

function validateRows(rows: string[][]): { valid: boolean; errors: ValidationError[]; data: AddPartnerMemberBody[] } {
  const errors: ValidationError[] = [];
  const data: AddPartnerMemberBody[] = [];
  const header = rows[0] ?? [];
  const idxEmail = header.findIndex((h) => /email/i.test(h));
  const idxName = header.findIndex((h) => /nome|name/i.test(h));
  const idxPhone = header.findIndex((h) => /telefone|phone/i.test(h));
  const idxRole = header.findIndex((h) => /funcao|role|função/i.test(h));
  const dataRows = rows.slice(1);
  const seenEmails = new Set<string>();

  if (dataRows.length === 0) {
    errors.push({
      row: 1,
      message: 'A lista não tem linhas de dados (apenas o cabeçalho).',
      suggestion: 'Adicione ao menos uma linha com e-mail e nome.',
    });
    return { valid: false, errors, data: [] };
  }

  if (dataRows.length > BULK_MEMBERS_MAX) {
    errors.push({
      row: -1,
      message: `A lista tem ${dataRows.length} linhas. O máximo permitido é ${BULK_MEMBERS_MAX} membros por vez.`,
      suggestion: `Remova ${dataRows.length - BULK_MEMBERS_MAX} linhas ou faça mais de uma importação.`,
    });
  }

  for (let i = 0; i < dataRows.length; i++) {
    const rowNum = i + 2;
    const row = dataRows[i] ?? [];
    const email = (idxEmail >= 0 ? row[idxEmail] : row[0])?.trim() ?? '';
    const name = (idxName >= 0 ? row[idxName] : row[1])?.trim() ?? '';
    const phone = (idxPhone >= 0 ? row[idxPhone] : row[2])?.trim() ?? '';
    const roleRaw = (idxRole >= 0 ? row[idxRole] : row[3])?.trim() ?? '';

    if (!email) {
      errors.push({
        row: rowNum,
        message: 'E-mail obrigatório está vazio.',
        suggestion: 'Preencha com um e-mail válido para o membro receber o convite de senha.',
      });
      continue;
    }
    if (!EMAIL_REGEX.test(email)) {
      errors.push({
        row: rowNum,
        message: 'E-mail inválido.',
        suggestion: 'Use um endereço válido (ex: nome@dominio.com) para o membro receber o convite.',
      });
      continue;
    }
    const emailLower = email.toLowerCase();
    if (seenEmails.has(emailLower)) {
      errors.push({
        row: rowNum,
        message: 'E-mail duplicado na lista.',
        suggestion: 'Cada membro deve ter um e-mail único. Remova a linha duplicada.',
      });
      continue;
    }
    seenEmails.add(emailLower);

    if (!name || name.length < 2) {
      errors.push({
        row: rowNum,
        message: 'Nome obrigatório está vazio ou tem menos de 2 caracteres.',
        suggestion: 'Preencha o nome completo do membro.',
      });
      continue;
    }

    let role: PartnerMemberRole | undefined;
    if (roleRaw) {
      const r = ROLES.find((x) => x === roleRaw.toUpperCase());
      if (!r) {
        errors.push({
          row: rowNum,
          message: `Função inválida: "${roleRaw}".`,
          suggestion: `Use uma das opções: ${ROLES.join(', ')}.`,
        });
        continue;
      }
      role = r;
    }

    data.push({
      email: emailLower,
      name,
      phone: phone || undefined,
      role,
    });
  }

  return {
    valid: errors.length === 0 && data.length > 0,
    errors,
    data,
  };
}

export default function PartnerMembersBulkScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [csvInputValue, setCsvInputValue] = useState('');
  const [csvText, setCsvText] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: ValidationError[];
    data: AddPartnerMemberBody[];
  } | null>(null);
  const [submitResult, setSubmitResult] = useState<{ created: number; errors: { row: number; message: string }[] } | null>(null);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      await Share.share({
        message: '\uFEFF' + CSV_TEMPLATE,
        title: 'membros_modelo.csv',
      });
    } catch (e) {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível abrir o compartilhamento.'));
    }
  }, []);

  const handleValidateAndContinue = useCallback(() => {
    const content = csvInputValue.trim();
    if (!content) {
      Alert.alert('Campo vazio', 'Cole o conteúdo do CSV (cabeçalho na primeira linha e uma linha por membro).');
      return;
    }
    setCsvText(content);
    const rows = parseCSV(content);
    const res = validateRows(rows);
    setValidationResult(res);
    setSubmitResult(null);
    setStep(2);
  }, [csvInputValue]);

  const bulkMutation = useMutation({
    mutationFn: (members: AddPartnerMemberBody[]) => bulkAddMyPartnerMembers({ members }),
    onSuccess: (result) => {
      setSubmitResult(result);
      setStep(4);
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'members'] });
    },
    onError: (err: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(err, 'Não foi possível importar os membros.'));
    },
  });

  const handleImport = useCallback(() => {
    if (!validationResult?.valid || validationResult.data.length === 0) return;
    bulkMutation.mutate(validationResult.data);
  }, [validationResult, bulkMutation]);

  const handleReset = useCallback(() => {
    setStep(1);
    setCsvInputValue('');
    setCsvText(null);
    setValidationResult(null);
    setSubmitResult(null);
  }, []);

  const handleBackToEdit = useCallback(() => {
    setStep(1);
    if (csvText) setCsvInputValue(csvText);
  }, [csvText]);

  const handleBack = useCallback(() => {
    if (step === 1) router.back();
    else if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
    else setStep(3);
  }, [step, router]);

  const surface = (colors as { surface?: string }).surface ?? '#f5f5f5';

  return (
    <ScreenContainer scroll={false}>
      <PartnerPanelLayout showHeader={false} showFooter={false}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Stepper indicator */}
          <View style={styles.stepperRow}>
            {[1, 2, 3, 4].map((s) => (
              <View
                key={s}
                style={[
                  styles.stepperDot,
                  { backgroundColor: step >= s ? colors.primary : colors.textSecondary + '40' },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.stepLabel, { color: colors.textSecondary }]}>
            {step === 1 && 'Colar lista de membros'}
            {step === 2 && 'Validar'}
            {step === 3 && 'Confirmar'}
            {step === 4 && 'Resultado'}
          </Text>

          {/* Step 1: Load CSV */}
          {step === 1 && (
            <View style={[styles.card, { backgroundColor: surface, borderColor: colors.primary + '30' }]}>
              <Text style={[styles.helpTitle, { color: colors.textPrimary }]}>Como adicionar os membros</Text>
              <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                Copie a lista de membros e cole no campo abaixo. Uma linha por membro; a primeira linha deve ser o cabeçalho (email,nome,telefone,funcao).
                {'\n\n'}
                <Text style={styles.bold}>Dica:</Text> Monte a lista em um editor de texto (Bloco de notas, Planilhas etc.), com um membro por linha. Depois copie tudo e cole aqui.
                {'\n\n'}
                <Text style={styles.bold}>Campos obrigatórios:</Text>
                {'\n'}• <Text style={styles.bold}>email</Text> – E-mail válido. O membro receberá o convite para definir a senha.
                {'\n'}• <Text style={styles.bold}>nome</Text> – Nome completo (mín. 2 caracteres).
                {'\n\n'}
                <Text style={styles.bold}>Opcionais:</Text>
                {'\n'}• <Text style={styles.bold}>telefone</Text> – Com DDD (ex: 11999999999).
                {'\n'}• <Text style={styles.bold}>funcao</Text> – VOLUNTARIO, COORDENADOR, CUIDADOR, RECEPCIONISTA, VETERINARIO, ADMINISTRATIVO ou OUTRO.
                {'\n\n'}
                Máximo de {BULK_MEMBERS_MAX} membros por vez.
              </Text>
              <TouchableOpacity
                style={[styles.templateBtn, { backgroundColor: colors.primary + '20', borderColor: colors.primary, marginBottom: spacing.md }]}
                onPress={handleDownloadTemplate}
              >
                <Ionicons name="download-outline" size={22} color={colors.primary} />
                <Text style={[styles.templateBtnText, { color: colors.primary }]}>Copiar modelo</Text>
              </TouchableOpacity>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Cole a lista abaixo (cabeçalho + uma linha por membro):</Text>
              <TextInput
                style={[styles.csvInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
                placeholder={'email,nome,telefone,funcao\nmembro@exemplo.org,Maria Silva,11999999999,VOLUNTARIO'}
                placeholderTextColor={colors.textSecondary}
                value={csvInputValue}
                onChangeText={setCsvInputValue}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
              <PrimaryButton title="Validar e continuar" onPress={handleValidateAndContinue} />
            </View>
          )}

          {/* Step 2: Validate */}
          {step === 2 && validationResult && (
            <View style={[styles.card, { backgroundColor: surface, borderColor: colors.primary + '30' }]}>
              {validationResult.errors.length > 0 ? (
                <>
                  <Text style={[styles.errorTitle, { color: colors.error || '#DC2626' }]}>
                    {validationResult.errors.length} erro(s) encontrado(s)
                  </Text>
                  <Text style={[styles.errorHint, { color: colors.textSecondary }]}>
                    Corrija o texto conforme as sugestões abaixo e valide novamente.
                  </Text>
                  <ScrollView style={styles.errorList} nestedScrollEnabled>
                    {validationResult.errors.map((err, idx) => (
                      <View key={idx} style={[styles.errorItem, { backgroundColor: (colors.error || '#DC2626') + '15' }]}>
                        <Text style={[styles.errorRow, { color: colors.textPrimary }]}>{err.row > 0 ? `Linha ${err.row}` : 'Geral'}</Text>
                        <Text style={[styles.errorMessage, { color: colors.error || '#DC2626' }]}>{err.message}</Text>
                        {err.suggestion && (
                          <Text style={[styles.errorSuggestion, { color: colors.textSecondary }]}>{err.suggestion}</Text>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                  <View style={styles.stepButtons}>
                    <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.textSecondary }]} onPress={handleBack}>
                      <Text style={{ color: colors.textSecondary }}>Voltar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.primary }]} onPress={handleBackToEdit}>
                      <Text style={{ color: colors.primary }}>Alterar lista</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={[styles.successText, { color: colors.primary }]}>
                    Lista válida. {validationResult.data.length} membro(s) serão importados.
                  </Text>
                  <View style={styles.stepButtons}>
                    <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.textSecondary }]} onPress={handleBack}>
                      <Text style={{ color: colors.textSecondary }}>Voltar</Text>
                    </TouchableOpacity>
                    <PrimaryButton title="Ver preview" onPress={() => setStep(3)} />
                  </View>
                </>
              )}
            </View>
          )}

          {/* Step 3: Preview */}
          {step === 3 && validationResult?.data && (
            <View style={[styles.card, { backgroundColor: surface, borderColor: colors.primary + '30' }]}>
              <Text style={[styles.previewTitle, { color: colors.textPrimary }]}>
                Preview – {validationResult.data.length} membro(s)
              </Text>
              <ScrollView style={styles.previewList} nestedScrollEnabled>
                {validationResult.data.map((m, idx) => (
                  <View key={idx} style={[styles.previewRow, { borderBottomColor: colors.primary + '20' }]}>
                    <Text style={[styles.previewName, { color: colors.textPrimary }]}>{m.name}</Text>
                    <Text style={[styles.previewEmail, { color: colors.textSecondary }]}>{m.email}</Text>
                    {m.role && (
                      <Text style={[styles.previewRole, { color: colors.textSecondary }]}>
                        {PARTNER_MEMBER_ROLE_LABELS[m.role]}
                      </Text>
                    )}
                  </View>
                ))}
              </ScrollView>
              <Text style={[styles.previewHint, { color: colors.textSecondary }]}>
                Cada membro receberá um e-mail para definir a senha de acesso ao app.
              </Text>
              <View style={styles.stepButtons}>
                <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.textSecondary }]} onPress={handleBack}>
                  <Text style={{ color: colors.textSecondary }}>Voltar</Text>
                </TouchableOpacity>
                <PrimaryButton
                  title="Importar"
                  onPress={handleImport}
                  loading={bulkMutation.isPending}
                  disabled={bulkMutation.isPending}
                />
              </View>
            </View>
          )}

          {/* Step 4: Result */}
          {step === 4 && submitResult && (
            <View style={[styles.card, { backgroundColor: surface, borderColor: colors.primary + '30' }]}>
              <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>Importação concluída</Text>
              <Text style={[styles.resultSummary, { color: colors.primary }]}>
                {submitResult.created} membro(s) adicionado(s).
              </Text>
              {submitResult.errors.length > 0 && (
                <>
                  <Text style={[styles.errorTitle, { color: colors.error || '#DC2626', marginTop: spacing.md }]}>
                    {submitResult.errors.length} linha(s) com erro
                  </Text>
                  <ScrollView style={styles.errorList} nestedScrollEnabled>
                    {submitResult.errors.map((err, idx) => (
                      <View key={idx} style={[styles.errorItem, { backgroundColor: (colors.error || '#DC2626') + '15' }]}>
                        <Text style={[styles.errorRow, { color: colors.textPrimary }]}>Linha {err.row}</Text>
                        <Text style={[styles.errorMessage, { color: colors.error || '#DC2626' }]}>{err.message}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </>
              )}
              <View style={styles.stepButtons}>
                <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.textSecondary }]} onPress={() => router.back()}>
                  <Text style={{ color: colors.textSecondary }}>Concluir</Text>
                </TouchableOpacity>
                <PrimaryButton title="Importar mais" onPress={handleReset} />
              </View>
            </View>
          )}
        </ScrollView>
      </PartnerPanelLayout>
      <ProfileMenuFooter />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  stepperRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.xs },
  stepperDot: { width: 10, height: 10, borderRadius: 5 },
  stepLabel: { fontSize: 14, fontWeight: '600', marginBottom: spacing.lg },
  card: {
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
  },
  helpTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.sm },
  helpText: { fontSize: 14, lineHeight: 22, marginBottom: spacing.lg },
  bold: { fontWeight: '600' },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: spacing.xs },
  csvInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    fontSize: 14,
    minHeight: 120,
    marginBottom: spacing.md,
  },
  templateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
  },
  templateBtnText: { fontSize: 16, fontWeight: '600' },
  errorTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.xs },
  errorHint: { fontSize: 14, marginBottom: spacing.md },
  errorList: { maxHeight: 220, marginBottom: spacing.md },
  errorItem: { padding: spacing.sm, borderRadius: 8, marginBottom: spacing.sm },
  errorRow: { fontSize: 13, fontWeight: '600' },
  errorMessage: { fontSize: 14, marginTop: 2 },
  errorSuggestion: { fontSize: 13, marginTop: 4, fontStyle: 'italic' },
  stepButtons: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap', marginTop: spacing.sm },
  secondaryBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    borderWidth: 1,
  },
  successText: { fontSize: 16, fontWeight: '600', marginBottom: spacing.md },
  previewTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.sm },
  previewList: { maxHeight: 240, marginBottom: spacing.sm },
  previewRow: { paddingVertical: spacing.sm, borderBottomWidth: 1 },
  previewName: { fontSize: 15, fontWeight: '600' },
  previewEmail: { fontSize: 14 },
  previewRole: { fontSize: 13, marginTop: 2 },
  previewHint: { fontSize: 13, fontStyle: 'italic', marginBottom: spacing.md },
  resultTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.xs },
  resultSummary: { fontSize: 16, fontWeight: '600' },
});
