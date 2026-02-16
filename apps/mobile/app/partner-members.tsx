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
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, LoadingLogo, PartnerPanelLayout, ProfileMenuFooter, PrimaryButton } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import {
  getMyPartnerMembers,
  addMyPartnerMember,
  removeMyPartnerMember,
  type PartnerMember,
} from '../src/api/partner';
import { getFriendlyErrorMessage } from '../src/utils/errorMessage';
import { spacing } from '../src/theme';

export default function PartnerMembersScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const { data: members, isLoading } = useQuery({
    queryKey: ['me', 'partner', 'members'],
    queryFn: getMyPartnerMembers,
  });

  const addMutation = useMutation({
    mutationFn: (body: { email: string; name: string; phone?: string }) => addMyPartnerMember(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'members'] });
      setShowAdd(false);
      setEmail('');
      setName('');
      setPhone('');
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
      { email: e, name: n, phone: phone.trim() || undefined },
      {
        onError: (err: unknown) => {
          Alert.alert('Erro', getFriendlyErrorMessage(err, 'Não foi possível adicionar o membro.'));
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
                  </View>
                  <TouchableOpacity
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => handleRemove(item)}
                    style={styles.removeBtn}
                  >
                    <Ionicons name="person-remove-outline" size={22} color={colors.error || '#DC2626'} />
                  </TouchableOpacity>
                </View>
              )}
            />
          </ScrollView>
        </KeyboardAvoidingView>
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
  removeBtn: { padding: spacing.xs },
  empty: { paddingVertical: spacing.lg },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
