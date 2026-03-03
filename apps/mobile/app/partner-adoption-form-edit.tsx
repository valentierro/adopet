import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, PrimaryButton, SecondaryButton, LoadingLogo, PartnerPanelLayout } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import {
  getAdoptionFormTemplate,
  createAdoptionFormTemplate,
  updateAdoptionFormTemplate,
  type AdoptionFormTemplateWithQuestions,
  type AdoptionFormQuestionDto,
} from '../src/api/adoption-forms';
import { getFriendlyErrorMessage } from '../src/utils/errorMessage';
import { configureExpandAnimation } from '../src/utils/layoutAnimation';
import { QUESTION_LIBRARY, QUESTION_LIBRARY_CATEGORIES, FORM_TEMPLATES } from '../src/constants/adoption-form-library';
import { spacing } from '../src/theme';

const QUESTION_TYPES = [
  { value: 'TEXT', label: 'Texto curto' },
  { value: 'TEXTAREA', label: 'Texto longo' },
  { value: 'CHECKBOX', label: 'Caixa de seleção (Sim/Não)' },
  { value: 'SELECT_SINGLE', label: 'Seleção única' },
  { value: 'SELECT_MULTIPLE', label: 'Seleção múltipla' },
  { value: 'NUMBER', label: 'Número' },
  { value: 'DATE', label: 'Data' },
  { value: 'FILE', label: 'Arquivo' },
] as const;

const SCORABLE_TYPES = ['CHECKBOX', 'SELECT_SINGLE', 'SELECT_MULTIPLE', 'NUMBER'];

type QuestionDraft = {
  id: string;
  sortOrder: number;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  useForScoring?: boolean;
  weight?: number;
  scoringConfig?: Record<string, unknown>;
};

function toDraft(q: {
  id: string;
  sortOrder: number;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string | null;
  options?: unknown;
  useForScoring?: boolean;
  weight?: number;
  scoringConfig?: unknown;
}): QuestionDraft {
  return {
    id: q.id,
    sortOrder: q.sortOrder,
    type: q.type,
    label: q.label,
    required: q.required,
    placeholder: q.placeholder ?? undefined,
    options: Array.isArray(q.options)
      ? (q.options as Array<{ value: string; label: string }>).map((o) => ({
          value: String(o?.value ?? ''),
          label: String(o?.label ?? ''),
        }))
      : undefined,
    useForScoring: q.useForScoring ?? false,
    weight: q.weight ?? 5,
    scoringConfig: q.scoringConfig as Record<string, unknown> | undefined,
  };
}

function libraryToDraft(q: { type: string; label: string; required?: boolean; placeholder?: string; options?: Array<{ value: string; label: string }>; useForScoring?: boolean; weight?: number; scoringConfig?: Record<string, unknown> }, sortOrder: number): QuestionDraft {
  return {
    id: `lib-${Date.now()}-${sortOrder}`,
    sortOrder,
    type: q.type,
    label: q.label,
    required: q.required ?? true,
    placeholder: q.placeholder,
    options: q.options,
    useForScoring: q.useForScoring ?? false,
    weight: q.weight ?? 5,
    scoringConfig: q.scoringConfig,
  };
}

