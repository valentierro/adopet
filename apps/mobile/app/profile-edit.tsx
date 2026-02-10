import { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, PrimaryButton, LoadingLogo } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { getMe, updateMe } from '../src/api/me';
import { getFriendlyErrorMessage } from '../src/utils/errorMessage';
import { spacing } from '../src/theme';

const HOUSING_OPTIONS = [
  { value: '' as const, label: 'Não informar' },
  { value: 'CASA' as const, label: 'Casa' },
  { value: 'APARTAMENTO' as const, label: 'Apartamento' },
];

const TIME_AT_HOME_OPTIONS = [
  { value: '' as const, label: 'Não informar' },
  { value: 'MOST_DAY' as const, label: 'Maior parte do dia' },
  { value: 'HALF_DAY' as const, label: 'Metade do dia' },
  { value: 'LITTLE' as const, label: 'Pouco tempo' },
];

export default function ProfileEditScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const { data: user, isLoading } = useQuery({ queryKey: ['me'], queryFn: getMe });
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [housingType, setHousingType] = useState<'CASA' | 'APARTAMENTO' | ''>('');
  const [hasYard, setHasYard] = useState<boolean | undefined>(undefined);
  const [hasOtherPets, setHasOtherPets] = useState<boolean | undefined>(undefined);
  const [hasChildren, setHasChildren] = useState<boolean | undefined>(undefined);
  const [timeAtHome, setTimeAtHome] = useState<string>('');

  useEffect(() => {
    if (user) {
      setName(user.name ?? '');
      setUsername((user as { username?: string }).username ?? '');
      setPhone(user.phone ?? '');
      setCity(user.city ?? '');
      setBio(user.bio ?? '');
      setHousingType((user.housingType as 'CASA' | 'APARTAMENTO') || '');
      setHasYard(user.hasYard);
      setHasOtherPets(user.hasOtherPets);
      setHasChildren(user.hasChildren);
      setTimeAtHome(user.timeAtHome ?? '');
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: (body: Parameters<typeof updateMe>[0]) => updateMe(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      router.back();
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível salvar.'));
    },
  });

  if (isLoading && !user) {
    return (
      <ScreenContainer>
        <View style={styles.loadingWrap}>
          <LoadingLogo size={160} />
        </View>
      </ScreenContainer>
    );
  }

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Informe seu nome.');
      return;
    }
    const userInput = username.trim().toLowerCase().replace(/^@/, '');
    updateMutation.mutate({
      name: name.trim(),
      username: userInput.length >= 2 ? userInput : undefined,
      phone: phone.trim() || undefined,
      city: city.trim() || undefined,
      bio: bio.trim() || undefined,
      housingType: housingType || undefined,
      hasYard: hasYard,
      hasOtherPets: hasOtherPets,
      hasChildren: hasChildren,
      timeAtHome: timeAtHome || undefined,
    });
  };

  return (
    <ScreenContainer scroll>
      <View style={styles.form}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Dados básicos</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
          placeholder="Nome"
          placeholderTextColor={colors.textSecondary}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
          placeholder="Nome de usuário (ex: maria.silva)"
          placeholderTextColor={colors.textSecondary}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Quem for indicar você como adotante poderá buscar por @nome. Apenas letras minúsculas, números, ponto ou underscore.
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
          placeholder="Telefone"
          placeholderTextColor={colors.textSecondary}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
          placeholder="Cidade"
          placeholderTextColor={colors.textSecondary}
          value={city}
          onChangeText={setCity}
          autoCapitalize="words"
        />
        <TextInput
          style={[styles.input, styles.bioInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
          placeholder="Sobre você (opcional)"
          placeholderTextColor={colors.textSecondary}
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={3}
        />

        <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: spacing.lg }]}>
          Informações para adoção (o anunciante pode ver para avaliar se você combina com o pet)
        </Text>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Tipo de moradia</Text>
        <View style={styles.chipRow}>
          {HOUSING_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value || 'none'}
              style={[styles.chip, { backgroundColor: housingType === opt.value ? colors.primary : colors.surface }]}
              onPress={() => setHousingType(opt.value)}
            >
              <Text style={[styles.chipText, { color: housingType === opt.value ? '#fff' : colors.textPrimary }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Tem quintal?</Text>
        <View style={styles.chipRow}>
          {[
            { value: undefined as boolean | undefined, label: 'Não informar' },
            { value: true, label: 'Sim' },
            { value: false, label: 'Não' },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.value === undefined ? 'na' : opt.value ? 'y' : 'n'}
              style={[styles.chip, { backgroundColor: hasYard === opt.value ? colors.primary : colors.surface }]}
              onPress={() => setHasYard(opt.value)}
            >
              <Text style={[styles.chipText, { color: hasYard === opt.value ? '#fff' : colors.textPrimary }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Tem outros pets?</Text>
        <View style={styles.chipRow}>
          {[
            { value: undefined as boolean | undefined, label: 'Não informar' },
            { value: true, label: 'Sim' },
            { value: false, label: 'Não' },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.value === undefined ? 'na' : opt.value ? 'y' : 'n'}
              style={[styles.chip, { backgroundColor: hasOtherPets === opt.value ? colors.primary : colors.surface }]}
              onPress={() => setHasOtherPets(opt.value)}
            >
              <Text style={[styles.chipText, { color: hasOtherPets === opt.value ? '#fff' : colors.textPrimary }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Tem crianças em casa?</Text>
        <View style={styles.chipRow}>
          {[
            { value: undefined as boolean | undefined, label: 'Não informar' },
            { value: true, label: 'Sim' },
            { value: false, label: 'Não' },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.value === undefined ? 'na' : opt.value ? 'y' : 'n'}
              style={[styles.chip, { backgroundColor: hasChildren === opt.value ? colors.primary : colors.surface }]}
              onPress={() => setHasChildren(opt.value)}
            >
              <Text style={[styles.chipText, { color: hasChildren === opt.value ? '#fff' : colors.textPrimary }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Quanto tempo passa em casa?</Text>
        <View style={styles.chipRowWrap}>
          {TIME_AT_HOME_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value || 'none'}
              style={[styles.chip, { backgroundColor: timeAtHome === opt.value ? colors.primary : colors.surface }]}
              onPress={() => setTimeAtHome(opt.value)}
            >
              <Text style={[styles.chipText, { color: timeAtHome === opt.value ? '#fff' : colors.textPrimary }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <PrimaryButton
          title={updateMutation.isPending ? 'Salvando...' : 'Salvar'}
          onPress={handleSave}
          disabled={updateMutation.isPending}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 160 },
  form: {
    gap: spacing.md,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  fieldLabel: {
    fontSize: 12,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chipRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  chipText: { fontSize: 14 },
  hint: { fontSize: 12, marginTop: -4, marginBottom: 4 },
  input: {
    padding: spacing.md,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
