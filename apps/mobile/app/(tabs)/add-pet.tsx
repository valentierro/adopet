import { useState, useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
  Modal,
  FlatList,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, PrimaryButton, SecondaryButton, PageIntro } from '../../src/components';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/authStore';
import { getMe } from '../../src/api/me';
import { spacing } from '../../src/theme';
import { presign, confirmUpload } from '../../src/api/uploads';
import { createPet } from '../../src/api/pets';
import { getPartners } from '../../src/api/partners';
import { getFriendlyErrorMessage } from '../../src/utils/errorMessage';
import {
  BR_STATES,
  fetchCitiesByStateId,
  buildLocationString,
  type CityOption,
} from '../../src/utils/brazilLocations';

function base64ToUint8Array(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
  const len = base64.replace(/=+$/, '').length;
  const placeholders = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const outputLen = (len * 3) / 4 - placeholders;
  const bytes = new Uint8Array(outputLen);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const b1 = lookup[base64.charCodeAt(i)];
    const b2 = lookup[base64.charCodeAt(i + 1)];
    const b3 = lookup[base64.charCodeAt(i + 2)];
    const b4 = lookup[base64.charCodeAt(i + 3)];
    bytes[p++] = (b1 << 2) | (b2 >> 4);
    if (p < outputLen) bytes[p++] = ((b2 & 15) << 4) | (b3 >> 2);
    if (p < outputLen) bytes[p++] = ((b3 & 3) << 6) | b4;
  }
  return bytes;
}

async function uriToUint8Array(uri: string): Promise<Uint8Array> {
  if (uri.startsWith('blob:')) {
    const res = await fetch(uri);
    if (!res.ok) throw new Error('Falha ao ler a imagem.');
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  }
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  if (!base64 || base64.length === 0) throw new Error('Imagem vazia ou inacessível.');
  return base64ToUint8Array(base64);
}

const STEPS = ['Fotos', 'Detalhes', 'Saúde', 'Comportamento', 'Descrição', 'Publicar'];

const ENERGY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Não informar' },
  { value: 'LOW', label: 'Calmo' },
  { value: 'MEDIUM', label: 'Moderado' },
  { value: 'HIGH', label: 'Agitado' },
];

const TEMPERAMENT_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Não informar' },
  { value: 'CALM', label: 'Tranquilo' },
  { value: 'PLAYFUL', label: 'Brincalhão' },
  { value: 'SHY', label: 'Tímido' },
  { value: 'SOCIABLE', label: 'Sociável' },
  { value: 'INDEPENDENT', label: 'Independente' },
];

const GOOD_WITH_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Não informar' },
  { value: 'YES', label: 'Sim' },
  { value: 'NO', label: 'Não' },
  { value: 'UNKNOWN', label: 'Não sei' },
];

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
  /** Id do estado (IBGE); 0 = não selecionado. */
  stateId: number;
  /** Id do município (IBGE); 0 = não selecionado. */
  cityId: number;
  /** Bairro (opcional); exibido com a cidade no feed e no mapa. */
  neighborhood: string;
  description: string;
  adoptionReason: string;
  adoptionReasonPreset: string;
  feedingType: string;
  feedingNotes: string;
  energyLevel: string;
  healthNotes: string;
  hasSpecialNeeds: boolean;
  goodWithDogs: string;
  goodWithCats: string;
  goodWithChildren: string;
  temperament: string;
  isDocile: boolean;
  isTrained: boolean;
  partnerIds: string[];
  preferredTutorHousingType: string;
  preferredTutorWalkFrequency: string;
  hasOngoingCosts: boolean | undefined;
};

const FEEDING_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Não informar' },
  { value: 'dry', label: 'Ração seca' },
  { value: 'wet', label: 'Ração úmida' },
  { value: 'mixed', label: 'Mista' },
  { value: 'natural', label: 'Natural' },
  { value: 'other', label: 'Outra' },
];

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
  stateId: 0,
  cityId: 0,
  neighborhood: '',
  description: '',
  adoptionReason: '',
  adoptionReasonPreset: '',
  feedingType: '',
  feedingNotes: '',
  energyLevel: '',
  healthNotes: '',
  hasSpecialNeeds: false,
  goodWithDogs: '',
  goodWithCats: '',
  goodWithChildren: '',
  temperament: '',
  isDocile: false,
  isTrained: false,
  partnerIds: [],
  preferredTutorHousingType: '',
  preferredTutorWalkFrequency: '',
  hasOngoingCosts: undefined,
};

