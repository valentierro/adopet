import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, PrimaryButton, SecondaryButton, PageIntro } from '../../src/components';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { getMe } from '../../src/api/me';
import { spacing } from '../../src/theme';
import { presign, confirmUpload } from '../../src/api/uploads';
import { createPet } from '../../src/api/pets';
import { getPartners } from '../../src/api/partners';
import { getFriendlyErrorMessage } from '../../src/utils/errorMessage';

const STEPS = ['Fotos', 'Detalhes', 'Saúde', 'Descrição', 'Publicar'];

/** Opções padronizadas para relatórios futuros */
const ADOPTION_REASON_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Não informar' },
  { value: 'MUDANCA', label: 'Mudança de cidade' },
  { value: 'ALERGIA', label: 'Alergia na família' },
  { value: 'FALTA_TEMPO', label: 'Falta de tempo' },
  { value: 'MUITOS_PETS', label: 'Número de pets em casa' },
  { value: 'SAUDE', label: 'Problemas de saúde' },
  { value: 'OUTRO', label: 'Outro' },
];

const AGE_PRESETS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 18, 20, 25, 30];

/** Raças comuns para select (relatórios); lista por espécie */
const BREED_OPTIONS_DOG: { value: string; label: string }[] = [
  { value: 'SRD', label: 'SRD (vira-lata)' },
  { value: 'LABRADOR', label: 'Labrador' },
  { value: 'GOLDEN', label: 'Golden Retriever' },
  { value: 'POODLE', label: 'Poodle' },
  { value: 'BULLDOG_FRANCES', label: 'Bulldog Francês' },
  { value: 'PIT_BULL', label: 'Pit Bull' },
  { value: 'PASTOR_ALEMAO', label: 'Pastor Alemão' },
  { value: 'YORKSHIRE', label: 'Yorkshire' },
  { value: 'SHIH_TZU', label: 'Shih Tzu' },
  { value: 'DACHSHUND', label: 'Dachshund' },
  { value: 'BEAGLE', label: 'Beagle' },
  { value: 'ROTTWEILER', label: 'Rottweiler' },
  { value: 'OUTRA', label: 'Outra' },
];

const BREED_OPTIONS_CAT: { value: string; label: string }[] = [
  { value: 'SRD', label: 'SRD (vira-lata)' },
  { value: 'PERSA', label: 'Persa' },
  { value: 'SIAMES', label: 'Siamês' },
  { value: 'MAINE_COON', label: 'Maine Coon' },
  { value: 'ANGORA', label: 'Angorá' },
  { value: 'BRITISH', label: 'British Shorthair' },
  { value: 'SPHYNX', label: 'Sphynx' },
  { value: 'RAGDOLL', label: 'Ragdoll' },
  { value: 'OUTRA', label: 'Outra' },
];

type FormData = {
  name: string;
  species: 'dog' | 'cat';
  breed: string;
  breedPreset: string;
  age: string;
  sex: 'male' | 'female';
  size: 'small' | 'medium' | 'large' | 'xlarge';
  vaccinated: boolean;
  neutered: boolean;
  description: string;
  adoptionReason: string;
  adoptionReasonPreset: string;
  partnerId: string;
};

const INITIAL_FORM: FormData = {
  name: '',
  species: 'dog',
  breed: '',
  breedPreset: '',
  age: '',
  sex: 'male',
  size: 'medium',
  vaccinated: false,
  neutered: false,
  description: '',
  adoptionReason: '',
  adoptionReasonPreset: '',
  partnerId: '',
};

