import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Switch } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, LoadingLogo } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { getPreferences, updatePreferences } from '../../src/api/me';
import { getFriendlyErrorMessage } from '../../src/utils/errorMessage';
import { spacing } from '../../src/theme';

const SPECIES_OPTIONS: { value: 'DOG' | 'CAT' | 'BOTH'; label: string }[] = [
  { value: 'DOG', label: 'Cachorros' },
  { value: 'CAT', label: 'Gatos' },
  { value: 'BOTH', label: 'Cachorros e gatos' },
];

const RADIUS_OPTIONS = [10, 25, 50, 100, 200];
const SIZE_OPTIONS: { value: 'BOTH' | 'small' | 'medium' | 'large' | 'xlarge'; label: string }[] = [
  { value: 'BOTH', label: 'Qualquer' },
  { value: 'small', label: 'Pequeno' },
  { value: 'medium', label: 'Médio' },
  { value: 'large', label: 'Grande' },
  { value: 'xlarge', label: 'Muito grande' },
];

export default function PreferencesScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { data: prefs, isLoading } = useQuery({
    queryKey: ['me', 'preferences'],
    queryFn: getPreferences,
  });

  const [species, setSpecies] = useState<'DOG' | 'CAT' | 'BOTH'>('BOTH');
  const [radiusKm, setRadiusKm] = useState(50);
  const [notifyNewPets, setNotifyNewPets] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyReminders, setNotifyReminders] = useState(true);
  const [sizePref, setSizePref] = useState<'BOTH' | 'small' | 'medium' | 'large' | 'xlarge'>('BOTH');

  useEffect(() => {
    if (prefs) {
      setSpecies(prefs.species);
      setRadiusKm(prefs.radiusKm);
      setSizePref((prefs.sizePref as 'BOTH' | 'small' | 'medium' | 'large' | 'xlarge') ?? 'BOTH');
      setNotifyNewPets(prefs.notifyNewPets);
      setNotifyMessages(prefs.notifyMessages);
      setNotifyReminders(prefs.notifyReminders);
    }
  }, [prefs]);

  const mutation = useMutation({
    mutationFn: updatePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'preferences'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      Alert.alert('Salvo', 'Preferências atualizadas.');
    },
    onError: (e: unknown) => Alert.alert('Não foi possível salvar', getFriendlyErrorMessage(e, 'Tente novamente.')),
  });

  const handleSave = () => {
    mutation.mutate({ species, radiusKm, sizePref, notifyNewPets, notifyMessages, notifyReminders });
  };

  const updateNotificationPref = (
    key: 'notifyNewPets' | 'notifyMessages' | 'notifyReminders',
    value: boolean,
  ) => {
    if (key === 'notifyNewPets') setNotifyNewPets(value);
    else if (key === 'notifyMessages') setNotifyMessages(value);
    else setNotifyReminders(value);
    mutation.mutate({
      species,
      radiusKm,
      sizePref,
      notifyNewPets: key === 'notifyNewPets' ? value : notifyNewPets,
      notifyMessages: key === 'notifyMessages' ? value : notifyMessages,
      notifyReminders: key === 'notifyReminders' ? value : notifyReminders,
    });
  };

  if (isLoading && !prefs) {
    return (
      <ScreenContainer>
        <LoadingLogo size={160} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <Text style={[styles.section, { color: colors.textSecondary }]}>Espécie</Text>
      <View style={styles.optionsRow}>
        {SPECIES_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.optionChip,
              { backgroundColor: species === opt.value ? colors.primary : colors.surface },
            ]}
            onPress={() => setSpecies(opt.value)}
          >
            <Text
              style={[
                styles.optionChipText,
                { color: species === opt.value ? '#fff' : colors.textPrimary },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.section, { color: colors.textSecondary, marginTop: spacing.lg }]}>
        Tamanho preferido (recomendação)
      </Text>
      <View style={styles.optionsRow}>
        {SIZE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.optionChip,
              { backgroundColor: sizePref === opt.value ? colors.primary : colors.surface },
            ]}
            onPress={() => setSizePref(opt.value)}
          >
            <Text
              style={[
                styles.optionChipText,
                { color: sizePref === opt.value ? '#fff' : colors.textPrimary },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.section, { color: colors.textSecondary, marginTop: spacing.lg }]}>
        Raio (km)
      </Text>
      <View style={styles.optionsRow}>
        {RADIUS_OPTIONS.map((km) => (
          <TouchableOpacity
            key={km}
            style={[
              styles.optionChip,
              { backgroundColor: radiusKm === km ? colors.primary : colors.surface },
            ]}
            onPress={() => setRadiusKm(km)}
          >
            <Text
              style={[
                styles.optionChipText,
                { color: radiusKm === km ? '#fff' : colors.textPrimary },
              ]}
            >
              {km} km
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.section, { color: colors.textSecondary, marginTop: spacing.lg }]}>
        Notificações
      </Text>
      <View style={[styles.notifRow, { backgroundColor: colors.surface }]}>
        <Text style={[styles.notifLabel, { color: colors.textPrimary }]}>
          Novos pets disponíveis
        </Text>
        <Switch
          value={notifyNewPets}
          onValueChange={(v) => updateNotificationPref('notifyNewPets', v)}
          trackColor={{ false: colors.background, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>
      <View style={[styles.notifRow, { backgroundColor: colors.surface }]}>
        <Text style={[styles.notifLabel, { color: colors.textPrimary }]}>
          Mensagens e novas conversas
        </Text>
        <Switch
          value={notifyMessages}
          onValueChange={(v) => updateNotificationPref('notifyMessages', v)}
          trackColor={{ false: colors.background, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>
      <View style={[styles.notifRow, { backgroundColor: colors.surface }]}>
        <Text style={[styles.notifLabel, { color: colors.textPrimary }]}>
          Lembretes de conversas pendentes
        </Text>
        <Switch
          value={notifyReminders}
          onValueChange={(v) => updateNotificationPref('notifyReminders', v)}
          trackColor={{ false: colors.background, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.primary }]}
        onPress={handleSave}
        disabled={mutation.isPending}
      >
        <Text style={styles.saveButtonText}>
          {mutation.isPending ? 'Salvando...' : 'Salvar preferências'}
        </Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
  },
  optionChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  notifLabel: {
    fontSize: 15,
    flex: 1,
  },
  saveButton: {
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