export default function AddPetWizardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const { colors } = useTheme();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: getMe });

  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        const t = setTimeout(() => router.replace('/(auth)/welcome'), 0);
        return () => clearTimeout(t);
      }
    }, [userId, router]),
  );

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [showStateModal, setShowStateModal] = useState(false);

  const [partnerSearchQuery, setPartnerSearchQuery] = useState('');
  const [partnerSearchDebounced, setPartnerSearchDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setPartnerSearchDebounced(partnerSearchQuery), 300);
    return () => clearTimeout(t);
  }, [partnerSearchQuery]);
  const { data: partnersSearchResult = [] } = useQuery({
    queryKey: ['partners', 'ONG', partnerSearchDebounced],
    queryFn: () => getPartners('ONG', partnerSearchDebounced || undefined),
    staleTime: 2 * 60_000,
  });
  const { data: partnersInitial = [] } = useQuery({
    queryKey: ['partners', 'ONG'],
    queryFn: () => getPartners('ONG'),
    staleTime: 5 * 60_000,
  });
  const partners = partnerSearchDebounced ? partnersSearchResult : partnersInitial;
  const [selectedPartners, setSelectedPartners] = useState<Array<{ id: string; name: string }>>([]);
  const { data: cities = [] } = useQuery({
    queryKey: ['ibge', 'municipios', form.stateId],
    queryFn: () => fetchCitiesByStateId(form.stateId),
    enabled: form.stateId > 0,
    staleTime: 10 * 60_000,
  });
  const [showCityModal, setShowCityModal] = useState(false);
  const [cityModalSearch, setCityModalSearch] = useState('');
  const [uploadedKeys, setUploadedKeys] = useState<{ key: string; isPrimary: boolean }[]>([]);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPartnerConfirmModal, setShowPartnerConfirmModal] = useState(false);
  const hasSetDefaultPartnerRef = useRef(false);

  // Membro de uma única ONG: pré-seleciona a ONG para o anúncio (parceria auto-confirmada)
  useEffect(() => {
    if (hasSetDefaultPartnerRef.current || !user?.partnerMemberships?.length || partnersInitial.length === 0) return;
    const memberships = user.partnerMemberships;
    if (memberships.length !== 1) return;
    const partnerId = memberships[0].partnerId;
    if (!partnerId || !partnersInitial.some((p) => p.id === partnerId)) return;
    hasSetDefaultPartnerRef.current = true;
    setForm((prev) => (prev.partnerIds.length > 0 ? prev : { ...prev, partnerIds: [partnerId] }));
    setSelectedPartners((prev) => (prev.length > 0 ? prev : [{ id: partnerId, name: partnersInitial.find((p) => p.id === partnerId)?.name ?? 'ONG' }]));
  }, [user?.partnerMemberships, partnersInitial]);

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

  const capturePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão', 'Precisamos acessar a câmera para capturar a foto.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (result.canceled) return;
    const uri = result.assets[0]?.uri;
    if (uri) setImageUris((prev) => [...prev, uri].slice(0, 10));
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
    const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif'] as const;
    try {
      for (let i = 0; i < imageUris.length; i++) {
        const uri = imageUris[i];
        const pathWithoutQuery = uri.split('?')[0].split('#')[0];
        const rawExt = pathWithoutQuery.split('.').pop()?.toLowerCase() || '';
        const ext = ALLOWED_EXT.includes(rawExt as (typeof ALLOWED_EXT)[number]) ? rawExt : 'jpg';
        const filename = `photo-${i}.${ext === 'jpeg' ? 'jpg' : ext}`;
        const contentType =
          ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
        const { uploadUrl, key } = await presign(filename, contentType);
        const bytes = await uriToUint8Array(uri);
        const body =
          bytes.byteLength === bytes.buffer.byteLength
            ? bytes.buffer
            : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        const putRes = await fetch(uploadUrl, {
          method: 'PUT',
          body,
          headers: { 'Content-Type': contentType },
        });
        if (!putRes.ok) {
          const errText = await putRes.text().catch(() => '');
          throw new Error(errText || `Upload falhou: ${putRes.status}`);
        }
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
    if (step === 1) {
      if (!form.name.trim()) {
        Alert.alert('Campo obrigatório', 'Informe o nome do pet.');
        return;
      }
      const age = parseInt(form.age, 10);
      if (form.age === '' || isNaN(age) || age < 0 || age > 30) {
        Alert.alert('Campo obrigatório', 'Selecione a idade do pet (0 a 30 anos).');
        return;
      }
    }
    if (step === 4) {
      if (form.description.trim().length < 10) {
        Alert.alert('Campo obrigatório', 'A descrição deve ter pelo menos 10 caracteres.');
        return;
      }
    }
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  }, [step, imageUris.length, uploadImages, form.name, form.age, form.description]);

  const performSubmit = useCallback(
    async (state: { sigla: string }, city: { nome: string }) => {
      setSubmitting(true);
      try {
        const cityForApi = buildLocationString(form.neighborhood, city.nome, state.sigla);
        const age = parseInt(form.age, 10);
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
          city: cityForApi,
          ...(form.adoptionReason.trim() && { adoptionReason: form.adoptionReason.trim() }),
          ...(form.feedingType && { feedingType: form.feedingType }),
          ...(form.feedingNotes.trim() && { feedingNotes: form.feedingNotes.trim() }),
          ...(form.energyLevel && { energyLevel: form.energyLevel }),
          ...(form.healthNotes.trim() && { healthNotes: form.healthNotes.trim() }),
          ...(form.hasSpecialNeeds && { hasSpecialNeeds: form.hasSpecialNeeds }),
          ...(form.goodWithDogs && { goodWithDogs: form.goodWithDogs }),
          ...(form.goodWithCats && { goodWithCats: form.goodWithCats }),
          ...(form.goodWithChildren && { goodWithChildren: form.goodWithChildren }),
          ...(form.temperament && { temperament: form.temperament }),
          ...(form.isDocile && { isDocile: form.isDocile }),
          ...(form.isTrained && { isTrained: form.isTrained }),
          ...(form.partnerIds.length > 0 && { partnerIds: form.partnerIds }),
          ...(form.preferredTutorHousingType && { preferredTutorHousingType: form.preferredTutorHousingType }),
          ...(form.preferredTutorWalkFrequency && { preferredTutorWalkFrequency: form.preferredTutorWalkFrequency }),
          ...(form.hasOngoingCosts !== undefined && { hasOngoingCosts: form.hasOngoingCosts }),
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
        setShowPartnerConfirmModal(false);
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
    },
    [form, uploadedKeys, queryClient, router],
  );

  const handleConfirmPartnerAndSubmit = useCallback(() => {
    const state = form.stateId > 0 ? BR_STATES.find((s) => s.id === form.stateId) : null;
    const city = form.cityId > 0 ? cities.find((c) => c.id === form.cityId) : null;
    if (state && city) performSubmit(state, city);
  }, [form.stateId, form.cityId, cities, performSubmit]);

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
    const state = form.stateId > 0 ? BR_STATES.find((s) => s.id === form.stateId) : null;
    const city = form.cityId > 0 ? cities.find((c) => c.id === form.cityId) : null;
    if (!state || !city) {
      Alert.alert(
        'Localização obrigatória',
        'Selecione o estado e a cidade onde o pet está para que ele apareça no mapa e no feed.',
      );
      return;
    }
    if (form.partnerIds.length > 0) {
      setShowPartnerConfirmModal(true);
      return;
    }
    performSubmit(state, city);
  }, [form, uploadedKeys, cities, router, user, performSubmit]);

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
          <View style={[styles.expiryInfoBox, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '40' }]}>
            <Ionicons name="time-outline" size={20} color={colors.primary} style={styles.expiryInfoIcon} />
            <Text style={[styles.expiryInfoText, { color: colors.textPrimary }]}>
              Os anúncios têm validade de <Text style={styles.expiryInfoBold}>60 dias</Text> e podem ser prorrogados. Enviaremos notificações quando faltarem <Text style={styles.expiryInfoBold}>10, 5 e 1 dia</Text> para a expiração.
            </Text>
          </View>
        )}

        {step === 0 && (
          <View style={styles.photoStep}>
            <View style={styles.photoButtonsRow}>
              <PrimaryButton title="Escolher fotos" onPress={pickImages} disabled={uploading} style={styles.photoButton} />
              <SecondaryButton title="Capturar foto" onPress={capturePhoto} disabled={uploading} style={styles.photoButton} />
            </View>
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
            <Text style={[styles.label, { color: colors.textSecondary }]}>Localização do pet *</Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>Estado e cidade garantem o pin correto no mapa.</Text>
            <TouchableOpacity
              style={[styles.input, styles.selectTouch, { backgroundColor: colors.surface }]}
              onPress={() => setShowStateModal(true)}
            >
              <Text style={[styles.selectTouchText, { color: form.stateId ? colors.textPrimary : colors.textSecondary }]}>
                {form.stateId ? BR_STATES.find((s) => s.id === form.stateId)?.nome ?? 'Estado' : 'Selecione o estado'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.input,
                styles.selectTouch,
                { backgroundColor: colors.surface, opacity: form.stateId ? 1 : 0.6 },
              ]}
              onPress={() => form.stateId && setShowCityModal(true)}
              disabled={!form.stateId}
            >
              <Text style={[styles.selectTouchText, { color: form.cityId ? colors.textPrimary : colors.textSecondary }]}>
                {form.cityId ? cities.find((c) => c.id === form.cityId)?.nome ?? 'Cidade' : 'Selecione a cidade'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Bairro (opcional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary }]}
              value={form.neighborhood}
              onChangeText={(neighborhood) => setForm((f) => ({ ...f, neighborhood }))}
              placeholder="Ex: Centro, Pinheiros"
              placeholderTextColor={colors.textSecondary}
            />
            <Modal visible={showStateModal} transparent animationType="slide">
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowStateModal(false)}
              >
                <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Estado</Text>
                  <FlatList
                    data={BR_STATES}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[styles.modalRow, { backgroundColor: colors.surface }]}
                        onPress={() => {
                          setForm((f) => ({ ...f, stateId: item.id, cityId: 0 }));
                          setShowStateModal(false);
                        }}
                      >
                        <Text style={{ color: colors.textPrimary }}>{item.nome}</Text>
                        {form.stateId === item.id && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                      </TouchableOpacity>
                    )}
                  />
                  <TouchableOpacity style={[styles.modalClose, { backgroundColor: colors.surface }]} onPress={() => setShowStateModal(false)}>
                    <Text style={{ color: colors.primary, fontWeight: '600' }}>Fechar</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>
            <Modal visible={showCityModal} transparent animationType="slide">
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowCityModal(false)}
              >
                <View style={[styles.modalContent, { backgroundColor: colors.background }]} onStartShouldSetResponder={() => true}>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Cidade</Text>
                  <TextInput
                    style={[styles.input, styles.modalSearchInput, { backgroundColor: colors.surface, color: colors.textPrimary }]}
                    value={cityModalSearch}
                    onChangeText={setCityModalSearch}
                    placeholder="Buscar cidade..."
                    placeholderTextColor={colors.textSecondary}
                    autoCorrect={false}
                  />
                  <FlatList
                    data={cities.filter((c) => c.nome.toLowerCase().includes(cityModalSearch.trim().toLowerCase()))}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[styles.modalRow, { backgroundColor: colors.surface }]}
                        onPress={() => {
                          setForm((f) => ({ ...f, cityId: item.id, neighborhood: '' }));
                          setCityModalSearch('');
                          setShowCityModal(false);
                        }}
                      >
                        <Text style={{ color: colors.textPrimary }}>{item.nome}</Text>
                        {form.cityId === item.id && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                      </TouchableOpacity>
                    )}
                  />
                  <TouchableOpacity style={[styles.modalClose, { backgroundColor: colors.surface }]} onPress={() => setShowCityModal(false)}>
                    <Text style={{ color: colors.primary, fontWeight: '600' }}>Fechar</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>
            <Modal visible={showPartnerConfirmModal} transparent animationType="fade">
              <View style={[styles.modalOverlay, styles.partnerConfirmOverlay]}>
                <View style={[styles.partnerConfirmModalContent, { backgroundColor: colors.background }]} onStartShouldSetResponder={() => true}>
                  <Ionicons name="people-outline" size={40} color={colors.primary} style={{ marginBottom: spacing.sm }} />
                  <Text style={[styles.partnerConfirmModalTitle, { color: colors.textPrimary }]}>Anúncio em parceria</Text>
                  <Text style={[styles.partnerConfirmModalText, { color: colors.textSecondary }]}>
                    Você selecionou uma instituição como parceira neste anúncio. O selo de parceria só aparecerá no anúncio do pet após o parceiro confirmar a parceria.
                  </Text>
                  <View style={styles.partnerConfirmModalButtons}>
                    <SecondaryButton
                      title="Voltar"
                      onPress={() => setShowPartnerConfirmModal(false)}
                      style={styles.partnerConfirmModalBtn}
                    />
                    <PrimaryButton
                      title={submitting ? 'Publicando...' : 'Entendi e publicar'}
                      onPress={handleConfirmPartnerAndSubmit}
                      disabled={submitting}
                      style={styles.partnerConfirmModalBtn}
                    />
                  </View>
                </View>
              </View>
            </Modal>
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
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.md }]}>Preferência de tutor: moradia (opcional)</Text>
            <Text style={[styles.label, { color: colors.textSecondary, fontSize: 12, marginTop: 0 }]}>Quem preencher verá score de compatibilidade no feed.</Text>
            <View style={styles.rowWrap}>
              {[
                { value: '', label: 'Não informar' },
                { value: 'CASA', label: 'Casa' },
                { value: 'APARTAMENTO', label: 'Apartamento' },
                { value: 'INDIFERENTE', label: 'Indiferente' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value || 'none'}
                  style={[styles.chip, { backgroundColor: form.preferredTutorHousingType === opt.value ? colors.primary : colors.surface }]}
                  onPress={() => setForm((f) => ({ ...f, preferredTutorHousingType: f.preferredTutorHousingType === opt.value ? '' : opt.value }))}
                >
                  <Text style={{ color: form.preferredTutorHousingType === opt.value ? '#fff' : colors.textPrimary, fontSize: 13 }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.md }]}>Prefere tutor que passeie (opcional)</Text>
            <View style={styles.rowWrap}>
              {[
                { value: '', label: 'Não informar' },
                { value: 'DAILY', label: 'Diariamente' },
                { value: 'FEW_TIMES_WEEK', label: 'Algumas vezes/semana' },
                { value: 'RARELY', label: 'Raramente' },
                { value: 'INDIFERENTE', label: 'Indiferente' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value || 'none'}
                  style={[styles.chip, { backgroundColor: form.preferredTutorWalkFrequency === opt.value ? colors.primary : colors.surface }]}
                  onPress={() => setForm((f) => ({ ...f, preferredTutorWalkFrequency: f.preferredTutorWalkFrequency === opt.value ? '' : opt.value }))}
                >
                  <Text style={{ color: form.preferredTutorWalkFrequency === opt.value ? '#fff' : colors.textPrimary, fontSize: 13 }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.md }]}>Este pet tem gastos contínuos? (medicação, ração especial)</Text>
            <View style={styles.rowWrap}>
              {[
                { value: undefined as boolean | undefined, label: 'Não informar' },
                { value: true, label: 'Sim' },
                { value: false, label: 'Não' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value === undefined ? 'any' : String(opt.value)}
                  style={[styles.chip, { backgroundColor: form.hasOngoingCosts === opt.value ? colors.primary : colors.surface }]}
                  onPress={() => setForm((f) => ({ ...f, hasOngoingCosts: f.hasOngoingCosts === opt.value ? undefined : opt.value }))}
                >
                  <Text style={{ color: form.hasOngoingCosts === opt.value ? '#fff' : colors.textPrimary, fontSize: 13 }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
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
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.md }]}>Tipo de alimentação (opcional)</Text>
            <View style={styles.rowWrap}>
              {FEEDING_TYPE_OPTIONS.filter((o) => o.value !== '').map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.chip,
                    { backgroundColor: form.feedingType === opt.value ? colors.primary : colors.surface },
                  ]}
                  onPress={() => setForm((f) => ({ ...f, feedingType: f.feedingType === opt.value ? '' : opt.value }))}
                >
                  <Text style={{ color: form.feedingType === opt.value ? '#fff' : colors.textPrimary, fontSize: 13 }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.sm }]}>Observações sobre alimentação (opcional)</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: colors.surface, color: colors.textPrimary, minHeight: 72 },
              ]}
              value={form.feedingNotes}
              onChangeText={(feedingNotes) => setForm((f) => ({ ...f, feedingNotes }))}
              placeholder="Ex: alergias, dieta especial, ração que usa..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={2}
            />
          </View>
        )}

        {step === 3 && (
          <View style={styles.form}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Nível de energia (opcional)</Text>
            <View style={styles.rowWrap}>
              {ENERGY_OPTIONS.filter((o) => o.value !== '').map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, { backgroundColor: form.energyLevel === opt.value ? colors.primary : colors.surface }]}
                  onPress={() => setForm((f) => ({ ...f, energyLevel: f.energyLevel === opt.value ? '' : opt.value }))}
                >
                  <Text style={{ color: form.energyLevel === opt.value ? '#fff' : colors.textPrimary, fontSize: 13 }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.md }]}>Temperamento (opcional)</Text>
            <View style={styles.rowWrap}>
              {TEMPERAMENT_OPTIONS.filter((o) => o.value !== '').map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, { backgroundColor: form.temperament === opt.value ? colors.primary : colors.surface }]}
                  onPress={() => setForm((f) => ({ ...f, temperament: f.temperament === opt.value ? '' : opt.value }))}
                >
                  <Text style={{ color: form.temperament === opt.value ? '#fff' : colors.textPrimary, fontSize: 13 }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.md }]}>Se dá bem com crianças? (opcional)</Text>
            <View style={styles.rowWrap}>
              {GOOD_WITH_OPTIONS.filter((o) => o.value !== '').map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, { backgroundColor: form.goodWithChildren === opt.value ? colors.primary : colors.surface }]}
                  onPress={() => setForm((f) => ({ ...f, goodWithChildren: f.goodWithChildren === opt.value ? '' : opt.value }))}
                >
                  <Text style={{ color: form.goodWithChildren === opt.value ? '#fff' : colors.textPrimary, fontSize: 13 }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.sm }]}>Se dá bem com outros cachorros? (opcional)</Text>
            <View style={styles.rowWrap}>
              {GOOD_WITH_OPTIONS.filter((o) => o.value !== '').map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, { backgroundColor: form.goodWithDogs === opt.value ? colors.primary : colors.surface }]}
                  onPress={() => setForm((f) => ({ ...f, goodWithDogs: f.goodWithDogs === opt.value ? '' : opt.value }))}
                >
                  <Text style={{ color: form.goodWithDogs === opt.value ? '#fff' : colors.textPrimary, fontSize: 13 }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.sm }]}>Se dá bem com gatos? (opcional)</Text>
            <View style={styles.rowWrap}>
              {GOOD_WITH_OPTIONS.filter((o) => o.value !== '').map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, { backgroundColor: form.goodWithCats === opt.value ? colors.primary : colors.surface }]}
                  onPress={() => setForm((f) => ({ ...f, goodWithCats: f.goodWithCats === opt.value ? '' : opt.value }))}
                >
                  <Text style={{ color: form.goodWithCats === opt.value ? '#fff' : colors.textPrimary, fontSize: 13 }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={[styles.switchRow, { borderBottomColor: colors.surface, marginTop: spacing.md }]}>
              <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>É dócil? (manso/calmo com pessoas)</Text>
              <Switch
                value={form.isDocile}
                onValueChange={(isDocile) => setForm((f) => ({ ...f, isDocile }))}
                trackColor={{ false: colors.textSecondary, true: colors.primary }}
              />
            </View>
            <View style={[styles.switchRow, { borderBottomColor: colors.surface }]}>
              <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>É adestrado?</Text>
              <Switch
                value={form.isTrained}
                onValueChange={(isTrained) => setForm((f) => ({ ...f, isTrained }))}
                trackColor={{ false: colors.textSecondary, true: colors.primary }}
              />
            </View>
            <View style={[styles.switchRow, { borderBottomColor: colors.surface }]}>
              <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Necessita cuidados especiais?</Text>
              <Switch
                value={form.hasSpecialNeeds}
                onValueChange={(hasSpecialNeeds) => setForm((f) => ({ ...f, hasSpecialNeeds }))}
                trackColor={{ false: colors.textSecondary, true: colors.primary }}
              />
            </View>
            {form.hasSpecialNeeds && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.sm }]}>Descreva (comorbidades, medicação, etc.)</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.textPrimary, minHeight: 72 }]}
                  value={form.healthNotes}
                  onChangeText={(healthNotes) => setForm((f) => ({ ...f, healthNotes }))}
                  placeholder="Ex: cardíaco, toma remédio diário..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={2}
                />
              </>
            )}
          </View>
        )}

        {step === 4 && (
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

        {step === 5 && (
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
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.md }]}>
              Em parceria com (opcional)
            </Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Busque e escolha até 5 ONGs. O selo só aparece após a ONG confirmar no portal.
            </Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="Buscar por nome da ONG..."
              placeholderTextColor={colors.textSecondary}
              value={partnerSearchQuery}
              onChangeText={setPartnerSearchQuery}
            />
            {partners.length > 0 && (
              <View style={{ maxHeight: 160, marginTop: spacing.xs }}>
                <ScrollView
                  style={{ maxHeight: 160 }}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                  keyboardShouldPersistTaps="handled"
                >
                  {partners.filter((p) => !form.partnerIds.includes(p.id)).map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.partnerRow, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        if (form.partnerIds.length >= 5) return;
                        setForm((f) => ({ ...f, partnerIds: [...f.partnerIds, item.id] }));
                        setSelectedPartners((s) => [...s, { id: item.id, name: item.name }]);
                      }}
                      disabled={form.partnerIds.length >= 5}
                    >
                      <Text style={{ color: colors.textPrimary, fontSize: 15 }} numberOfLines={1}>{item.name}</Text>
                      {form.partnerIds.length >= 5 ? null : <Ionicons name="add-circle-outline" size={22} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            {selectedPartners.length > 0 && (
              <View style={{ marginTop: spacing.sm }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Selecionados</Text>
                <View style={styles.rowWrap}>
                  {selectedPartners.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.chip, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        setForm((f) => ({ ...f, partnerIds: f.partnerIds.filter((id) => id !== p.id) }));
                        setSelectedPartners((s) => s.filter((x) => x.id !== p.id));
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 13 }} numberOfLines={1}>{p.name}</Text>
                      <Ionicons name="close" size={16} color="#fff" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
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
              accessibilityLabel={submitting ? 'Publicando anúncio' : 'Publicar anúncio'}
              accessibilityHint="Toque duas vezes para publicar o anúncio do pet"
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
  container: { paddingTop: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  title: { fontSize: 22, fontWeight: '700', marginBottom: spacing.xs },
  stepLabel: { fontSize: 14, marginBottom: spacing.md },
  expiryInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  expiryInfoIcon: { marginRight: spacing.sm, marginTop: 2 },
  expiryInfoText: { flex: 1, fontSize: 14, lineHeight: 21 },
  expiryInfoBold: { fontWeight: '700' },
  photoStep: { marginBottom: spacing.lg },
  photoButtonsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  photoButton: { flex: 1 },
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
  hint: { fontSize: 11, marginBottom: spacing.xs, opacity: 0.9 },
  input: { padding: spacing.md, borderRadius: 10, fontSize: 16, marginBottom: spacing.md },
  selectTouch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectTouchText: { fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  partnerConfirmOverlay: { justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  partnerConfirmModalContent: { width: '100%', maxWidth: 400, borderRadius: 16, padding: spacing.xl, alignItems: 'center' },
  partnerConfirmModalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.sm, textAlign: 'center' },
  partnerConfirmModalText: { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: spacing.lg },
  partnerConfirmModalButtons: { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  partnerConfirmModalBtn: { flex: 1 },
  modalContent: { maxHeight: '70%', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  modalSearchInput: { marginBottom: spacing.sm },
  modalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderRadius: 8, marginBottom: spacing.xs },
  modalClose: { padding: spacing.md, alignItems: 'center', borderRadius: 10, marginTop: spacing.sm },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  agePresets: { flexDirection: 'row', marginBottom: spacing.sm, gap: spacing.xs },
  chip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  partnerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderBottomWidth: 1 },
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
