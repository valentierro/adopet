import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, LoadingLogo, PartnerPanelLayout, ProfileMenuFooter, PrimaryButton } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import {
  getMyPartnerMembers,
  addMyPartnerMember,
  updateMyPartnerMember,
  removeMyPartnerMember,
  type PartnerMember,
  type PartnerMemberRole,
  PARTNER_MEMBER_ROLE_LABELS,
} from '../src/api/partner';
import { getFriendlyErrorMessage } from '../src/utils/errorMessage';
import { spacing } from '../src/theme';

const ROLE_OPTIONS: PartnerMemberRole[] = ['VOLUNTARIO', 'COORDENADOR', 'CUIDADOR', 'RECEPCIONISTA', 'VETERINARIO', 'ADMINISTRATIVO', 'OUTRO'];

export default function PartnerMembersScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [editingMember, setEditingMember] = useState<PartnerMember | null>(null);
  const [editRole, setEditRole] = useState<PartnerMemberRole | ''>('');
  const [showEditRolePicker, setShowEditRolePicker] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<PartnerMemberRole | ''>('');

  const { data: members, isLoading } = useQuery({
    queryKey: ['me', 'partner', 'members'],
    queryFn: getMyPartnerMembers,
  });

  const addMutation = useMutation({
    mutationFn: (body: { email: string; name: string; phone?: string; role?: PartnerMemberRole }) => addMyPartnerMember(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'members'] });
      setShowAdd(false);
      setEmail('');
      setName('');
      setPhone('');
      setRole('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ memberUserId, role }: { memberUserId: string; role?: PartnerMemberRole | '' }) =>
      updateMyPartnerMember(memberUserId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'members'] });
      setEditingMember(null);
      setEditRole('');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberUserId: string) => removeMyPartnerMember(memberUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'members'] });
    },
  });

  const handleAdd = () => {
    const e = email.trim();
    const n = name.trim();
    if (!e || !n) {
      Alert.alert('Preencha', 'E-mail e nome são obrigatórios.');
      return;
    }
    addMutation.mutate(
      {
        email: e,
        name: n,
        phone: phone.trim() || undefined,
        role: role || undefined,
      },
      {
        onError: (err: unknown) => {
          Alert.alert('Erro', getFriendlyErrorMessage(err, 'Não foi possível adicionar o membro.'));
        },
      },
    );
  };

  const handleEdit = (member: PartnerMember) => {
    setEditingMember(member);
    setEditRole((member.role as PartnerMemberRole) || '');
    setShowEditRolePicker(false);
  };

  const handleSaveEdit = () => {
    if (!editingMember) return;
    updateMutation.mutate(
      { memberUserId: editingMember.userId, role: editRole },
      {
        onError: (err: unknown) => {
          Alert.alert('Erro', getFriendlyErrorMessage(err, 'Não foi possível atualizar o membro.'));
        },
      },
    );
  };

  const handleRemove = (member: PartnerMember) => {
    Alert.alert(
      'Remover membro',
      `Desvincular ${member.name} da ONG? A conta do usuário no app não será excluída.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            removeMutation.mutate(member.userId, {
              onError: (err: unknown) => {
                Alert.alert('Erro', getFriendlyErrorMessage(err, 'Não foi possível remover.'));
              },
            });
          },
        },
      ],
    );
  };

  if (isLoading && !members) {
    return (
      <ScreenContainer>
        <LoadingLogo size={120} />
      </ScreenContainer>
    );
  }

  const surface = (colors as { surface?: string }).surface ?? '#f5f5f5';

  return (
    <ScreenContainer scroll={false}>
      <PartnerPanelLayout showFooter={false}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={80}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Membros da ONG</Text>
              <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                Pessoas vinculadas à sua ONG. Elas aparecem com badge no app e não acessam o portal do parceiro.
              </Text>
            </View>

            {showAdd ? (
              <View style={[styles.form, { backgroundColor: surface, borderColor: colors.primary + '40' }]}>
                <Text style={[styles.formTitle, { color: colors.textPrimary }]}>Adicionar membro</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
                  placeholder="E-mail"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
                  placeholder="Nome"
                  placeholderTextColor={colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                  autoComplete="name"
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
                  placeholder="Telefone (opcional)"
                  placeholderTextColor={colors.textSecondary}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
                <Text style={[styles.label, { color: colors.textSecondary }]}>Função na ONG</Text>
                <TouchableOpacity
                  style={[styles.rolePicker, { backgroundColor: colors.background, borderColor: colors.primary + '40' }]}
                  onPress={() => setShowRolePicker(true)}
                >
                  <Text style={[styles.rolePickerText, { color: role ? colors.textPrimary : colors.textSecondary }]}>
                    {role ? PARTNER_MEMBER_ROLE_LABELS[role] : 'Selecione (opcional)'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <Modal visible={showRolePicker} transparent animationType="fade">
                  <Pressable style={styles.roleModalOverlay} onPress={() => setShowRolePicker(false)}>
                    <Pressable style={[styles.roleModalContent, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
                      <Text style={[styles.roleModalTitle, { color: colors.textPrimary }]}>Função na ONG</Text>
                      {ROLE_OPTIONS.map((r) => (
                        <TouchableOpacity
                          key={r}
                          style={[styles.roleOption, role === r && { backgroundColor: colors.primary + '20' }]}
                          onPress={() => {
                            setRole(r);
                            setShowRolePicker(false);
                          }}
                        >
                          <Text style={[styles.roleOptionText, { color: colors.textPrimary }]}>{PARTNER_MEMBER_ROLE_LABELS[r]}</Text>
                          {role === r && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity style={styles.roleOption} onPress={() => { setRole(''); setShowRolePicker(false); }}>
                        <Text style={[styles.roleOptionText, { color: colors.textSecondary }]}>Nenhuma</Text>
                      </TouchableOpacity>
                    </Pressable>
                  </Pressable>
                </Modal>
                <View style={styles.formButtons}>
                  <TouchableOpacity
                    style={[styles.formBtn, { borderColor: colors.textSecondary }]}
                    onPress={() => setShowAdd(false)}
                  >
                    <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
                  </TouchableOpacity>
                  <PrimaryButton
                    title="Adicionar"
                    onPress={handleAdd}
                    loading={addMutation.isPending}
                    disabled={addMutation.isPending}
                  />
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '50' }]}
                onPress={() => setShowAdd(true)}
              >
                <Ionicons name="person-add-outline" size={22} color={colors.primary} />
                <Text style={[styles.addButtonText, { color: colors.primary }]}>Cadastrar membro</Text>
              </TouchableOpacity>
            )}

            <FlatList
              data={members ?? []}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {members?.length === 0 ? 'Nenhum membro ainda. Adicione pessoas da sua equipe.' : ''}
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={[styles.memberRow, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '30' }]}>
                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: colors.textPrimary }]}>{item.name}</Text>
                    <Text style={[styles.memberEmail, { color: colors.textSecondary }]}>{item.email}</Text>
                    {item.role && (
                      <Text style={[styles.memberRole, { color: colors.textSecondary }]}>
                        {PARTNER_MEMBER_ROLE_LABELS[item.role as PartnerMemberRole] ?? item.role}
                      </Text>
                    )}
                    <View style={styles.memberActions}>
                      <TouchableOpacity
                        style={[styles.memberActionBtn, { borderColor: colors.primary }]}
                        onPress={() => router.push({ pathname: '/partner-member-profile', params: { userId: item.userId, ownerName: item.name } })}
                      >
                        <Ionicons name="person-outline" size={16} color={colors.primary} />
                        <Text style={[styles.memberActionText, { color: colors.primary }]}>Perfil</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.memberActionBtn, { borderColor: colors.primary }]}
                        onPress={() => router.push({ pathname: '/owner-pets', params: { ownerId: item.userId, ownerName: item.name } })}
                      >
                        <Ionicons name="paw-outline" size={16} color={colors.primary} />
                        <Text style={[styles.memberActionText, { color: colors.primary }]}>Pets</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.rowActions}>
                    <TouchableOpacity
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => handleEdit(item)}
                      style={styles.rowActionBtn}
                    >
                      <Ionicons name="pencil-outline" size={22} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => handleRemove(item)}
                      style={styles.rowActionBtn}
                    >
                      <Ionicons name="person-remove-outline" size={22} color={colors.error || '#DC2626'} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          </ScrollView>
        </KeyboardAvoidingView>
        <Modal visible={!!editingMember} transparent animationType="fade">
          <Pressable style={styles.roleModalOverlay} onPress={() => { setEditingMember(null); setEditRole(''); }}>
            <Pressable
              style={[styles.roleModalContent, styles.editModalContent, { backgroundColor: colors.surface }]}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={[styles.roleModalTitle, { color: colors.textPrimary }]}>
                Editar membro{editingMember ? `: ${editingMember.name}` : ''}
              </Text>
              <Text style={[styles.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Função na ONG</Text>
              <TouchableOpacity
                style={[styles.rolePicker, { backgroundColor: colors.background, borderColor: colors.primary + '40' }]}
                onPress={() => setShowEditRolePicker(true)}
              >
                <Text style={[styles.rolePickerText, { color: editRole ? colors.textPrimary : colors.textSecondary }]}>
                  {editRole ? PARTNER_MEMBER_ROLE_LABELS[editRole] : 'Selecione (opcional)'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <Modal visible={showEditRolePicker} transparent animationType="fade">
                <Pressable style={styles.roleModalOverlay} onPress={() => setShowEditRolePicker(false)}>
                  <Pressable style={[styles.roleModalContent, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
                    <Text style={[styles.roleModalTitle, { color: colors.textPrimary }]}>Função na ONG</Text>
                    {ROLE_OPTIONS.map((r) => (
                      <TouchableOpacity
                        key={r}
                        style={[styles.roleOption, editRole === r && { backgroundColor: colors.primary + '20' }]}
                        onPress={() => {
                          setEditRole(r);
                          setShowEditRolePicker(false);
                        }}
                      >
                        <Text style={[styles.roleOptionText, { color: colors.textPrimary }]}>{PARTNER_MEMBER_ROLE_LABELS[r]}</Text>
                        {editRole === r && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={styles.roleOption} onPress={() => { setEditRole(''); setShowEditRolePicker(false); }}>
                      <Text style={[styles.roleOptionText, { color: colors.textSecondary }]}>Nenhuma</Text>
                    </TouchableOpacity>
                  </Pressable>
                </Pressable>
              </Modal>
              <View style={[styles.formButtons, { marginTop: spacing.md }]}>
                <TouchableOpacity
                  style={[styles.formBtn, { borderColor: colors.textSecondary }]}
                  onPress={() => { setEditingMember(null); setEditRole(''); }}
                >
                  <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
                </TouchableOpacity>
                <PrimaryButton
                  title="Salvar"
                  onPress={handleSaveEdit}
                  loading={updateMutation.isPending}
                  disabled={updateMutation.isPending}
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </PartnerPanelLayout>
      <ProfileMenuFooter />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xl },
  section: {
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.xs },
  sectionSub: { fontSize: 14, lineHeight: 20 },
  form: {
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  formTitle: { fontSize: 16, fontWeight: '600', marginBottom: spacing.md },
  label: { fontSize: 13, marginBottom: spacing.xs },
  rolePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  rolePickerText: { fontSize: 16 },
  roleModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  roleModalContent: {
    borderRadius: 12,
    padding: spacing.md,
    width: '100%',
    maxWidth: 340,
  },
  roleModalTitle: { fontSize: 16, fontWeight: '600', marginBottom: spacing.md },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
  },
  roleOptionText: { fontSize: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  formButtons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  formBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    borderWidth: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  addButtonText: { fontSize: 16, fontWeight: '600' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  memberEmail: { fontSize: 14 },
  memberRole: { fontSize: 12, marginTop: 2, fontStyle: 'italic' },
  memberActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  memberActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  memberActionText: { fontSize: 13, fontWeight: '500' },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowActionBtn: { padding: spacing.xs },
  editModalContent: { maxWidth: 360 },
  empty: { paddingVertical: spacing.lg },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
