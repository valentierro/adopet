import { useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert, Modal, Pressable, ScrollView } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, LoadingLogo, PartnerPanelLayout, Toast } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { useToastWithDedupe } from '../src/hooks/useToastWithDedupe';
import { listAdoptionFormTemplates, deactivateAdoptionFormTemplate, type AdoptionFormTemplateWithQuestions } from '../src/api/adoption-forms';
import { getFriendlyErrorMessage } from '../src/utils/errorMessage';
import { FORM_TEMPLATES } from '../src/constants/adoption-form-library';
import { spacing } from '../src/theme';

export default function PartnerAdoptionFormsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const { toastMessage, setToastMessage, showToast } = useToastWithDedupe();
  const [newFormModalVisible, setNewFormModalVisible] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<AdoptionFormTemplateWithQuestions | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['me', 'partner', 'adoption-forms'],
    queryFn: listAdoptionFormTemplates,
  });

  const deleteMutation = useMutation({
    mutationFn: deactivateAdoptionFormTemplate,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'adoption-forms'] });
      showToast(data.message);
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível excluir o formulário.'));
    },
  });

  const confirmDelete = (item: AdoptionFormTemplateWithQuestions) => {
    setDeleteConfirmItem(item);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmItem) {
      deleteMutation.mutate(deleteConfirmItem.id);
      setDeleteConfirmItem(null);
    }
  };

  const handleCancelDelete = () => setDeleteConfirmItem(null);

  const renderItem = ({ item }: { item: AdoptionFormTemplateWithQuestions }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={() => router.push({ pathname: '/partner-adoption-form-edit', params: { id: item.id } })}
      activeOpacity={0.7}
    >
      <View style={styles.cardRow}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="document-text-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            v{item.version} · {item.questions.length} pergunta{item.questions.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={(e) => {
            e.stopPropagation();
            confirmDelete(item);
          }}
          style={styles.deleteBtn}
          disabled={deleteMutation.isPending}
        >
          <Ionicons name="trash-outline" size={22} color={colors.error || '#DC2626'} />
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
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

  return (
    <ScreenContainer scroll={false}>
      <PartnerPanelLayout>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Formulários de adoção</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Crie e edite os formulários enviados aos interessados. Eles preenchem no app.
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => setNewFormModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.addBtnText}>Novo formulário</Text>
        </TouchableOpacity>
        <Modal visible={newFormModalVisible} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setNewFormModalVisible(false)}>
            <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Novo formulário</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Como deseja começar?</Text>
              <ScrollView style={styles.modalOptions} showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.modalOption, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setNewFormModalVisible(false);
                    router.push('/partner-adoption-form-intro');
                  }}
                >
                  <Ionicons name="document-outline" size={22} color={colors.primary} />
                  <View style={styles.modalOptionTextWrap}>
                    <Text style={[styles.modalOptionText, { color: colors.textPrimary }]}>Começar do zero</Text>
                    <Text style={[styles.modalOptionDesc, { color: colors.textSecondary }]}>
                      Crie do zero com perguntas da biblioteca
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
                {FORM_TEMPLATES.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.modalOption, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setNewFormModalVisible(false);
                      router.push({ pathname: '/partner-adoption-form-intro', params: { template: t.id } });
                    }}
                  >
                    <Ionicons
                      name={(t.icon || 'copy-outline') as keyof typeof Ionicons.glyphMap}
                      size={22}
                      color={colors.primary}
                    />
                    <View style={styles.modalOptionTextWrap}>
                      <View style={styles.modalOptionTitleRow}>
                        <Text style={[styles.modalOptionText, { color: colors.textPrimary }]}>{t.name}</Text>
                        {t.recommended ? (
                          <View style={[styles.recommendedBadge, { backgroundColor: colors.primary + '20' }]}>
                            <Text style={[styles.recommendedText, { color: colors.primary }]}>Recomendado</Text>
                          </View>
                        ) : null}
                      </View>
                      {t.description ? (
                        <Text style={[styles.modalOptionDesc, { color: colors.textSecondary }]}>
                          {t.description}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.background }]}
                onPress={() => setNewFormModalVisible(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
        <Modal visible={deleteConfirmItem != null} transparent animationType="fade">
          <Pressable style={styles.deleteModalOverlay} onPress={handleCancelDelete}>
            <Pressable style={[styles.deleteModalCard, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
              <Text style={[styles.deleteModalTitle, { color: colors.textPrimary }]}>Excluir formulário?</Text>
              <Text style={[styles.deleteModalMessage, { color: colors.textSecondary }]}>
                {deleteConfirmItem
                  ? `Excluir "${deleteConfirmItem.name}"? As solicitações em aberto com este formulário serão canceladas e os interessados serão notificados.`
                  : ''}
              </Text>
              <View style={styles.deleteModalActions}>
                <TouchableOpacity
                  style={[styles.deleteModalBtn, { borderColor: colors.textSecondary, backgroundColor: 'transparent', marginRight: spacing.sm }]}
                  onPress={handleCancelDelete}
                >
                  <Text style={[styles.deleteModalBtnText, { color: colors.textPrimary, fontWeight: '600' }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deleteModalBtn, { borderColor: colors.error || '#B91C1C', backgroundColor: (colors.error || '#B91C1C') + '18', flex: 1 }]}
                  onPress={handleConfirmDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <ActivityIndicator size="small" color={colors.error || '#B91C1C'} />
                  ) : (
                    <Text style={[styles.deleteModalBtnText, { color: colors.error || '#B91C1C', fontWeight: '600' }]}>Excluir</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
        <FlatList
          data={templates}
          keyExtractor={(t) => t.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Nenhum formulário. Crie um para enviar no chat.
              </Text>
            </View>
          }
        />
      </PartnerPanelLayout>
      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: spacing.md },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  list: { paddingBottom: spacing.xl },
  card: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  cardContent: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  meta: { fontSize: 13 },
  deleteBtn: { padding: spacing.xs, marginRight: spacing.xs },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: { fontSize: 15, marginTop: spacing.sm },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 16,
    padding: spacing.lg,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, marginBottom: spacing.md },
  modalOptions: { maxHeight: 320, marginBottom: spacing.md },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  modalOptionTextWrap: { flex: 1, minWidth: 0 },
  modalOptionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  modalOptionText: { fontSize: 16, fontWeight: '500' },
  modalOptionDesc: { fontSize: 12, marginTop: 2 },
  recommendedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recommendedText: { fontSize: 11, fontWeight: '600' },
  modalCancelBtn: {
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 16, fontWeight: '500' },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  deleteModalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: spacing.lg,
  },
  deleteModalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  deleteModalMessage: { fontSize: 14, lineHeight: 20, marginBottom: spacing.lg },
  deleteModalActions: { flexDirection: 'row', alignItems: 'center' },
  deleteModalBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  deleteModalBtnText: { fontSize: 16 },
});
