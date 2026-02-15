import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { ScreenContainer, LoadingLogo } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { getSavedSearches, createSavedSearch, updateSavedSearch, deleteSavedSearch, type SavedSearchItem } from '../../src/api/saved-search';
import { getFriendlyErrorMessage } from '../../src/utils/errorMessage';
import { spacing } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

const SPECIES_OPTIONS = [
  { value: '', label: 'Qualquer' },
  { value: 'DOG', label: 'Cachorro' },
  { value: 'CAT', label: 'Gato' },
  { value: 'BOTH', label: 'Cachorro ou gato' },
];
const SIZE_OPTIONS = [
  { value: '', label: 'Qualquer' },
  { value: 'small', label: 'Pequeno' },
  { value: 'medium', label: 'Médio' },
  { value: 'large', label: 'Grande' },
  { value: 'xlarge', label: 'Muito grande' },
];

const RADIUS_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Qualquer' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
  { value: 100, label: '100 km' },
  { value: 200, label: '200 km' },
  { value: 300, label: '300 km' },
  { value: 500, label: '500 km' },
];

function searchLabel(s: { species?: string | null; size?: string | null; breed?: string | null; radiusKm?: number }): string {
  const parts: string[] = [];
  if (s.species) parts.push(SPECIES_OPTIONS.find((o) => o.value === s.species)?.label ?? s.species);
  if (s.size) parts.push(SIZE_OPTIONS.find((o) => o.value === s.size)?.label ?? s.size);
  if (s.breed?.trim()) parts.push(s.breed.trim());
  if (s.radiusKm != null && s.radiusKm > 0) parts.push(`${s.radiusKm} km`);
  return parts.length ? parts.join(' • ') : 'Qualquer pet';
}