export default function PartnerAdoptionFormEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; template?: string }>();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const isEdit = !!params.id;
  const templateId = params.template;

  const [name, setName] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [optionsModal, setOptionsModal] = useState<{ index: number } | null>(null);
  const [optionsEdit, setOptionsEdit] = useState<Array<{ value: string; label: string }>>([]);
  const [scoringModal, setScoringModal] = useState<{ index: number } | null>(null);
  const [libraryModalVisible, setLibraryModalVisible] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedLibrarySections, setExpandedLibrarySections] = useState<Set<string>>(new Set());

  const { data: template, isLoading } = useQuery({
    queryKey: ['me', 'partner', 'adoption-form', params.id],
    queryFn: () => getAdoptionFormTemplate(params.id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (template) {
      setName(template.name);
      setQuestions(template.questions.map(toDraft));
    } else if (!isEdit) {
      const preset = templateId ? FORM_TEMPLATES.find((t) => t.id === templateId) : null;
      if (preset) {
        setName(preset.name);
        setQuestions(preset.questions.map((q, i) => libraryToDraft(q, i)));
      } else {
        setQuestions([]);
        setName('');
      }
    }
  }, [template, isEdit, templateId]);

  const addFromLibrary = (q: (typeof QUESTION_LIBRARY)[number]) => {
    const draft = libraryToDraft(q, questions.length);
    setQuestions((prev) => [...prev, draft]);
    setLibraryModalVisible(false);
  };

  const toggleLibrarySection = (cat: string) => {
    configureExpandAnimation();
    setExpandedLibrarySections((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  useEffect(() => {
    if (libraryModalVisible) setExpandedLibrarySections(new Set());
  }, [libraryModalVisible]);

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; questions: AdoptionFormQuestionDto[] }) =>
      createAdoptionFormTemplate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'adoption-forms'] });
      router.back();
    },
    onError: (e: unknown) =>
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível criar o formulário.')),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { name?: string; questions?: AdoptionFormQuestionDto[] }) =>
      updateAdoptionFormTemplate(params.id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'adoption-forms'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'adoption-form', params.id] });
      router.back();
    },
    onError: (e: unknown) =>
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível atualizar o formulário.')),
  });

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        sortOrder: prev.length,
        type: 'TEXT',
        label: '',
        required: true,
      },
    ]);
  };

  const updateQuestion = (index: number, patch: Partial<QuestionDraft>) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const removeQuestion = (index: number) => {
    Alert.alert('Remover pergunta', 'Deseja remover esta pergunta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => setQuestions((prev) => prev.filter((_, i) => i !== index)) },
    ]);
  };

  const moveQuestion = (index: number, dir: 'up' | 'down') => {
    const nextIndex = dir === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= questions.length) return;
    setQuestions((prev) => {
      const arr = [...prev];
      [arr[index], arr[nextIndex]] = [arr[nextIndex], arr[index]];
      return arr.map((q, i) => ({ ...q, sortOrder: i }));
    });
  };

  const openOptionsModal = (index: number) => {
    const q = questions[index];
    const opts = q.options && q.options.length > 0 ? [...q.options] : [{ value: '', label: '' }];
    setOptionsEdit(opts);
    setOptionsModal({ index });
  };

  const saveOptions = () => {
    if (optionsModal == null) return;
    const valid = optionsEdit.filter((o) => o.value.trim() && o.label.trim());
    updateQuestion(optionsModal.index, {
      options: valid.length > 0 ? valid : undefined,
    });
    setOptionsModal(null);
  };

  const openScoringModal = (index: number) => setScoringModal({ index });
  const closeScoringModal = () => setScoringModal(null);

  const payloadFromState = () => ({
    name: name.trim(),
    questions: questions.map((q, i) => ({
      sortOrder: i,
      type: q.type,
      label: q.label.trim(),
      required: q.required,
      placeholder: q.placeholder?.trim() || undefined,
      options:
        (q.type === 'SELECT_SINGLE' || q.type === 'SELECT_MULTIPLE') && q.options?.length
          ? q.options.filter((o) => o.value.trim() && o.label.trim())
          : undefined,
      useForScoring: q.useForScoring && SCORABLE_TYPES.includes(q.type) ? true : undefined,
      weight: q.useForScoring && q.weight != null ? q.weight : undefined,
      scoringConfig: q.useForScoring && q.scoringConfig ? q.scoringConfig : undefined,
    })),
  });

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      Alert.alert('Campo obrigatório', 'Informe o nome do formulário (mín. 2 caracteres).');
      return;
    }
    const invalidQuestion = questions.find((q) => !q.label.trim());
    if (invalidQuestion) {
      Alert.alert('Pergunta incompleta', 'Todas as perguntas devem ter um texto.');
      return;
    }
    const selectWithoutOptions = questions.find(
      (q) =>
        (q.type === 'SELECT_SINGLE' || q.type === 'SELECT_MULTIPLE') &&
        (!q.options?.length || !q.options.some((o) => o.value.trim() && o.label.trim())),
    );
    if (selectWithoutOptions) {
      Alert.alert(
        'Opções obrigatórias',
        'Perguntas de seleção única ou múltipla precisam de pelo menos uma opção.',
      );
      return;
    }

    const payload = payloadFromState();
    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isEdit && isLoading) {
    return (
      <ScreenContainer>
        <PartnerPanelLayout>
          <View style={styles.centered}>
            <LoadingLogo size={120} />
          </View>
        </PartnerPanelLayout>
      </ScreenContainer>
    );
  }

  const renderPreviewQuestion = (q: QuestionDraft) => {
    const baseInputStyle = [
      previewStyles.input,
      { backgroundColor: colors.surface, borderColor: colors.primary + '40', color: colors.textSecondary },
    ];
    switch (q.type) {
      case 'TEXT':
      case 'NUMBER':
      case 'DATE':
        return (
          <TextInput
            style={baseInputStyle}
            placeholder={q.placeholder || (q.type === 'DATE' ? 'AAAA-MM-DD' : '')}
            placeholderTextColor={colors.textSecondary + '99'}
            editable={false}
            value=""
          />
        );
      case 'TEXTAREA':
        return (
          <TextInput
            style={[baseInputStyle, previewStyles.textArea]}
            placeholder={q.placeholder || ''}
            placeholderTextColor={colors.textSecondary + '99'}
            editable={false}
            value=""
            multiline
            numberOfLines={4}
          />
        );
      case 'CHECKBOX':
        return (
          <View style={previewStyles.checkboxRow}>
            <Switch value={false} disabled trackColor={{ false: colors.textSecondary + '40', true: colors.primary + '80' }} />
            <Text style={[previewStyles.checkboxLabel, { color: colors.textPrimary }]}>Sim</Text>
          </View>
        );
      case 'SELECT_SINGLE':
      case 'SELECT_MULTIPLE':
        return (
          <View style={previewStyles.optionsWrap}>
            {(q.options ?? []).map((opt) => (
              <View
                key={opt.value}
                style={[
                  previewStyles.optionBtn,
                  { borderColor: colors.textSecondary + '50', backgroundColor: colors.surface },
                ]}
              >
                <Text style={[previewStyles.optionText, { color: colors.textPrimary }]}>{opt.label}</Text>
              </View>
            ))}
          </View>
        );
      case 'FILE':
        return (
          <View style={[previewStyles.fileHint, { backgroundColor: colors.primary + '12' }]}>
            <Ionicons name="document-attach-outline" size={24} color={colors.primary} />
            <Text style={[previewStyles.fileHintText, { color: colors.textSecondary }]}>
              Envie o arquivo por mensagem no chat após preencher o formulário.
            </Text>
          </View>
        );
      default:
        return (
          <TextInput style={baseInputStyle} placeholder={q.placeholder || ''} placeholderTextColor={colors.textSecondary + '99'} editable={false} value="" />
        );
    }
  };

  return (
    <ScreenContainer scroll={false}>
      <PartnerPanelLayout>
        <View style={[styles.modeTabs, { backgroundColor: colors.surface, borderColor: colors.primary + '30' }]}>
          <TouchableOpacity
            style={[styles.modeTab, !showPreview && { backgroundColor: colors.primary }]}
            onPress={() => setShowPreview(false)}
          >
            <Ionicons name="create-outline" size={18} color={showPreview ? colors.textSecondary : '#fff'} />
            <Text style={[styles.modeTabText, { color: showPreview ? colors.textSecondary : '#fff' }]}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, showPreview && { backgroundColor: colors.primary }]}
            onPress={() => setShowPreview(true)}
          >
            <Ionicons name="eye-outline" size={18} color={!showPreview ? colors.textSecondary : '#fff'} />
            <Text style={[styles.modeTabText, { color: !showPreview ? colors.textSecondary : '#fff' }]}>Visualizar</Text>
          </TouchableOpacity>
        </View>

        {showPreview ? (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
            <View style={[previewStyles.card, { backgroundColor: colors.surface }]}>
              <Text style={[previewStyles.title, { color: colors.textPrimary }]}>
                {name.trim() || 'Nome do formulário'}
              </Text>
              <Text style={[previewStyles.subtitle, { color: colors.textSecondary }]}>
                Preencha os campos abaixo. As informações serão enviadas para a ONG analisar sua solicitação de adoção.
              </Text>
              {questions.map((q) => (
                <View key={q.id} style={previewStyles.questionBlock}>
                  <View style={previewStyles.labelRow}>
                    <Text style={[previewStyles.label, { color: colors.textPrimary }]}>
                      {q.label || 'Pergunta'} {q.required ? '*' : ''}
                    </Text>
                    {q.useForScoring && (
                      <View style={[previewStyles.scoringBadge, { backgroundColor: colors.primary + '20' }]}>
                        <Ionicons name="analytics-outline" size={12} color={colors.primary} />
                        <Text style={[previewStyles.scoringBadgeText, { color: colors.primary }]}>Match Score</Text>
                      </View>
                    )}
                  </View>
                  {renderPreviewQuestion(q)}
                </View>
              ))}
              <View style={[previewStyles.consentWrap, { backgroundColor: colors.primary + '0c' }]}>
                <Switch value={false} disabled trackColor={{ false: colors.textSecondary + '40', true: colors.primary + '80' }} />
                <Text style={[previewStyles.consentText, { color: colors.textPrimary }]}>
                  Li e aceito o uso dos meus dados apenas para análise da solicitação de adoção pela ONG, em conformidade com a LGPD.
                </Text>
              </View>
              <View style={[previewStyles.submitBtn, { backgroundColor: colors.primary + '80' }]}>
                <Text style={previewStyles.submitBtnText}>Enviar formulário</Text>
              </View>
              <Text style={[previewStyles.previewHint, { color: colors.textSecondary }]}>
                Esta é a visualização do formulário como o interessado verá ao preencher.
              </Text>
            </View>
          </ScrollView>
        ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Nome do formulário</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary }]}
            value={name}
            onChangeText={setName}
            placeholder="Ex: Formulário padrão de adoção"
            placeholderTextColor={colors.textSecondary}
          />
          <View style={styles.questionsHeader}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Perguntas</Text>
            <View style={styles.questionsHeaderBtns}>
              <TouchableOpacity
                onPress={() => setLibraryModalVisible(true)}
                style={[styles.addQuestionBtn, styles.addQuestionBtnSecondary, { borderColor: colors.primary + '80' }]}
              >
                <Ionicons name="library-outline" size={18} color={colors.primary} />
                <Text style={[styles.addQuestionText, { color: colors.primary }]}>Da biblioteca</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addQuestion} style={[styles.addQuestionBtn, { borderColor: colors.primary }]}>
                <Ionicons name="add" size={18} color={colors.primary} />
                <Text style={[styles.addQuestionText, { color: colors.primary }]}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
          {questions.map((q, index) => (
            <View key={q.id} style={[styles.questionCard, { backgroundColor: colors.surface }]}>
              <View style={styles.questionHeader}>
                <Text style={[styles.questionIndex, { color: colors.textSecondary }]}>{index + 1}</Text>
                <View style={styles.questionActions}>
                  <TouchableOpacity
                    onPress={() => moveQuestion(index, 'up')}
                    disabled={index === 0}
                    style={[styles.moveBtn, index === 0 && { opacity: 0.4 }]}
                  >
                    <Ionicons name="chevron-up" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveQuestion(index, 'down')}
                    disabled={index === questions.length - 1}
                    style={[styles.moveBtn, index === questions.length - 1 && { opacity: 0.4 }]}
                  >
                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeQuestion(index)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={18} color={colors.error || '#DC2626'} />
                  </TouchableOpacity>
                </View>
              </View>
              <TextInput
                style={[styles.input, styles.questionInput, { backgroundColor: colors.background, color: colors.textPrimary }]}
                value={q.label}
                onChangeText={(t) => updateQuestion(index, { label: t })}
                placeholder="Texto da pergunta"
                placeholderTextColor={colors.textSecondary}
              />
              <View style={styles.questionRow}>
                <Text style={[styles.questionRowLabel, { color: colors.textSecondary }]}>Tipo</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                  {QUESTION_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t.value}
                      style={[
                        styles.typeChip,
                        { borderColor: q.type === t.value ? colors.primary : colors.textSecondary + '50' },
                        q.type === t.value && { backgroundColor: colors.primary + '20' },
                      ]}
                      onPress={() => updateQuestion(index, { type: t.value })}
                    >
                      <Text
                        style={[
                          styles.typeChipText,
                          { color: q.type === t.value ? colors.primary : colors.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              {q.type !== 'CHECKBOX' && q.type !== 'FILE' && (
                <TextInput
                  style={[styles.input, styles.placeholderInput, { backgroundColor: colors.background, color: colors.textPrimary }]}
                  value={q.placeholder ?? ''}
                  onChangeText={(t) => updateQuestion(index, { placeholder: t || undefined })}
                  placeholder="Placeholder (opcional)"
                  placeholderTextColor={colors.textSecondary}
                />
              )}
              {(q.type === 'SELECT_SINGLE' || q.type === 'SELECT_MULTIPLE') && (
                <TouchableOpacity
                  style={[styles.optionsBtn, { borderColor: colors.primary + '60' }]}
                  onPress={() => openOptionsModal(index)}
                >
                  <Ionicons name="list-outline" size={18} color={colors.primary} />
                  <Text style={[styles.optionsBtnText, { color: colors.primary }]}>
                    {q.options?.length ? `${q.options.length} opção(ões)` : 'Definir opções'}
                  </Text>
                </TouchableOpacity>
              )}
              {SCORABLE_TYPES.includes(q.type) && (
                <View style={[styles.scoringSection, { borderTopColor: colors.border }]}>
                  <View style={styles.scoringHeader}>
                    <Ionicons name="analytics-outline" size={18} color={colors.primary} />
                    <Text style={[styles.scoringLabel, { color: colors.textPrimary }]}>Match Score</Text>
                    <Switch
                      value={!!q.useForScoring}
                      onValueChange={(v) =>
                        updateQuestion(index, {
                          useForScoring: v,
                          weight: v ? (q.weight ?? 5) : undefined,
                          scoringConfig: v ? q.scoringConfig ?? (q.type === 'CHECKBOX' ? { true: 10, false: 0 } : {}) : undefined,
                        })
                      }
                      trackColor={{ false: colors.textSecondary + '40', true: colors.primary + '80' }}
                      thumbColor={q.useForScoring ? colors.primary : colors.textSecondary}
                    />
                  </View>
                  {q.useForScoring && (
                    <>
                      <View style={styles.scoringWeightRow}>
                        <Text style={[styles.scoringHint, { color: colors.textSecondary }]}>Peso (0-10)</Text>
                        <TextInput
                          style={[styles.weightInput, { backgroundColor: colors.background, color: colors.textPrimary }]}
                          value={String(q.weight ?? 5)}
                          onChangeText={(t) => {
                            const n = parseInt(t, 10);
                            if (!isNaN(n) && n >= 0 && n <= 10) updateQuestion(index, { weight: n });
                          }}
                          keyboardType="number-pad"
                          placeholder="5"
                          placeholderTextColor={colors.textSecondary}
                        />
                      </View>
                      {q.type === 'CHECKBOX' && (
                        <View style={styles.checkboxScoringRow}>
                          <Text style={[styles.scoringHint, { color: colors.textSecondary }]}>Sim</Text>
                          <TextInput
                            style={[styles.pointsInput, { backgroundColor: colors.background, color: colors.textPrimary }]}
                            value={String((q.scoringConfig as Record<string, number> | undefined)?.true ?? 10)}
                            onChangeText={(t) => {
                              const n = parseInt(t, 10);
                              const cfg = { ...(q.scoringConfig as Record<string, number> || {}), true: isNaN(n) ? 10 : n, false: (q.scoringConfig as Record<string, number> | undefined)?.false ?? 0 };
                              updateQuestion(index, { scoringConfig: cfg });
                            }}
                            keyboardType="number-pad"
                            placeholder="10"
                          />
                          <Text style={[styles.scoringHint, { color: colors.textSecondary }]}>Não</Text>
                          <TextInput
                            style={[styles.pointsInput, { backgroundColor: colors.background, color: colors.textPrimary }]}
                            value={String((q.scoringConfig as Record<string, number> | undefined)?.false ?? 0)}
                            onChangeText={(t) => {
                              const n = parseInt(t, 10);
                              const cfg = { ...(q.scoringConfig as Record<string, number> || {}), false: isNaN(n) ? 0 : n, true: (q.scoringConfig as Record<string, number> | undefined)?.true ?? 10 };
                              updateQuestion(index, { scoringConfig: cfg });
                            }}
                            keyboardType="number-pad"
                            placeholder="0"
                          />
                        </View>
                      )}
                      {(q.type === 'SELECT_SINGLE' || q.type === 'SELECT_MULTIPLE') && q.options?.length && (
                        <TouchableOpacity
                          style={[styles.scoringConfigBtn, { borderColor: colors.primary + '60' }]}
                          onPress={() => {
                            setScoringModal({ index });
                          }}
                        >
                          <Ionicons name="pricetag-outline" size={16} color={colors.primary} />
                          <Text style={[styles.scoringConfigBtnText, { color: colors.primary }]}>
                            Pontos por opção
                          </Text>
                        </TouchableOpacity>
                      )}
                      {q.type === 'NUMBER' && (
                        <Text style={[styles.scoringHint, { color: colors.textSecondary }]}>
                          Configure faixas via API ou use pontuação padrão.
                        </Text>
                      )}
                    </>
                  )}
                </View>
              )}
              {!SCORABLE_TYPES.includes(q.type) && (q.type === 'TEXT' || q.type === 'TEXTAREA') && (
                <Text style={[styles.nonScorableHint, { color: colors.textSecondary }]}>
                  Perguntas discursivas não entram no cálculo automático.
                </Text>
              )}
              <View style={[styles.requiredRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.requiredLabel, { color: colors.textSecondary }]}>Obrigatória</Text>
                <Switch
                  value={q.required}
                  onValueChange={(v) => updateQuestion(index, { required: v })}
                  trackColor={{ false: colors.textSecondary + '40', true: colors.primary + '80' }}
                  thumbColor={q.required ? colors.primary : colors.textSecondary}
                />
              </View>
            </View>
          ))}
          <View style={styles.footer}>
            <SecondaryButton title="Cancelar" onPress={() => router.back()} />
            <PrimaryButton
              title={isEdit ? 'Salvar' : 'Criar formulário'}
              onPress={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            />
          </View>
        </ScrollView>
        )}
      </PartnerPanelLayout>

      <Modal visible={!!optionsModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setOptionsModal(null)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Opções da pergunta</Text>
            <Text style={[styles.modalHint, { color: colors.textSecondary }]}>
              Valor (interno) e Label (exibido). Ex: value: "sim", label: "Sim"
            </Text>
            {optionsEdit.map((opt, i) => (
              <View key={i} style={styles.optionRow}>
                <TextInput
                  style={[styles.optionInput, { backgroundColor: colors.background, color: colors.textPrimary }]}
                  value={opt.value}
                  onChangeText={(t) =>
                    setOptionsEdit((prev) => {
                      const next = [...prev];
                      next[i] = { ...next[i], value: t };
                      return next;
                    })
                  }
                  placeholder="Valor"
                  placeholderTextColor={colors.textSecondary}
                />
                <TextInput
                  style={[styles.optionInput, { backgroundColor: colors.background, color: colors.textPrimary }]}
                  value={opt.label}
                  onChangeText={(t) =>
                    setOptionsEdit((prev) => {
                      const next = [...prev];
                      next[i] = { ...next[i], label: t };
                      return next;
                    })
                  }
                  placeholder="Label"
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity
                  onPress={() => setOptionsEdit((prev) => prev.filter((_, j) => j !== i))}
                  style={styles.optionRemove}
                >
                  <Ionicons name="close-circle" size={22} color={colors.error || '#DC2626'} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={[styles.addOptionBtn, { borderColor: colors.primary }]}
              onPress={() => setOptionsEdit((prev) => [...prev, { value: '', label: '' }])}
            >
              <Ionicons name="add" size={18} color={colors.primary} />
              <Text style={[styles.addOptionText, { color: colors.primary }]}>Adicionar opção</Text>
            </TouchableOpacity>
            <View style={styles.modalActions}>
              <SecondaryButton title="Cancelar" onPress={() => setOptionsModal(null)} />
              <PrimaryButton title="Salvar" onPress={saveOptions} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={libraryModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setLibraryModalVisible(false)}>
          <Pressable style={[styles.modalContent, styles.libraryModalContent, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Adicionar da biblioteca</Text>
            <Text style={[styles.modalHint, { color: colors.textSecondary, marginBottom: spacing.md }]}>
              Toque em uma pergunta para adicioná-la ao formulário.
            </Text>
            <ScrollView style={styles.libraryScroll} showsVerticalScrollIndicator>
              {QUESTION_LIBRARY_CATEGORIES.map((cat) => {
                const items = QUESTION_LIBRARY.filter((q) => q.category === cat);
                if (items.length === 0) return null;
                const isExpanded = expandedLibrarySections.has(cat);
                return (
                  <View key={cat} style={styles.libraryCategory}>
                    <TouchableOpacity
                      style={styles.libraryCategoryHeader}
                      onPress={() => toggleLibrarySection(cat)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.libraryCategoryTitle, { color: colors.primary }]}>{cat}</Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={22}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                    {isExpanded &&
                      items.map((q, i) => (
                        <TouchableOpacity
                          key={`${cat}-${i}`}
                          style={[styles.libraryItem, { backgroundColor: colors.background, borderColor: colors.primary + '30' }]}
                          onPress={() => addFromLibrary(q)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.libraryItemLabel, { color: colors.textPrimary }]} numberOfLines={2}>
                            {q.label}
                          </Text>
                          <Text style={[styles.libraryItemType, { color: colors.textSecondary }]}>
                            {QUESTION_TYPES.find((t) => t.value === q.type)?.label ?? q.type}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                );
              })}
            </ScrollView>
            <View style={styles.modalActions}>
              <SecondaryButton title="Fechar" onPress={() => setLibraryModalVisible(false)} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!scoringModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={closeScoringModal}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Pontos por opção</Text>
            <Text style={[styles.modalHint, { color: colors.textSecondary }]}>
              Define quantos pontos (0-10) cada opção vale no Match Score.
            </Text>
            {scoringModal != null &&
              questions[scoringModal.index]?.options?.map((opt, i) => {
                const cfg = questions[scoringModal.index].scoringConfig as Record<string, number> | undefined;
                const pts = cfg?.[opt.value];
                return (
                  <View key={i} style={styles.optionRow}>
                    <Text style={[styles.optionLabel, { color: colors.textPrimary }]} numberOfLines={1}>
                      {opt.label || opt.value || '—'}
                    </Text>
                    <TextInput
                      style={[styles.pointsInputWide, { backgroundColor: colors.background, color: colors.textPrimary }]}
                      value={pts !== undefined ? String(pts) : ''}
                      onChangeText={(t) => {
                        const n = parseInt(t, 10);
                        const q = questions[scoringModal.index];
                        const cfg2 = { ...(q.scoringConfig as Record<string, number> || {}), [opt.value]: isNaN(n) ? 0 : Math.min(10, Math.max(0, n)) };
                        updateQuestion(scoringModal.index, { scoringConfig: cfg2 });
                      }}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                );
              })}
            <View style={styles.modalActions}>
              <SecondaryButton title="Fechar" onPress={closeScoringModal} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modeTabs: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  modeTabText: { fontSize: 14, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xl },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  questionsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: spacing.sm, gap: spacing.sm },
  questionsHeaderBtns: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  addQuestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  addQuestionBtnSecondary: {},
  addQuestionText: { fontSize: 14, fontWeight: '600' },
  questionCard: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  questionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  questionIndex: { fontSize: 12, fontWeight: '700', marginRight: spacing.sm },
  questionActions: { flexDirection: 'row', marginLeft: 'auto', gap: 4 },
  moveBtn: { padding: 4 },
  deleteBtn: { padding: 4 },
  questionInput: { marginBottom: spacing.sm },
  questionRow: { marginBottom: spacing.sm },
  questionRowLabel: { fontSize: 12, marginBottom: 4 },
  typeScroll: { marginTop: 4 },
  typeChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  typeChipText: { fontSize: 13 },
  placeholderInput: { marginTop: 4 },
  optionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  optionsBtnText: { fontSize: 14, fontWeight: '500' },
  scoringSection: { paddingTop: spacing.sm, marginTop: spacing.sm, borderTopWidth: 1 },
  scoringHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  scoringLabel: { fontSize: 14, fontWeight: '600', flex: 1 },
  scoringWeightRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  scoringHint: { fontSize: 13 },
  weightInput: { width: 48, borderWidth: 1, borderRadius: 8, padding: 6, textAlign: 'center', fontSize: 14 },
  checkboxScoringRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  pointsInput: { width: 48, borderWidth: 1, borderRadius: 8, padding: 6, textAlign: 'center', fontSize: 14 },
  scoringConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  scoringConfigBtnText: { fontSize: 14, fontWeight: '500' },
  nonScorableHint: { fontSize: 12, fontStyle: 'italic', marginTop: 4 },
  optionLabel: { flex: 1, fontSize: 14 },
  pointsInputWide: { width: 64, borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 14 },
  requiredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  requiredLabel: { fontSize: 14 },
  footer: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  libraryModalContent: { maxHeight: '80%', width: '100%' },
  libraryScroll: { maxHeight: 280, marginBottom: spacing.md },
  libraryCategory: { marginBottom: spacing.lg },
  libraryCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  libraryCategoryTitle: { fontSize: 14, fontWeight: '700' },
  libraryItem: {
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  libraryItemLabel: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  libraryItemType: { fontSize: 12 },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: spacing.lg,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  modalHint: { fontSize: 13, marginBottom: spacing.md },
  optionRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' },
  optionInput: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 14 },
  optionRemove: { padding: 4 },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  addOptionText: { fontSize: 14, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
});

const previewStyles = StyleSheet.create({
  card: { margin: spacing.lg, padding: spacing.lg, borderRadius: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: spacing.sm },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: spacing.xl },
  questionBlock: { marginBottom: spacing.lg },
  labelRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: spacing.xs },
  label: { fontSize: 15, fontWeight: '600', flex: 1 },
  scoringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  scoringBadgeText: { fontSize: 11, fontWeight: '600' },
  input: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  textArea: { minHeight: 100, paddingTop: spacing.md },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkboxLabel: { flex: 1, fontSize: 15 },
  optionsWrap: { gap: spacing.sm },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionText: { fontSize: 15 },
  fileHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
  },
  fileHintText: { flex: 1, fontSize: 14 },
  consentWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.xl,
  },
  consentText: { flex: 1, fontSize: 13, lineHeight: 20 },
  submitBtn: { paddingVertical: spacing.md, borderRadius: 12, alignItems: 'center', marginBottom: spacing.sm },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  previewHint: { fontSize: 12, fontStyle: 'italic', textAlign: 'center' },
});
