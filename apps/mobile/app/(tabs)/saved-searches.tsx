import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenContainer, LoadingLogo } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { getSavedSearches, createSavedSearch, deleteSavedSearch } from '../../src/api/saved-search';
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

function searchLabel(s: { species?: string | null; size?: string | null; breed?: string | null }): string {
  const parts: string[] = [];
  if (s.species) parts.push(SPECIES_OPTIONS.find((o) => o.value === s.species)?.label ?? s.species);
  if (s.size) parts.push(SIZE_OPTIONS.find((o) => o.value === s.size)?.label ?? s.size);
  if (s.breed?.trim()) parts.push(s.breed.trim());
  return parts.length ? parts.join(' • ') : 'Qualquer pet';
}

export default function SavedSearchesScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [species, setSpecies] = useState('');
  const [size, setSize] = useState('');
  const [breed, setBreed] = useState('');

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
      Alert.alert('Salvo', 'Você será avisado quando surgirem pets que combinem.');
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível salvar.')),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteSavedSearch,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-searches'] }),
  });

  const handleSave = () => {
    createMutation.mutate({
      ...(species && { species: species as 'DOG' | 'CAT' | 'BOTH' }),
      ...(size && { size }),
      ...(breed.trim() && { breed: breed.trim() }),
    });
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
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={createMutation.isPending}
        >
          <Text style={styles.saveBtnText}>Salvar busca</Text>
        </TouchableOpacity>
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
            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{searchLabel(s)}</Text>
            <TouchableOpacity
              onPress={() => {
                Alert.alert('Remover', 'Deixar de receber avisos desta busca?', [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Remover', style: 'destructive', onPress: () => deleteMutation.mutate(s.id) },
                ]);
              }}
              style={styles.deleteBtn}
            >
              <Ionicons name="trash-outline" size={22} color={colors.error} />
            </TouchableOpacity>
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
  saveBtn: { marginTop: spacing.md, padding: spacing.md, borderRadius: 10, alignItems: 'center' },
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
  deleteBtn: { padding: spacing.xs },
});