export default function AddPetWizardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: getMe });
  const { data: partners = [] } = useQuery({
    queryKey: ['partners', 'ONG'],
    queryFn: () => getPartners('ONG'),
    staleTime: 5 * 60_000,
  });
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [uploadedKeys, setUploadedKeys] = useState<{ key: string; isPrimary: boolean }[]>([]);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pickImages = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão', 'Precisamos acessar suas fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled) return;
    const uris = result.assets.map((a) => a.uri);
    setImageUris((prev) => [...prev, ...uris].slice(0, 10));
  }, []);

  const removeImage = useCallback((index: number) => {
    setImageUris((prev) => prev.filter((_, i) => i !== index));
    setUploadedKeys((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveImage = useCallback((index: number, direction: 'up' | 'down') => {
    setImageUris((prev) => {
      const next = [...prev];
      const j = direction === 'up' ? index - 1 : index + 1;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
    setUploadedKeys((prev) => {
      const next = [...prev];
      const j = direction === 'up' ? index - 1 : index + 1;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }, []);

  const uploadImages = useCallback(async (): Promise<boolean> => {
    if (imageUris.length === 0) return true;
    setUploading(true);
    const keys: { key: string; isPrimary: boolean }[] = [];
    try {
      for (let i = 0; i < imageUris.length; i++) {
        const uri = imageUris[i];
        const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
        const filename = `photo-${i}.${ext === 'jpg' ? 'jpg' : ext}`;
        const { uploadUrl, key } = await presign(filename, `image/${ext === 'jpg' ? 'jpeg' : ext}`);
        const response = await fetch(uri);
        const blob = await response.blob();
        const putRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: blob,
          headers: { 'Content-Type': blob.type || 'image/jpeg' },
        });
        if (!putRes.ok) throw new Error(`Upload falhou: ${putRes.status}`);
        keys.push({ key, isPrimary: i === 0 });
      }
      setUploadedKeys(keys);
      return true;
    } catch (e: unknown) {
      Alert.alert('Falha ao enviar fotos', getFriendlyErrorMessage(e, 'Tente novamente ou use outras imagens.'));
      return false;
    } finally {
      setUploading(false);
    }
  }, [imageUris]);

  const handleNext = useCallback(async () => {
    if (step === 0) {
      if (imageUris.length === 0) {
        Alert.alert('Fotos obrigatórias', 'Adicione pelo menos uma foto do pet para continuar.');
        return;
      }
      const ok = await uploadImages();
      if (!ok) return;
    }
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  }, [step, imageUris.length, uploadImages]);

  const handleSubmit = useCallback(async () => {
    if (!user?.avatarUrl || !user?.phone) {
      Alert.alert(
        'Complete seu perfil',
        'Para publicar um pet é preciso ter foto e telefone no perfil. Você será levado à página de edição, onde pode adicionar a foto do perfil e preencher todos os dados de uma vez. Depois, volte aqui e publique o pet.',
        [{ text: 'Completar perfil', onPress: () => router.push('/profile-edit') }],
      );
      return;
    }
    const age = parseInt(form.age, 10);
    if (!form.name.trim()) {
      Alert.alert('Erro', 'Informe o nome do pet.');
      return;
    }
    if (isNaN(age) || age < 0 || age > 30) {
      Alert.alert('Erro', 'Idade entre 0 e 30.');
      return;
    }
    if (form.description.trim().length < 10) {
      Alert.alert('Erro', 'Descrição com pelo menos 10 caracteres.');
      return;
    }
    if (uploadedKeys.length === 0) {
      Alert.alert(
        'Fotos obrigatórias',
        'É necessário adicionar pelo menos uma foto do pet para publicar o anúncio.',
      );
      return;
    }
    setSubmitting(true);
    try {
      const pet = await createPet({
        name: form.name.trim(),
        species: form.species,
        ...(form.breed.trim() && { breed: form.breed.trim() }),
        age,
        sex: form.sex,
        size: form.size,
        vaccinated: form.vaccinated,
        neutered: form.neutered,
        description: form.description.trim(),
        ...(form.adoptionReason.trim() && { adoptionReason: form.adoptionReason.trim() }),
        ...(form.partnerId.trim() && { partnerId: form.partnerId }),
      });
      for (let i = 0; i < uploadedKeys.length; i++) {
        await confirmUpload({
          petId: pet.id,
          key: uploadedKeys[i].key,
          isPrimary: uploadedKeys[i].isPrimary,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['pets', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'tutor-stats'] });
      queryClient.refetchQueries({ queryKey: ['pets', 'mine'] });
      setForm(INITIAL_FORM);
      setStep(0);
      setUploadedKeys([]);
      setImageUris([]);
      Alert.alert(
        'Anúncio enviado para moderação',
        'Seu anúncio será analisado pela nossa equipe. Pode levar até 48 horas para ser aprovado e aparecer no feed. Você pode acompanhar em "Meus anúncios".',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/add-pet') }],
      );
    } catch (e: unknown) {
      Alert.alert('Não foi possível cadastrar o pet', getFriendlyErrorMessage(e, 'Tente novamente em instantes.'));
    } finally {
      setSubmitting(false);
    }
  }, [form, uploadedKeys, router, user]);

  const prev = () => setStep((s) => Math.max(0, s - 1));

  return (
    <ScreenContainer scroll>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <PageIntro
          title="Anunciar pet"
          subtitle="Preencha os dados para publicar um pet para adoção."
        />
        <Text style={[styles.stepLabel, { color: colors.textSecondary }]}>
          Passo {step + 1} de {STEPS.length}: {STEPS[step]}
        </Text>

        {step === 0 && (
          <View style={styles.photoStep}>
            <PrimaryButton title="Escolher fotos" onPress={pickImages} disabled={uploading} />
            {imageUris.length > 0 && (
              <ScrollView horizontal style={styles.thumbs} showsHorizontalScrollIndicator={false}>
                {imageUris.map((uri, i) => (
                  <View key={i} style={styles.thumbWrap}>
                    <Image source={{ uri }} style={styles.thumb} />
                    <TouchableOpacity
                      style={[styles.removeThumb, { backgroundColor: colors.error || '#c00' }]}
                      onPress={() => removeImage(i)}
                    >
                      <Text style={styles.removeThumbText}>×</Text>
                    </TouchableOpacity>
                    {imageUris.length > 1 && (
                      <View style={styles.reorderRow}>
                        <TouchableOpacity
                          style={[styles.reorderBtn, { backgroundColor: colors.surface }]}
                          onPress={() => moveImage(i, 'up')}
                          disabled={i === 0}
                        >
                          <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>↑</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.reorderBtn, { backgroundColor: colors.surface }]}
                          onPress={() => moveImage(i, 'down')}
                          disabled={i === imageUris.length - 1}
                        >
                          <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>↓</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {i === 0 && (
                      <View style={[styles.primaryBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.primaryBadgeText}>Principal</Text>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
            {uploading && (
              <View style={styles.uploading}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.uploadingText, { color: colors.textSecondary }]}>
                  Enviando fotos...
                </Text>
              </View>
            )}
          </View>
        )}

        {step === 1 && (
          <View style={styles.form}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Nome</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary }]}
              value={form.name}
              onChangeText={(name) => setForm((f) => ({ ...f, name }))}
              placeholder="Ex: Rex"
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Espécie</Text>
            <View style={styles.row}>
              {(['dog', 'cat'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.chip,
                    { backgroundColor: form.species === s ? colors.primary : colors.surface },
                  ]}
                  onPress={() =>
                    setForm((f) =>
                      f.species === s ? { ...f, species: s } : { ...f, species: s, breed: '', breedPreset: '' },
                    )
                  }
                >
                  <Text style={{ color: form.species === s ? '#fff' : colors.textPrimary }}>
                    {s === 'dog' ? 'Cachorro' : 'Gato'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Idade (anos)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.agePresets}>
              {AGE_PRESETS.map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.chip,
                    { backgroundColor: form.age === String(n) ? colors.primary : colors.surface },
                  ]}
                  onPress={() => setForm((f) => ({ ...f, age: String(n) }))}
                >
                  <Text style={{ color: form.age === String(n) ? '#fff' : colors.textPrimary }}>
                    {n === 0 ? '0 (filhote)' : n}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary }]}
              value={form.age}
              onChangeText={(age) => setForm((f) => ({ ...f, age }))}
              keyboardType="number-pad"
              placeholder="Ou digite (0 a 30)"
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Sexo</Text>
            <View style={styles.row}>
              {(['male', 'female'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.chip,
                    { backgroundColor: form.sex === s ? colors.primary : colors.surface },
                  ]}
                  onPress={() => setForm((f) => ({ ...f, sex: s }))}
                >
                  <Text style={{ color: form.sex === s ? '#fff' : colors.textPrimary }}>
                    {s === 'male' ? 'Macho' : 'Fêmea'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Porte</Text>
            <View style={styles.rowWrap}>
              {(['small', 'medium', 'large', 'xlarge'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.chip,
                    { backgroundColor: form.size === s ? colors.primary : colors.surface },
                  ]}
                  onPress={() => setForm((f) => ({ ...f, size: s }))}
                >
                  <Text style={{ color: form.size === s ? '#fff' : colors.textPrimary }}>
                    {s === 'small' ? 'P' : s === 'medium' ? 'M' : s === 'large' ? 'G' : 'GG'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Raça (opcional)</Text>
            <View style={styles.rowWrap}>
              {(form.species === 'dog' ? BREED_OPTIONS_DOG : BREED_OPTIONS_CAT)
                .filter((o) => o.value !== 'OUTRA')
                .map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.chip,
                      { backgroundColor: form.breedPreset === opt.value ? colors.primary : colors.surface },
                    ]}
                    onPress={() =>
                      setForm((f) => ({
                        ...f,
                        breedPreset: opt.value,
                        breed: opt.label,
                      }))
                    }
                  >
                    <Text
                      style={{
                        color: form.breedPreset === opt.value ? '#fff' : colors.textPrimary,
                        fontSize: 13,
                      }}
                      numberOfLines={1}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              <TouchableOpacity
                style={[
                  styles.chip,
                  { backgroundColor: form.breedPreset === 'OUTRA' ? colors.primary : colors.surface },
                ]}
                onPress={() =>
                  setForm((f) => ({ ...f, breedPreset: 'OUTRA', breed: f.breedPreset === 'OUTRA' ? f.breed : '' }))
                }
              >
                <Text style={{ color: form.breedPreset === 'OUTRA' ? '#fff' : colors.textPrimary, fontSize: 13 }}>
                  Outra
                </Text>
              </TouchableOpacity>
            </View>
            {form.breedPreset === 'OUTRA' && (
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, marginTop: spacing.sm }]}
                value={form.breed}
                onChangeText={(breed) => setForm((f) => ({ ...f, breed }))}
                placeholder="Digite a raça"
                placeholderTextColor={colors.textSecondary}
              />
            )}
          </View>
        )}

        {step === 2 && (
          <View style={styles.form}>
            <View style={[styles.switchRow, { borderBottomColor: colors.surface }]}>
              <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Vacinado</Text>
              <Switch
                value={form.vaccinated}
                onValueChange={(vaccinated) => setForm((f) => ({ ...f, vaccinated }))}
                trackColor={{ false: colors.textSecondary, true: colors.primary }}
              />
            </View>
            <View style={[styles.switchRow, { borderBottomColor: colors.surface }]}>
              <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Castrado</Text>
              <Switch
                value={form.neutered}
                onValueChange={(neutered) => setForm((f) => ({ ...f, neutered }))}
                trackColor={{ false: colors.textSecondary, true: colors.primary }}
              />
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.form}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Descrição</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: colors.surface, color: colors.textPrimary },
              ]}
              value={form.description}
              onChangeText={(description) => setForm((f) => ({ ...f, description }))}
              placeholder="Conte um pouco sobre o pet (mín. 10 caracteres)"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
            />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Por que está doando? (opcional)</Text>
            <View style={styles.rowWrap}>
              {ADOPTION_REASON_OPTIONS.filter((o) => o.value !== 'OUTRO').map((opt) => (
                <TouchableOpacity
                  key={opt.value || 'none'}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        (opt.value ? form.adoptionReasonPreset === opt.value : form.adoptionReasonPreset === '') && form.adoptionReasonPreset !== 'OUTRO'
                          ? colors.primary
                          : colors.surface,
                    },
                  ]}
                  onPress={() =>
                    setForm((f) => ({
                      ...f,
                      adoptionReasonPreset: opt.value,
                      adoptionReason: opt.value ? (ADOPTION_REASON_OPTIONS.find((x) => x.value === opt.value)?.label ?? '') : '',
                    }))
                  }
                >
                  <Text
                    style={{
                      color:
                        (opt.value ? form.adoptionReasonPreset === opt.value : form.adoptionReasonPreset === '') && form.adoptionReasonPreset !== 'OUTRO'
                          ? '#fff'
                          : colors.textPrimary,
                      fontSize: 13,
                    }}
                    numberOfLines={1}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.chip,
                  { backgroundColor: form.adoptionReasonPreset === 'OUTRO' ? colors.primary : colors.surface },
                ]}
                onPress={() => setForm((f) => ({ ...f, adoptionReasonPreset: 'OUTRO', adoptionReason: f.adoptionReason }))}
              >
                <Text style={{ color: form.adoptionReasonPreset === 'OUTRO' ? '#fff' : colors.textPrimary, fontSize: 13 }}>Outro</Text>
              </TouchableOpacity>
            </View>
            {form.adoptionReasonPreset === 'OUTRO' && (
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, marginTop: spacing.sm }]}
                value={form.adoptionReason}
                onChangeText={(adoptionReason) => setForm((f) => ({ ...f, adoptionReason }))}
                placeholder="Descreva o motivo"
                placeholderTextColor={colors.textSecondary}
              />
            )}
          </View>
        )}

        {step === 4 && (
          <View style={styles.form}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              {form.name || '—'} • {form.species === 'dog' ? 'Cachorro' : 'Gato'} • {form.age || '—'} anos
            </Text>
            <Text style={[styles.summaryDesc, { color: colors.textPrimary }]} numberOfLines={3}>
              {form.description || '—'}
            </Text>
            <Text style={[styles.summaryPhotos, { color: colors.textSecondary }]}>
              {uploadedKeys.length > 0 ? `${uploadedKeys.length} foto(s)` : 'Imagem automática (sem fotos)'}
            </Text>
            {partners.length > 0 && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.md }]}>
                  Em parceria com (opcional)
                </Text>
                <View style={styles.rowWrap}>
                  <TouchableOpacity
                    style={[
                      styles.chip,
                      { backgroundColor: !form.partnerId ? colors.primary : colors.surface },
                    ]}
                    onPress={() => setForm((f) => ({ ...f, partnerId: '' }))}
                  >
                    <Text style={{ color: !form.partnerId ? '#fff' : colors.textPrimary, fontSize: 13 }}>
                      Nenhum
                    </Text>
                  </TouchableOpacity>
                  {partners.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.chip,
                        { backgroundColor: form.partnerId === p.id ? colors.primary : colors.surface },
                      ]}
                      onPress={() => setForm((f) => ({ ...f, partnerId: p.id }))}
                    >
                      <Text
                        style={{ color: form.partnerId === p.id ? '#fff' : colors.textPrimary, fontSize: 13 }}
                        numberOfLines={1}
                      >
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        <View style={styles.actions}>
          {step > 0 ? (
            <SecondaryButton title="Voltar" onPress={prev} style={styles.halfBtn} />
          ) : null}
          {step < STEPS.length - 1 ? (
            <PrimaryButton
              title={
                step === 0 && imageUris.length > 0
                  ? 'Enviar fotos e continuar'
                  : step === 0
                    ? 'Adicione pelo menos uma foto'
                    : 'Próximo'
              }
              onPress={handleNext}
              style={step > 0 ? styles.halfBtn : styles.fullBtn}
              disabled={uploading || (step === 0 && imageUris.length === 0)}
            />
          ) : (
            <PrimaryButton
              title={submitting ? 'Publicando...' : 'Publicar'}
              onPress={handleSubmit}
              style={step > 0 ? styles.halfBtn : styles.fullBtn}
              disabled={submitting}
            />
          )}
        </View>

        {step === 0 && (
          <View style={[styles.tipsBox, { backgroundColor: (colors.warning || '#d97706') + '18', borderColor: (colors.warning || '#d97706') + '50' }]}>
            <View style={styles.tipsTitleRow}>
              <Ionicons name="bulb" size={20} color={colors.warning || '#d97706'} />
              <Text style={[styles.tipsTitle, { color: colors.textPrimary }]}>Dicas para um bom anúncio</Text>
            </View>
            <Text style={[styles.tipsItem, { color: colors.textSecondary }]}>• Use fotos nítidas e com boa iluminação.</Text>
            <Text style={[styles.tipsItem, { color: colors.textSecondary }]}>• A primeira foto é a principal: escolha a que mais mostra o pet.</Text>
            <Text style={[styles.tipsItem, { color: colors.textSecondary }]}>• Mostre o pet em ambiente tranquilo para transmitir confiança.</Text>
            <Text style={[styles.tipsItem, { color: colors.textSecondary }]}>• Preencha a descrição com temperamento e hábitos — isso aumenta as chances de adoção.</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  title: { fontSize: 22, fontWeight: '700', marginBottom: spacing.xs },
  stepLabel: { fontSize: 14, marginBottom: spacing.md },
  photoStep: { marginBottom: spacing.lg },
  thumbs: { marginVertical: spacing.md },
  thumbWrap: { marginRight: spacing.sm, position: 'relative' },
  thumb: { width: 80, height: 80, borderRadius: 8 },
  removeThumb: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeThumbText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  primaryBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  reorderRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  reorderBtn: { width: 28, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  uploading: { alignItems: 'center', padding: spacing.md },
  uploadingText: { marginTop: spacing.sm },
  form: { marginBottom: spacing.lg },
  label: { fontSize: 12, marginBottom: spacing.xs },
  input: { padding: spacing.md, borderRadius: 10, fontSize: 16, marginBottom: spacing.md },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  agePresets: { flexDirection: 'row', marginBottom: spacing.sm, gap: spacing.xs },
  chip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 20 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  switchLabel: { fontSize: 16 },
  summaryLabel: { fontSize: 16, marginBottom: spacing.sm },
  summaryDesc: { fontSize: 14, marginBottom: spacing.xs },
  summaryPhotos: { fontSize: 13 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  halfBtn: { flex: 1 },
  fullBtn: { flex: 1 },
  tipsBox: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
  },
  tipsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  tipsTitle: { fontSize: 16, fontWeight: '700' },
  tipsItem: { fontSize: 14, lineHeight: 22, marginBottom: 4 },
});