export default function SavedSearchesScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [species, setSpecies] = useState('');
  const [size, setSize] = useState('');
  const [breed, setBreed] = useState('');
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: list = [], isLoading, refetch } = useQuery({
    queryKey: ['saved-searches'],
    queryFn: getSavedSearches,
    staleTime: 0,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const createMutation = useMutation({
    mutationFn: createSavedSearch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
      setSpecies('');
      setSize('');
      setBreed('');
      setRadiusKm(null);
      setEditingId(null);
      Alert.alert('Salvo', 'Você será avisado quando surgirem pets que combinem.');
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível salvar.')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateSavedSearch>[1] }) =>
      updateSavedSearch(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
      setSpecies('');
      setSize('');
      setBreed('');
      setRadiusKm(null);
      setEditingId(null);
      Alert.alert('Atualizado', 'A busca foi atualizada.');
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível atualizar.')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSavedSearch,
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
      if (editingId === deletedId) {
        setEditingId(null);
        setSpecies('');
        setSize('');
        setBreed('');
        setRadiusKm(null);
      }
    },
  });

  const startEditing = (s: SavedSearchItem) => {
    setEditingId(s.id);
    setSpecies(s.species ?? '');
    setSize(s.size ?? '');
    setBreed(s.breed ?? '');
    setRadiusKm(
      s.latitude != null && s.longitude != null ? s.radiusKm : null,
    );
  };

  const cancelEditing = () => {
    setEditingId(null);
    setSpecies('');
    setSize('');
    setBreed('');
    setRadiusKm(null);
  };

  const buildBody = () => ({
    ...(species && { species: species as 'DOG' | 'CAT' | 'BOTH' }),
    ...(size && { size }),
    ...(breed.trim() && { breed: breed.trim() }),
  });

  const handleSave = async () => {
    const baseBody = buildBody();

    if (radiusKm != null && radiusKm > 0) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Localização necessária',
          'Para usar o filtro por raio, permita o acesso à sua localização. Ou escolha "Qualquer" em Raio para não filtrar por distância.',
          [{ text: 'OK' }],
        );
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({});
        const body = { ...baseBody, radiusKm, latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        if (editingId) {
          updateMutation.mutate({ id: editingId, body });
        } else {
          createMutation.mutate(body);
        }
      } catch {
        Alert.alert('Erro', 'Não foi possível obter sua localização. Tente novamente ou escolha "Qualquer" em Raio.');
      }
    } else {
      const body = {
        ...baseBody,
        ...(editingId
          ? { latitude: null, longitude: null, radiusKm: 50 }
          : {}),
      };
      if (editingId) {
        updateMutation.mutate({ id: editingId, body });
      } else {
        createMutation.mutate(body);
      }
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <LoadingLogo size={140} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <Text style={[styles.section, { color: colors.textSecondary }]}>
        Me avise quando tiver
      </Text>
      <View style={styles.filters}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Espécie</Text>
        <View style={styles.chipRow}>
          {SPECIES_OPTIONS.filter((o) => o.value !== 'BOTH').map((opt) => (
            <TouchableOpacity
              key={opt.value || 'any'}
              style={[
                styles.chip,
                { backgroundColor: species === opt.value ? colors.primary : colors.surface },
              ]}
              onPress={() => setSpecies(opt.value)}
            >
              <Text style={[styles.chipText, { color: species === opt.value ? '#fff' : colors.textPrimary }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.sm }]}>Tamanho</Text>
        <View style={styles.chipRow}>
          {SIZE_OPTIONS.filter((o) => o.value).map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.chip,
                { backgroundColor: size === opt.value ? colors.primary : colors.surface },
              ]}
              onPress={() => setSize(size === opt.value ? '' : opt.value)}
            >
              <Text style={[styles.chipText, { color: size === opt.value ? '#fff' : colors.textPrimary }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.sm }]}>Raça (opcional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary }]}
          placeholder="Ex: Golden, SRD"
          placeholderTextColor={colors.textSecondary}
          value={breed}
          onChangeText={setBreed}
        />
        <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.sm }]}>Raio (opcional)</Text>
        <View style={styles.chipRow}>
          {RADIUS_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value ?? 'any'}
              style={[
                styles.chip,
                { backgroundColor: radiusKm === opt.value ? colors.primary : colors.surface },
              ]}
              onPress={() => setRadiusKm(opt.value)}
            >
              <Text style={[styles.chipText, { color: radiusKm === opt.value ? '#fff' : colors.textPrimary }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.saveRow}>
          {editingId ? (
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.textSecondary }]}
              onPress={cancelEditing}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: colors.primary },
              editingId && styles.saveBtnFlex,
            ]}
            onPress={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            <Text style={styles.saveBtnText}>
              {editingId ? 'Atualizar busca' : 'Salvar busca'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.section, { color: colors.textSecondary, marginTop: spacing.xl }]}>
        Buscas salvas
      </Text>
      {list.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          Nenhuma busca salva. Crie uma acima para ser avisado quando surgirem pets.
        </Text>
      ) : (
        list.map((s) => (
          <View key={s.id} style={[styles.row, { backgroundColor: colors.surface }]}>
            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
              {searchLabel({
                species: s.species,
                size: s.size,
                breed: s.breed,
                radiusKm: s.latitude != null && s.longitude != null ? s.radiusKm : undefined,
              })}
            </Text>
            <View style={styles.rowActions}>
              <TouchableOpacity
                onPress={() => startEditing(s)}
                style={styles.actionBtn}
              >
                <Ionicons name="create-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert('Remover', 'Deixar de receber avisos desta busca?', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Remover', style: 'destructive', onPress: () => deleteMutation.mutate(s.id) },
                  ]);
                }}
                style={styles.actionBtn}
              >
                <Ionicons name="trash-outline" size={22} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: spacing.sm },
  label: { fontSize: 13, marginBottom: spacing.xs },
  filters: { marginBottom: spacing.lg },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: 16 },
  chipText: { fontSize: 14 },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    fontSize: 16,
    marginTop: spacing.xs,
  },
  saveRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignItems: 'center' },
  saveBtn: { flex: 1, padding: spacing.md, borderRadius: 10, alignItems: 'center' },
  saveBtnFlex: { flex: 1 },
  cancelBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 10, borderWidth: 1 },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
  empty: { fontSize: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  rowLabel: { flex: 1, fontSize: 15 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actionBtn: { padding: spacing.xs },
});
