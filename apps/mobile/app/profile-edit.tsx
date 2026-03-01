import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, PrimaryButton, LoadingLogo, ProfileMenuFooter, Toast } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { getMe, updateMe } from '../src/api/me';
import { presign, confirmAvatarUpload } from '../src/api/uploads';
import { getFriendlyErrorMessage } from '../src/utils/errorMessage';
import { formatPhoneInput, formatPhoneDisplay, getPhoneDigits } from '../src/utils/phoneMask';
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

const PETS_ALLOWED_OPTIONS = [
  { value: '' as const, label: 'Não informar' },
  { value: 'YES' as const, label: 'Sim' },
  { value: 'NO' as const, label: 'Não' },
  { value: 'UNSURE' as const, label: 'Não sei' },
];

const EXPERIENCE_OPTIONS = [
  { value: '' as const, label: 'Não informar' },
  { value: 'NEVER' as const, label: 'Nunca tive' },
  { value: 'HAD_BEFORE' as const, label: 'Já tive' },
  { value: 'HAVE_NOW' as const, label: 'Tenho atualmente' },
];

const HOUSEHOLD_AGREES_OPTIONS = [
  { value: '' as const, label: 'Não informar' },
  { value: 'YES' as const, label: 'Sim, todos concordam' },
  { value: 'DISCUSSING' as const, label: 'Ainda conversando' },
];

const ACTIVITY_LEVEL_OPTIONS = [
  { value: '' as const, label: 'Não informar' },
  { value: 'LOW' as const, label: 'Sedentário' },
  { value: 'MEDIUM' as const, label: 'Moderado' },
  { value: 'HIGH' as const, label: 'Ativo' },
];

const PREFERRED_PET_AGE_OPTIONS = [
  { value: '' as const, label: 'Não informar' },
  { value: 'ANY' as const, label: 'Qualquer' },
  { value: 'PUPPY' as const, label: 'Filhote' },
  { value: 'ADULT' as const, label: 'Adulto' },
  { value: 'SENIOR' as const, label: 'Idoso' },
];

const COMMITS_TO_VET_OPTIONS = [
  { value: '' as const, label: 'Não informar' },
  { value: 'YES' as const, label: 'Sim' },
  { value: 'NO' as const, label: 'Não' },
];

const WALK_FREQUENCY_OPTIONS = [
  { value: '' as const, label: 'Não informar' },
  { value: 'DAILY' as const, label: 'Diariamente' },
  { value: 'FEW_TIMES_WEEK' as const, label: 'Algumas vezes por semana' },
  { value: 'RARELY' as const, label: 'Raramente' },
  { value: 'NOT_APPLICABLE' as const, label: 'Não se aplica' },
];

