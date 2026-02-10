import { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, PrimaryButton, LoadingLogo } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { getMyPartnerCoupons, createPartnerCoupon, updatePartnerCoupon } from '../src/api/partner';
import { getFriendlyErrorMessage } from '../src/utils/errorMessage';
import { spacing } from '../src/theme';

const DISCOUNT_TYPE_OPTIONS: { value: 'PERCENT' | 'FIXED'; label: string }[] = [
  { value: 'PERCENT', label: 'Percentual (%)' },
  { value: 'FIXED', label: 'Valor fixo (R$)' },
];

export default function PartnerCouponEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const isEdit = !!params.id;
  const { data: coupons, isLoading } = useQuery({
    queryKey: ['me', 'partner', 'coupons'],
    queryFn: getMyPartnerCoupons,
  });
  const existing = isEdit ? (coupons ?? []).find((c) => c.id === params.id) : null;

  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [discountValue, setDiscountValue] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (existing) {
      setCode(existing.code);
      setTitle(existing.title ?? '');
      setDescription(existing.description ?? '');
      setDiscountType((existing.discountType as 'PERCENT' | 'FIXED') || 'PERCENT');
      setDiscountValue(String(existing.discountValue));
      setValidUntil(existing.validUntil ? existing.validUntil.slice(0, 10) : '');
      setActive(existing.active);
    }
  }, [existing]);

  const createMutation = useMutation({
    mutationFn: createPartnerCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'coupons'] });
      router.back();
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível criar o cupom.')),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updatePartnerCoupon>[1] }) => updatePartnerCoupon(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'coupons'] });
      router.back();
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível atualizar o cupom.')),
  });

  const handleSave = () => {
    const codeTrim = code.trim().toUpperCase();
    if (!codeTrim || codeTrim.length < 2) {
      Alert.alert('Campo obrigatório', 'Informe o código do cupom (mín. 2 caracteres).');
      return;
    }
    const num = discountType === 'PERCENT' ? Math.round(parseFloat(discountValue) || 0) : Math.round((parseFloat(discountValue) || 0) * 100);
    if (num < 0 || (discountType === 'PERCENT' && num > 100)) {
      Alert.alert('Valor inválido', discountType === 'PERCENT' ? 'Percentual deve ser entre 0 e 100.' : 'Informe o valor em reais.');
      return;
    }
    if (isEdit && params.id) {
      updateMutation.mutate({
        id: params.id,
        body: { code: codeTrim, title: title.trim() || undefined, description: description.trim() || undefined, discountType, discountValue: num, validUntil: validUntil.trim() || null, active },
      });
    } else {
      createMutation.mutate({
        code: codeTrim,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        discountType,
        discountValue: num,
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
    <ScreenContainer scroll>
      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
        <Text style={labelStyle}>Código do cupom *</Text>
        <TextInput style={inputStyle} placeholder="Ex: ADOPET10" placeholderTextColor={colors.textSecondary} value={code} onChangeText={(t) => setCode(t.toUpperCase())} autoCapitalize="characters" />
        <Text style={labelStyle}>Título (exibido para o usuário)</Text>
        <TextInput style={inputStyle} placeholder="Ex: 10% em ração" placeholderTextColor={colors.textSecondary} value={title} onChangeText={setTitle} />
        <Text style={labelStyle}>Tipo de desconto</Text>
        <View style={styles.row}>
          {DISCOUNT_TYPE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.opt, { backgroundColor: discountType === opt.value ? colors.primary : colors.surface, borderColor: colors.primary + '40' }]}
              onPress={() => setDiscountType(opt.value)}
            >
              <Text style={[styles.optText, { color: discountType === opt.value ? '#fff' : colors.textPrimary }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={labelStyle}>{discountType === 'PERCENT' ? 'Percentual (0-100)' : 'Valor em reais (R$)'}</Text>
        <TextInput style={inputStyle} placeholder={discountType === 'PERCENT' ? '10' : '15.00'} placeholderTextColor={colors.textSecondary} value={discountValue} onChangeText={setDiscountValue} keyboardType="decimal-pad" />
        <Text style={labelStyle}>Validade (opcional, AAAA-MM-DD)</Text>
        <TextInput style={inputStyle} placeholder="2025-12-31" placeholderTextColor={colors.textSecondary} value={validUntil} onChangeText={setValidUntil} />
        <Text style={labelStyle}>Descrição (opcional)</Text>
        <TextInput style={[inputStyle, styles.textArea]} placeholder="Ex: Válido para compras acima de R$ 50" placeholderTextColor={colors.textSecondary} value={description} onChangeText={setDescription} multiline />
        {isEdit && (
          <TouchableOpacity style={styles.activeRow} onPress={() => setActive((a) => !a)}>
            <Text style={[styles.activeLabel, { color: colors.textPrimary }]}>Cupom ativo</Text>
            <View style={[styles.checkbox, { borderColor: active ? colors.primary : colors.textSecondary, backgroundColor: active ? colors.primary : 'transparent' }]}>
              {active ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
          </TouchableOpacity>
        )}
        <PrimaryButton
          title={isEdit ? (updateMutation.isPending ? 'Salvando...' : 'Salvar') : createMutation.isPending ? 'Criando...' : 'Criar cupom'}
          onPress={handleSave}
          disabled={createMutation.isPending || updateMutation.isPending}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  form: { paddingBottom: spacing.xl, gap: spacing.sm },
  label: { fontSize: 14, fontWeight: '600', marginTop: spacing.sm },
  input: { padding: spacing.md, borderRadius: 12, borderWidth: 1, fontSize: 16 },
  textArea: { minHeight: 80, paddingTop: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  opt: { flex: 1, paddingVertical: spacing.sm, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  optText: { fontSize: 14, fontWeight: '600' },
  activeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  activeLabel: { fontSize: 16 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
