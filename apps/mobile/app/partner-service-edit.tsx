import { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, PrimaryButton, LoadingLogo, PartnerPanelLayout } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { getMyPartnerServices, createPartnerService, updatePartnerService } from '../src/api/partner';
import { getFriendlyErrorMessage } from '../src/utils/errorMessage';
import { spacing } from '../src/theme';

export default function PartnerServiceEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const isEdit = !!params.id;
  const { data: services, isLoading } = useQuery({
    queryKey: ['me', 'partner', 'services'],
    queryFn: getMyPartnerServices,
  });
  const existing = isEdit ? (services ?? []).find((s) => s.id === params.id) : null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceDisplay, setPriceDisplay] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDescription(existing.description ?? '');
      setPriceDisplay(existing.priceDisplay ?? '');
      setValidUntil(existing.validUntil ? existing.validUntil.slice(0, 10) : '');
      setActive(existing.active);
    }
  }, [existing]);

  const createMutation = useMutation({
    mutationFn: createPartnerService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'services'] });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      router.back();
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível criar o serviço.')),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updatePartnerService>[1] }) => updatePartnerService(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'services'] });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      router.back();
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível atualizar o serviço.')),
  });

  const handleSave = () => {
    const nameTrim = name.trim();
    if (!nameTrim || nameTrim.length < 2) {
      Alert.alert('Campo obrigatório', 'Informe o nome do serviço (mín. 2 caracteres).');
      return;
    }
    if (isEdit && params.id) {
      updateMutation.mutate({
        id: params.id,
        body: {
          name: nameTrim,
          description: description.trim() || undefined,
          priceDisplay: priceDisplay.trim() || undefined,
          validUntil: validUntil.trim() || null,
          active,
        },
      });
    } else {
      createMutation.mutate({
        name: nameTrim,
        description: description.trim() || undefined,
        priceDisplay: priceDisplay.trim() || undefined,
        validUntil: validUntil.trim() || undefined,
      });
    }
  };

  if (isEdit && isLoading && !existing) {
    return (
      <ScreenContainer>
        <LoadingLogo size={120} />
      </ScreenContainer>
    );
  }

  const inputStyle = [styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }];
  const labelStyle = [styles.label, { color: colors.textSecondary }];

  return (
    <ScreenContainer scroll={false}>
      <PartnerPanelLayout>
        <ScrollView style={styles.scrollWrap} contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
        <Text style={labelStyle}>Nome do serviço *</Text>
        <TextInput style={inputStyle} placeholder="Ex: Banho e tosa" placeholderTextColor={colors.textSecondary} value={name} onChangeText={setName} />
        <Text style={labelStyle}>Preço ou valor (opcional)</Text>
        <TextInput style={inputStyle} placeholder="Ex: A partir de R$ 50 ou Sob consulta" placeholderTextColor={colors.textSecondary} value={priceDisplay} onChangeText={setPriceDisplay} />
        <Text style={labelStyle}>Validade (opcional, AAAA-MM-DD)</Text>
        <TextInput style={inputStyle} placeholder="2025-12-31" placeholderTextColor={colors.textSecondary} value={validUntil} onChangeText={setValidUntil} />
        <Text style={labelStyle}>Descrição (opcional)</Text>
        <TextInput style={[inputStyle, styles.textArea]} placeholder="Ex: Banho completo + tosa higiênica para cães" placeholderTextColor={colors.textSecondary} value={description} onChangeText={setDescription} multiline />
        {isEdit && (
          <TouchableOpacity style={styles.activeRow} onPress={() => setActive((a) => !a)}>
            <Text style={[styles.activeLabel, { color: colors.textPrimary }]}>Serviço ativo (visível no app)</Text>
            <View style={[styles.checkbox, { borderColor: active ? colors.primary : colors.textSecondary, backgroundColor: active ? colors.primary : 'transparent' }]}>
              {active ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
          </TouchableOpacity>
        )}
        <PrimaryButton
          title={isEdit ? (updateMutation.isPending ? 'Salvando...' : 'Salvar') : createMutation.isPending ? 'Criando...' : 'Cadastrar serviço'}
          onPress={handleSave}
          disabled={createMutation.isPending || updateMutation.isPending}
        />
        </ScrollView>
      </PartnerPanelLayout>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollWrap: { flex: 1 },
  form: { paddingBottom: spacing.xl, gap: spacing.sm },
  label: { fontSize: 14, fontWeight: '600', marginTop: spacing.sm },
  input: { padding: spacing.md, borderRadius: 12, borderWidth: 1, fontSize: 16 },
  textArea: { minHeight: 80, paddingTop: spacing.md },
  activeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  activeLabel: { fontSize: 16 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