const BUDGET_OPTIONS = [
  { value: '' as const, label: 'Não informar' },
  { value: 'LOW' as const, label: 'Até ~R$ 100/mês' },
  { value: 'MEDIUM' as const, label: '~R$ 100–300/mês' },
  { value: 'HIGH' as const, label: 'Acima de ~R$ 300/mês' },
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
  const [petsAllowedAtHome, setPetsAllowedAtHome] = useState<string>('');
  const [dogExperience, setDogExperience] = useState<string>('');
  const [catExperience, setCatExperience] = useState<string>('');
  const [householdAgreesToAdoption, setHouseholdAgreesToAdoption] = useState<string>('');
  const [whyAdopt, setWhyAdopt] = useState('');
  const [activityLevel, setActivityLevel] = useState<string>('');
  const [preferredPetAge, setPreferredPetAge] = useState<string>('');
  const [commitsToVetCare, setCommitsToVetCare] = useState<string>('');
  const [walkFrequency, setWalkFrequency] = useState<string>('');
  const [monthlyBudgetForPet, setMonthlyBudgetForPet] = useState<string>('');

  useEffect(() => {
    if (user) {
      const partnerCity = (user as { partner?: { city?: string } })?.partner?.city;
      setName(user.name ?? '');
      setUsername((user as { username?: string }).username ?? '');
      setPhone(formatPhoneDisplay(user.phone ?? ''));
      setCity(user.city ?? partnerCity ?? '');
      setBio(user.bio ?? '');
      setHousingType((user.housingType as 'CASA' | 'APARTAMENTO') || '');
      setHasYard(user.hasYard);
      setHasOtherPets(user.hasOtherPets);
      setHasChildren(user.hasChildren);
      setTimeAtHome(user.timeAtHome ?? '');
      setPetsAllowedAtHome(user.petsAllowedAtHome ?? '');
      setDogExperience(user.dogExperience ?? '');
      setCatExperience(user.catExperience ?? '');
      setHouseholdAgreesToAdoption(user.householdAgreesToAdoption ?? '');
      setWhyAdopt(user.whyAdopt ?? '');
      setActivityLevel((user as { activityLevel?: string }).activityLevel ?? '');
      setPreferredPetAge((user as { preferredPetAge?: string }).preferredPetAge ?? '');
      setCommitsToVetCare((user as { commitsToVetCare?: string }).commitsToVetCare ?? '');
      setWalkFrequency((user as { walkFrequency?: string }).walkFrequency ?? '');
      setMonthlyBudgetForPet((user as { monthlyBudgetForPet?: string }).monthlyBudgetForPet ?? '');
    }
  }, [user]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const updateMutation = useMutation({
    mutationFn: (body: Parameters<typeof updateMe>[0]) => updateMe(body),
    onSuccess: () => {
      setToastMessage('Perfil atualizado!');
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setTimeout(() => router.back(), 600);
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível salvar.'));
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (uri: string) => {
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `avatar.${ext === 'jpg' ? 'jpg' : ext}`;
      const { uploadUrl, key } = await presign(filename, `image/${ext === 'jpg' ? 'jpeg' : ext}`);
      const response = await fetch(uri);
      const blob = await response.blob();
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': blob.type || 'image/jpeg' },
      });
      if (!putRes.ok) throw new Error(`Upload falhou: ${putRes.status}`);
      return confirmAvatarUpload(key);
    },
    onSuccess: () => {
      setToastMessage('Foto atualizada!');
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (e: unknown) => {
      Alert.alert('Erro ao enviar foto', getFriendlyErrorMessage(e, 'Tente novamente.'));
    },
  });

  const pickAndUploadAvatar = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão', 'Precisamos acessar suas fotos para definir a foto de perfil.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    uploadAvatarMutation.mutate(result.assets[0].uri);
  }, [uploadAvatarMutation]);

  if (isLoading && !user) {
    return (
      <ScreenContainer>
        <View style={styles.loadingWrap}>
          <LoadingLogo size={160} />
        </View>
      </ScreenContainer>
    );
  }

  const isPartner = !!(user?.partner || (user as { partnerMemberships?: unknown[] })?.partnerMemberships?.length);
  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Informe seu nome.');
      return;
    }
    // Parceiros (ONG/comercial) só precisam de nome, foto e telefone; demais campos são opcionais
    if (!isPartner) {
      const missing: string[] = [];
      if (!housingType || housingType === '') missing.push('Tipo de moradia');
      if (hasYard === undefined) missing.push('Tem quintal?');
      if (hasOtherPets === undefined) missing.push('Tem outros pets?');
      if (hasChildren === undefined) missing.push('Tem crianças em casa?');
      if (!timeAtHome || timeAtHome === '') missing.push('Tempo em casa');
      if (!petsAllowedAtHome || petsAllowedAtHome === '') missing.push('Pets permitidos no local');
      if (!dogExperience || dogExperience === '') missing.push('Experiência com cachorro');
      if (!catExperience || catExperience === '') missing.push('Experiência com gato');
      if (!householdAgreesToAdoption || householdAgreesToAdoption === '') missing.push('Concordância em casa');
      if (!activityLevel || activityLevel === '') missing.push('Nível de atividade');
      if (!preferredPetAge || preferredPetAge === '') missing.push('Idade preferida do pet');
      if (!commitsToVetCare || commitsToVetCare === '') missing.push('Cuidados veterinários');
      if (!walkFrequency || walkFrequency === '') missing.push('Frequência de passeios');
      if (!monthlyBudgetForPet || monthlyBudgetForPet === '') missing.push('Orçamento mensal para o pet');
      if (missing.length > 0) {
        Alert.alert(
          'Campos obrigatórios',
          'Para o match score funcionar corretamente, preencha: ' + missing.join(', ') + '.',
        );
        return;
      }
    }
    const userInput = username.trim().toLowerCase().replace(/^@/, '');
    updateMutation.mutate({
      name: name.trim(),
      username: userInput.length >= 2 ? userInput : undefined,
      phone: getPhoneDigits(phone).trim() || undefined,
      city: city.trim() || undefined,
      bio: bio.trim() || undefined,
      housingType: housingType || undefined,
      hasYard,
      hasOtherPets,
      hasChildren,
      timeAtHome: timeAtHome || undefined,
      petsAllowedAtHome: petsAllowedAtHome || undefined,
      dogExperience: dogExperience || undefined,
      catExperience: catExperience || undefined,
      householdAgreesToAdoption: householdAgreesToAdoption || undefined,
      whyAdopt: whyAdopt.trim() || undefined,
      activityLevel: activityLevel || undefined,
      preferredPetAge: preferredPetAge || undefined,
      commitsToVetCare: commitsToVetCare || undefined,
      walkFrequency: walkFrequency || undefined,
      monthlyBudgetForPet: monthlyBudgetForPet || undefined,
    });
  };

  return (
    <ScreenContainer scroll>
      <View style={styles.form}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Foto do perfil</Text>
        <View style={styles.avatarRow}>
          <TouchableOpacity onPress={pickAndUploadAvatar} disabled={uploadAvatarMutation.isPending} style={styles.avatarTouch}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
                <Ionicons name="person" size={48} color={colors.textSecondary} />
              </View>
            )}
            {uploadAvatarMutation.isPending && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={[styles.avatarHint, { color: colors.textSecondary }]}>
            {user?.avatarUrl ? 'Toque para alterar a foto' : 'Adicione uma foto para completar seu perfil (obrigatório para publicar pets).'}
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: spacing.lg }]}>Dados básicos</Text>
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
          placeholder="(11) 98765-4321"
          placeholderTextColor={colors.textSecondary}
          value={phone}
          onChangeText={(t) => setPhone(formatPhoneInput(t))}
          keyboardType="phone-pad"
          maxLength={16}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
          placeholder={isPartner ? 'Cidade (vem do cadastro da ONG)' : 'Cidade'}
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
          Informações para adoção (obrigatórias para o match score)
        </Text>
        <Text style={[styles.hint, { color: colors.textSecondary, marginTop: -4 }]}>
          O anunciante pode ver estes dados para avaliar se você combina com o pet. Preencha todos para o match score funcionar.
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

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Pets são permitidos no local (condomínio/locador)?</Text>
        <View style={styles.chipRow}>
          {PETS_ALLOWED_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value || 'none'}
              style={[styles.chip, { backgroundColor: petsAllowedAtHome === opt.value ? colors.primary : colors.surface }]}
              onPress={() => setPetsAllowedAtHome(opt.value)}
            >
              <Text style={[styles.chipText, { color: petsAllowedAtHome === opt.value ? '#fff' : colors.textPrimary }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Experiência com cachorro</Text>
        <View style={styles.chipRowWrap}>
          {EXPERIENCE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value || 'none'}
              style={[styles.chip, { backgroundColor: dogExperience === opt.value ? colors.primary : colors.surface }]}
              onPress={() => setDogExperience(opt.value)}
            >
              <Text style={[styles.chipText, { color: dogExperience === opt.value ? '#fff' : colors.textPrimary }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Experiência com gato</Text>
        <View style={styles.chipRowWrap}>
          {EXPERIENCE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value || 'none'}
              style={[styles.chip, { backgroundColor: catExperience === opt.value ? colors.primary : colors.surface }]}
              onPress={() => setCatExperience(opt.value)}
            >
              <Text style={[styles.chipText, { color: catExperience === opt.value ? '#fff' : colors.textPrimary }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Todos em casa concordam com a adoção?</Text>
        <View style={styles.chipRow}>
          {HOUSEHOLD_AGREES_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value || 'none'}
              style={[styles.chip, { backgroundColor: householdAgreesToAdoption === opt.value ? colors.primary : colors.surface }]}
              onPress={() => setHouseholdAgreesToAdoption(opt.value)}
            >
              <Text style={[styles.chipText, { color: householdAgreesToAdoption === opt.value ? '#fff' : colors.textPrimary }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Seu nível de atividade (para match com energia do pet)</Text>
        <View style={styles.chipRowWrap}>
          {ACTIVITY_LEVEL_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value || 'none'}
              style={[styles.chip, { backgroundColor: activityLevel === opt.value ? colors.primary : colors.surface }]}
              onPress={() => setActivityLevel(opt.value)}
            >
              <Text style={[styles.chipText, { color: activityLevel === opt.value ? '#fff' : colors.textPrimary }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Idade preferida do pet</Text>
        <View style={styles.chipRowWrap}>
          {PREFERRED_PET_AGE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value || 'none'}
              style={[styles.chip, { backgroundColor: preferredPetAge === opt.value ? colors.primary : colors.surface }]}
              onPress={() => setPreferredPetAge(opt.value)}
            >
              <Text style={[styles.chipText, { color: preferredPetAge === opt.value ? '#fff' : colors.textPrimary }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Compromete-se com cuidados veterinários?</Text>
        <View style={styles.chipRow}>
          {COMMITS_TO_VET_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value || 'none'}
              style={[styles.chip, { backgroundColor: commitsToVetCare === opt.value ? colors.primary : colors.surface }]}
              onPress={() => setCommitsToVetCare(opt.value)}
            >
              <Text style={[styles.chipText, { color: commitsToVetCare === opt.value ? '#fff' : colors.textPrimary }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Com que frequência pode passear com o pet?</Text>
        <View style={styles.chipRowWrap}>
          {WALK_FREQUENCY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value || 'none'}
              style={[styles.chip, { backgroundColor: walkFrequency === opt.value ? colors.primary : colors.surface }]}
              onPress={() => setWalkFrequency(opt.value)}
            >
              <Text style={[styles.chipText, { color: walkFrequency === opt.value ? '#fff' : colors.textPrimary }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Orçamento mensal para o pet (para match com pets que têm gastos contínuos)</Text>
        <View style={styles.chipRowWrap}>
          {BUDGET_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value || 'none'}
              style={[styles.chip, { backgroundColor: monthlyBudgetForPet === opt.value ? colors.primary : colors.surface }]}
              onPress={() => setMonthlyBudgetForPet(opt.value)}
            >
              <Text style={[styles.chipText, { color: monthlyBudgetForPet === opt.value ? '#fff' : colors.textPrimary }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Por que quer adotar? (opcional)</Text>
        <TextInput
          style={[styles.input, styles.bioInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
          placeholder="Ex.: quero um companheiro para minha família, perdi meu pet e quero dar um novo lar..."
          placeholderTextColor={colors.textSecondary}
          value={whyAdopt}
          onChangeText={setWhyAdopt}
          multiline
          numberOfLines={3}
          maxLength={500}
        />

        <PrimaryButton
          title={updateMutation.isPending ? 'Salvando...' : 'Salvar'}
          onPress={handleSave}
          disabled={updateMutation.isPending}
        />
      </View>
      <ProfileMenuFooter />
      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 160 },
  form: {
    gap: spacing.md,
  },
  avatarRow: { alignItems: 'center', marginBottom: spacing.sm },
  avatarTouch: { position: 'relative', width: 96, height: 96 },
  avatarImg: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  avatarOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: { fontSize: 12, marginTop: spacing.sm, textAlign: 'center', paddingHorizontal: spacing.md },
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
