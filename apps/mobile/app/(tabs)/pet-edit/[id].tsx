import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  Image,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, PrimaryButton, SecondaryButton, LoadingLogo } from '../../../src/components';
import { useTheme } from '../../../src/hooks/useTheme';
import {
  getPet,
  updatePet,
  patchPetStatus,
  getConversationPartners,
  deletePet,
  deletePetMedia,
  reorderPetMedia,
  type PetStatus,
} from '../../../src/api/pets';
import { getPartners } from '../../../src/api/partners';
import { lookupUsername } from '../../../src/api/me';
import { presign, confirmUpload } from '../../../src/api/uploads';
import { getFriendlyErrorMessage } from '../../../src/utils/errorMessage';
import { spacing } from '../../../src/theme';

const STATUS_OPTIONS: { value: PetStatus; label: string }[] = [
  { value: 'AVAILABLE', label: 'Disponível' },
  { value: 'IN_PROCESS', label: 'Em processo' },
  { value: 'ADOPTED', label: 'Adotado' },
];

export default function PetEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<'dog' | 'cat'>('dog');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [size, setSize] = useState<'small' | 'medium' | 'large' | 'xlarge'>('medium');
  const [description, setDescription] = useState('');
  const [adoptionReason, setAdoptionReason] = useState('');
  const [feedingType, setFeedingType] = useState('');
  const [feedingNotes, setFeedingNotes] = useState('');
  const [vaccinated, setVaccinated] = useState(false);
  const [neutered, setNeutered] = useState(false);
  const [partnerId, setPartnerId] = useState('');
  const [showAdopterModal, setShowAdopterModal] = useState(false);
  const [selectedAdopter, setSelectedAdopter] = useState<
    { type: 'id'; id: string; name: string } | { type: 'username'; username: string; name: string } | { type: 'other' } | null
  >(null);
  const [usernameSearch, setUsernameSearch] = useState('');
  const [usernameSearching, setUsernameSearching] = useState(false);

  const { data: pet, isLoading, refetch: refetchPet } = useQuery({
    queryKey: ['pet', id],
    queryFn: () => getPet(id!),
    enabled: !!id,
  });

  const { data: partners = [] } = useQuery({
    queryKey: ['partners', 'ONG'],
    queryFn: () => getPartners('ONG'),
    staleTime: 5 * 60_000,
  });

  useFocusEffect(
    useCallback(() => {
      if (id) refetchPet();
    }, [id, refetchPet]),
  );

  useEffect(() => {
    if (pet) {
      setName(pet.name);
      setSpecies((pet.species?.toLowerCase() as 'dog' | 'cat') || 'dog');
      setBreed(pet.breed ?? '');
      setAge(String(pet.age ?? ''));
      setSex((pet.sex as 'male' | 'female') || 'male');
      setSize((pet.size as 'small' | 'medium' | 'large' | 'xlarge') || 'medium');
      setDescription(pet.description);
      setAdoptionReason(pet.adoptionReason ?? '');
      setFeedingType(pet.feedingType ?? '');
      setFeedingNotes(pet.feedingNotes ?? '');
      setVaccinated(pet.vaccinated);
      setNeutered(pet.neutered);
      setPartnerId((pet as { partner?: { id: string } })?.partner?.id ?? '');
    }
  }, [pet]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['pet', id] });
    queryClient.invalidateQueries({ queryKey: ['pets', 'mine'] });
    queryClient.invalidateQueries({ queryKey: ['me', 'tutor-stats'] });
  }, [queryClient, id]);

  const updateMutation = useMutation({
    mutationFn: () =>
      updatePet(id!, {
        name,
        species,
        ...(breed.trim() && { breed: breed.trim() }),
        age: parseInt(age, 10),
        sex,
        size,
        description,
        ...(adoptionReason.trim() && { adoptionReason: adoptionReason.trim() }),
        feedingType: feedingType,
        feedingNotes: feedingNotes.trim(),
        vaccinated,
        neutered,
        partnerId: partnerId.trim() || null,
      }),
    onSuccess: () => {
      invalidate();
      Alert.alert('Salvo', 'Dados atualizados.');
    },
    onError: (e: unknown) =>
      Alert.alert('Não foi possível salvar', getFriendlyErrorMessage(e, 'Tente novamente.')),
  });

  const statusMutation = useMutation({
    mutationFn: (args: {
      status: PetStatus;
      pendingAdopterId?: string;
      pendingAdopterUsername?: string;
    }) =>
      patchPetStatus(id!, args.status, {
        pendingAdopterId: args.pendingAdopterId,
        pendingAdopterUsername: args.pendingAdopterUsername,
      }),
    onSuccess: (_data, args) => {
      invalidate();
      setShowAdopterModal(false);
      setSelectedAdopter(null);
      setUsernameSearch('');
      if (args.status === 'ADOPTED') {
        Alert.alert('Informações atualizadas', 'As informações foram atualizadas. Um administrador será informado.');
      } else {
        Alert.alert('Status atualizado.', 'Sua pontuação de tutor foi atualizada.');
      }
    },
    onError: (e: unknown) =>
      Alert.alert('Não foi possível atualizar', getFriendlyErrorMessage(e, 'Tente novamente.')),
  });

  const { data: conversationPartners = [], isLoading: loadingPartners } = useQuery({
    queryKey: ['pets', id, 'conversation-partners'],
    queryFn: () => getConversationPartners(id!),
    enabled: !!id && showAdopterModal,
  });

  const handleStatusPress = (status: PetStatus) => {
    if (status === 'ADOPTED') {
      Alert.alert(
        'Marcar como adotado?',
        'O pet sairá da lista de disponíveis (feed e mapa). Em seguida, indique quem adotou (quem conversou com você no app ou pelo @nome de usuário). Um administrador confirmará a adoção.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', onPress: () => { setSelectedAdopter(null); setShowAdopterModal(true); } },
        ]
      );
      return;
    }
    statusMutation.mutate({ status });
  };

  const handleConfirmAdopter = () => {
    if (!selectedAdopter) {
      Alert.alert('Selecione quem adotou', 'Escolha uma pessoa da lista, busque por @usuário ou toque em "Outra pessoa".');
      return;
    }
    if (selectedAdopter.type === 'id') {
      statusMutation.mutate({ status: 'ADOPTED', pendingAdopterId: selectedAdopter.id });
    } else if (selectedAdopter.type === 'username') {
      statusMutation.mutate({ status: 'ADOPTED', pendingAdopterUsername: selectedAdopter.username });
    } else {
      statusMutation.mutate({ status: 'ADOPTED' });
    }
  };

  const handleSearchUsername = async () => {
    const q = usernameSearch.trim().replace(/^@/, '');
    if (q.length < 2) return;
    setUsernameSearching(true);
    try {
      const result = await lookupUsername(q);
      if (result) {
        setSelectedAdopter({ type: 'username', username: result.username, name: result.name });
      } else {
        Alert.alert('Não encontrado', `Nenhum usuário com @${q}. A pessoa precisa ter conta no Adopet e definir um nome de usuário no perfil.`);
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível buscar.');
    } finally {
      setUsernameSearching(false);
    }
  };

  const deleteMediaMutation = useMutation({
    mutationFn: (mediaId: string) => deletePetMedia(id!, mediaId),
    onSuccess: () => invalidate(),
    onError: (e: unknown) =>
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível remover a foto.')),
  });

  const reorderMutation = useMutation({
    mutationFn: (mediaIds: string[]) => reorderPetMedia(id!, mediaIds),
    onSuccess: () => invalidate(),
    onError: (e: unknown) =>
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível reordenar.')),
  });

  const addPhotoMutation = useMutation({
    mutationFn: async (uri: string) => {
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `photo-${Date.now()}.${ext === 'jpg' ? 'jpg' : ext}`;
      const { uploadUrl, key } = await presign(filename, `image/${ext === 'jpg' ? 'jpeg' : ext}`);
      const response = await fetch(uri);
      const blob = await response.blob();
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': blob.type || 'image/jpeg' },
      });
      if (!putRes.ok) throw new Error(`Upload falhou: ${putRes.status}`);
      await confirmUpload({ petId: id!, key, isPrimary: (pet?.mediaItems?.length ?? 0) === 0 });
    },
    onSuccess: () => invalidate(),
    onError: (e: unknown) =>
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível adicionar a foto.')),
  });

  const deletePetMutation = useMutation({
    mutationFn: () => deletePet(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['pet', id] });
      router.back();
    },
    onError: (e: unknown) =>
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível remover o anúncio.')),
  });

  const handleRemoveAnnouncement = () => {
    Alert.alert(
      'Remover anúncio?',
      'O anúncio será excluído permanentemente. Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: () => deletePetMutation.mutate() },
      ]
    );
  };

  const handleSave = () => {
    if (pet?.status === 'ADOPTED') return;
    if (!name.trim()) {
      Alert.alert('Erro', 'Informe o nome.');
      return;
    }
    const ageNum = parseInt(age, 10);
    if (Number.isNaN(ageNum) || ageNum < 0 || ageNum > 30) {
      Alert.alert('Erro', 'Idade entre 0 e 30.');
      return;
    }
    if (description.trim().length < 10) {
      Alert.alert('Erro', 'Descrição com pelo menos 10 caracteres.');
      return;
    }
    updateMutation.mutate();
  };

  const handleDeletePhoto = (mediaId: string) => {
    const items = pet?.mediaItems ?? [];
    if (items.length <= 1) {
      Alert.alert('Atenção', 'O pet precisa ter pelo menos uma foto.');
      return;
    }
    Alert.alert('Remover foto?', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => deleteMediaMutation.mutate(mediaId) },
    ]);
  };

  const handleMovePhoto = (index: number, dir: 'up' | 'down') => {
    const items = [...(pet?.mediaItems ?? [])];
    const j = dir === 'up' ? index - 1 : index + 1;
    if (j < 0 || j >= items.length) return;
    [items[index], items[j]] = [items[j], items[index]];
    reorderMutation.mutate(items.map((m) => m.id));
  };

  const pickAndAddPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão', 'Precisamos acessar suas fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    await addPhotoMutation.mutateAsync(result.assets[0].uri);
  };

  if (isLoading || !pet) {
    return (
      <ScreenContainer>
        <LoadingLogo size={160} />
      </ScreenContainer>
    );
  }

  const mediaItems = pet.mediaItems ?? [];
  const isAdopted = pet.status === 'ADOPTED';

  return (
    <ScreenContainer scroll>
      {isAdopted && (
        <View style={[styles.adoptedBanner, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
          <Ionicons name="information-circle" size={22} color={colors.primary} />
          <Text style={[styles.adoptedBannerText, { color: colors.textPrimary }]}>
            Este pet foi adotado. Não é possível editar. Para alterar informações, crie um novo anúncio.
          </Text>
        </View>
      )}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Fotos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbs}>
          {mediaItems.map((m, i) => (
            <View key={m.id} style={styles.thumbWrap}>
              <Image source={{ uri: m.url }} style={styles.thumb} />
              <TouchableOpacity
                style={[styles.removeThumb, { backgroundColor: colors.error || '#c00' }]}
                onPress={() => handleDeletePhoto(m.id)}
                disabled={isAdopted || deleteMediaMutation.isPending}
              >
                <Text style={styles.removeThumbText}>×</Text>
              </TouchableOpacity>
              {mediaItems.length > 1 && (
                <View style={styles.reorderRow}>
                  <TouchableOpacity
                    style={[styles.reorderBtn, { backgroundColor: colors.surface }]}
                    onPress={() => handleMovePhoto(i, 'up')}
                    disabled={isAdopted || i === 0 || reorderMutation.isPending}
                  >
                    <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>↑</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reorderBtn, { backgroundColor: colors.surface }]}
                    onPress={() => handleMovePhoto(i, 'down')}
                    disabled={isAdopted || i === mediaItems.length - 1 || reorderMutation.isPending}
                  >
                    <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>↓</Text>
                  </TouchableOpacity>
                </View>
              )}
              {i === 0 && <View style={[styles.primaryBadge, { backgroundColor: colors.primary }]}><Text style={styles.primaryBadgeText}>Principal</Text></View>}
            </View>
          ))}
          <TouchableOpacity
            style={[styles.addThumb, { backgroundColor: colors.surface, borderColor: colors.primary }]}
            onPress={pickAndAddPhoto}
            disabled={isAdopted || addPhotoMutation.isPending}
          >
            {addPhotoMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="add" size={32} color={colors.primary} />
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Dados</Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Nome</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary }]}
          value={name}
          onChangeText={setName}
          placeholder="Nome do pet"
          placeholderTextColor={colors.textSecondary}
          editable={!isAdopted}
        />
        <Text style={[styles.label, { color: colors.textSecondary }]}>Espécie</Text>
        <View style={styles.row}>
          {(['dog', 'cat'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, { backgroundColor: species === s ? colors.primary : colors.surface }]}
              onPress={() => setSpecies(s)}
              disabled={isAdopted}
            >
              <Text style={{ color: species === s ? '#fff' : colors.textPrimary }}>{s === 'dog' ? 'Cachorro' : 'Gato'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Raça (opcional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary }]}
          value={breed}
          onChangeText={setBreed}
          placeholder="Ex: Golden, SRD"
          placeholderTextColor={colors.textSecondary}
          editable={!isAdopted}
        />
        <Text style={[styles.label, { color: colors.textSecondary }]}>Idade (anos)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary }]}
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
          placeholderTextColor={colors.textSecondary}
          editable={!isAdopted}
        />
        <Text style={[styles.label, { color: colors.textSecondary }]}>Sexo</Text>
        <View style={styles.row}>
          {(['male', 'female'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, { backgroundColor: sex === s ? colors.primary : colors.surface }]}
              onPress={() => setSex(s)}
              disabled={isAdopted}
            >
              <Text style={{ color: sex === s ? '#fff' : colors.textPrimary }}>{s === 'male' ? 'Macho' : 'Fêmea'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Porte</Text>
        <View style={styles.rowWrap}>
          {(['small', 'medium', 'large', 'xlarge'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, { backgroundColor: size === s ? colors.primary : colors.surface }]}
              onPress={() => setSize(s)}
              disabled={isAdopted}
            >
              <Text style={{ color: size === s ? '#fff' : colors.textPrimary }}>{s === 'small' ? 'P' : s === 'medium' ? 'M' : s === 'large' ? 'G' : 'GG'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Descrição</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.textPrimary }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Mín. 10 caracteres"
          placeholderTextColor={colors.textSecondary}
          multiline
          editable={!isAdopted}
        />
        <Text style={[styles.label, { color: colors.textSecondary }]}>Por que está doando? (opcional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary }]}
          value={adoptionReason}
          onChangeText={setAdoptionReason}
          placeholder="Ex: Mudança de cidade"
          placeholderTextColor={colors.textSecondary}
          editable={!isAdopted}
        />
        <View style={[styles.switchRow, { borderBottomColor: colors.surface }]}>
          <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Vacinado</Text>
          <Switch value={vaccinated} onValueChange={setVaccinated} trackColor={{ false: colors.textSecondary, true: colors.primary }} disabled={isAdopted} />
        </View>
        <View style={[styles.switchRow, { borderBottomColor: colors.surface }]}>
          <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Castrado</Text>
          <Switch value={neutered} onValueChange={setNeutered} trackColor={{ false: colors.textSecondary, true: colors.primary }} disabled={isAdopted} />
        </View>
        <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.md }]}>Tipo de alimentação (opcional)</Text>
        <View style={styles.rowWrap}>
          {[
            { value: '', label: 'Não informar' },
            { value: 'dry', label: 'Ração seca' },
            { value: 'wet', label: 'Ração úmida' },
            { value: 'mixed', label: 'Mista' },
            { value: 'natural', label: 'Natural' },
            { value: 'other', label: 'Outra' },
          ]
            .filter((o) => o.value !== '')
            .map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, { backgroundColor: feedingType === opt.value ? colors.primary : colors.surface }]}
                onPress={() => setFeedingType(feedingType === opt.value ? '' : opt.value)}
                disabled={isAdopted}
              >
                <Text style={{ color: feedingType === opt.value ? '#fff' : colors.textPrimary, fontSize: 13 }}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
        </View>
        <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.sm }]}>Observações sobre alimentação (opcional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, minHeight: 72 }]}
          value={feedingNotes}
          onChangeText={setFeedingNotes}
          placeholder="Ex: alergias, dieta especial, ração que usa..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={2}
          editable={!isAdopted}
        />
        {partners.length > 0 && (
          <>
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.md }]}>Em parceria com (opcional)</Text>
            <View style={styles.rowWrap}>
              <TouchableOpacity
                style={[styles.chip, { backgroundColor: !partnerId ? colors.primary : colors.surface }]}
                onPress={() => setPartnerId('')}
                disabled={isAdopted}
              >
                <Text style={{ color: !partnerId ? '#fff' : colors.textPrimary, fontSize: 13 }}>Nenhum</Text>
              </TouchableOpacity>
              {partners.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.chip, { backgroundColor: partnerId === p.id ? colors.primary : colors.surface }]}
                  onPress={() => setPartnerId(p.id)}
                  disabled={isAdopted}
                >
                  <Text style={{ color: partnerId === p.id ? '#fff' : colors.textPrimary, fontSize: 13 }} numberOfLines={1}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
        <PrimaryButton
          title={updateMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
          onPress={handleSave}
          disabled={isAdopted || updateMutation.isPending}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Status do anúncio</Text>
        {STATUS_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.statusOption, { backgroundColor: pet.status === opt.value ? colors.primary : colors.surface }]}
            onPress={() => handleStatusPress(opt.value)}
            disabled={isAdopted || statusMutation.isPending}
          >
            <Text style={{ color: pet.status === opt.value ? '#fff' : colors.textPrimary, fontWeight: '600' }}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!isAdopted && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Remover anúncio</Text>
          <Text style={[styles.sectionSub, { color: colors.textSecondary, marginBottom: spacing.md }]}>
            Excluir este anúncio permanentemente. Não é possível remover anúncios de pets já marcados como adotados.
          </Text>
          <TouchableOpacity
            style={[styles.removeAnnouncementBtn, { borderColor: colors.error || '#DC2626' }]}
            onPress={handleRemoveAnnouncement}
            disabled={deletePetMutation.isPending}
          >
            {deletePetMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.error || '#DC2626'} />
            ) : (
              <Ionicons name="trash-outline" size={20} color={colors.error || '#DC2626'} />
            )}
            <Text style={[styles.removeAnnouncementBtnText, { color: colors.error || '#DC2626' }]}>
              {deletePetMutation.isPending ? 'Removendo...' : 'Remover anúncio'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={showAdopterModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Quem adotou?</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Quem conversou com você no app ou informe o @nome de usuário. O admin poderá confirmar a adoção sem precisar buscar.
            </Text>
            {loadingPartners ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.md }} />
            ) : conversationPartners.length > 0 ? (
              <>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Quem conversou com você sobre este pet</Text>
                <ScrollView style={styles.modalList} nestedScrollEnabled>
                  {conversationPartners.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.modalItem,
                        { backgroundColor: colors.background },
                        selectedAdopter?.type === 'id' && selectedAdopter.id === p.id && { backgroundColor: colors.primary + '25' },
                      ]}
                      onPress={() => setSelectedAdopter({ type: 'id', id: p.id, name: p.name })}
                    >
                      <Text style={[styles.modalItemText, { color: colors.textPrimary }]}>{p.name}</Text>
                      {p.username ? <Text style={[styles.modalItemSub, { color: colors.textSecondary }]}>@{p.username}</Text> : null}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            ) : null}
            <Text style={[styles.modalLabel, { color: colors.textSecondary, marginTop: spacing.md }]}>Buscar por @nome de usuário</Text>
            <View style={styles.modalSearchRow}>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.background, color: colors.textPrimary }]}
                placeholder="@usuário"
                placeholderTextColor={colors.textSecondary}
                value={usernameSearch}
                onChangeText={setUsernameSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.modalSearchBtn, { backgroundColor: colors.primary }]}
                onPress={handleSearchUsername}
                disabled={usernameSearching || usernameSearch.trim().replace(/^@/, '').length < 2}
              >
                {usernameSearching ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalSearchBtnText}>Buscar</Text>}
              </TouchableOpacity>
            </View>
            {selectedAdopter?.type === 'username' && (
              <View style={[styles.modalItem, { backgroundColor: colors.primary + '25', marginTop: spacing.sm }]}>
                <Text style={[styles.modalItemText, { color: colors.textPrimary }]}>{selectedAdopter.name}</Text>
                <Text style={[styles.modalItemSub, { color: colors.textSecondary }]}>@{selectedAdopter.username}</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.modalItem, { backgroundColor: colors.background, marginTop: spacing.sm }]}
              onPress={() => setSelectedAdopter({ type: 'other' })}
            >
              <Text style={[styles.modalItemText, { color: colors.textPrimary }]}>Outra pessoa (admin definirá depois)</Text>
            </TouchableOpacity>
            {selectedAdopter?.type === 'other' && (
              <View style={[styles.modalItem, { backgroundColor: colors.primary + '25', marginTop: spacing.xs }]}>
                <Text style={[styles.modalItemText, { color: colors.textPrimary }]}>Admin buscará o adotante</Text>
              </View>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.background }]} onPress={() => { setShowAdopterModal(false); setSelectedAdopter(null); setUsernameSearch(''); }}>
                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }, (!selectedAdopter || statusMutation.isPending) && styles.modalBtnDisabled]}
                onPress={handleConfirmAdopter}
                disabled={!selectedAdopter || statusMutation.isPending}
              >
                <Text style={styles.modalBtnTextWhite}>{statusMutation.isPending ? 'Salvando...' : 'Marcar como adotado'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  adoptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  adoptedBannerText: { flex: 1, fontSize: 14 },
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: spacing.md },
  label: { fontSize: 12, marginBottom: spacing.xs },
  input: { padding: spacing.md, borderRadius: 10, fontSize: 16, marginBottom: spacing.md },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 20 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1 },
  switchLabel: { fontSize: 16 },
  statusOption: { padding: spacing.md, borderRadius: 10, marginBottom: spacing.sm },
  thumbs: { marginBottom: spacing.sm },
  thumbWrap: { marginRight: spacing.sm, position: 'relative' },
  thumb: { width: 80, height: 80, borderRadius: 8 },
  removeThumb: { position: 'absolute', top: -4, right: -4, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  removeThumbText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  reorderRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  reorderBtn: { width: 28, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  primaryBadge: { position: 'absolute', bottom: 4, left: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  primaryBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  addThumb: { width: 80, height: 80, borderRadius: 8, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  sectionSub: { fontSize: 13, marginBottom: spacing.sm },
  removeAnnouncementBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 10,
    borderWidth: 2,
  },
  removeAnnouncementBtnText: { fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
  modalContent: { borderRadius: 16, padding: spacing.lg, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  modalSub: { fontSize: 13, marginBottom: spacing.md },
  modalLabel: { fontSize: 12, fontWeight: '600', marginBottom: spacing.xs },
  modalList: { maxHeight: 140, marginBottom: spacing.sm },
  modalItem: { padding: spacing.md, borderRadius: 10, marginBottom: spacing.xs },
  modalItemText: { fontSize: 15, fontWeight: '500' },
  modalItemSub: { fontSize: 12, marginTop: 2 },
  modalSearchRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  modalInput: { flex: 1, padding: spacing.md, borderRadius: 10, fontSize: 16 },
  modalSearchBtn: { paddingHorizontal: spacing.lg, justifyContent: 'center', borderRadius: 10 },
  modalSearchBtnText: { color: '#fff', fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  modalBtn: { flex: 1, padding: spacing.md, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { fontWeight: '600' },
  modalBtnTextWhite: { color: '#fff', fontWeight: '600' },
  modalBtnDisabled: { opacity: 0.6 },
});
