import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Switch } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
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
  const { data: prefs, isLoading, refetch } = useQuery({
    queryKey: ['me', 'preferences'],
    queryFn: getPreferences,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

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
      queryClient.refetchQueries({ queryKey: ['feed'] });
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
      <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
        O feed e o mapa mostram apenas pets até esta distância da sua localização.
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

      <View style={[styles.notifSection, { backgroundColor: colors.surface }]}>
        <View style={styles.notifSectionHeader}>
          <Ionicons name="notifications-outline" size={22} color={colors.primary} />
          <Text style={[styles.notifSectionTitle, { color: colors.textPrimary }]}>
            Preferências de notificações
          </Text>
        </View>
        <Text style={[styles.notifSectionSub, { color: colors.textSecondary }]}>
          Escolha quais notificações push deseja receber. Você pode alterar a qualquer momento.
        </Text>
        <View style={[styles.notifRow, { backgroundColor: colors.background }]}>
          <View style={styles.notifRowContent}>
            <Ionicons name="paw-outline" size={20} color={colors.primary} style={styles.notifIcon} />
            <View>
              <Text style={[styles.notifLabel, { color: colors.textPrimary }]}>
                Novos pets na sua região
              </Text>
              <Text style={[styles.notifDesc, { color: colors.textSecondary }]}>
                Avisos quando há pets novos no raio das suas preferências
              </Text>
            </View>
          </View>
          <Switch
            value={notifyNewPets}
            onValueChange={(v) => updateNotificationPref('notifyNewPets', v)}
            trackColor={{ false: colors.background, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
        <View style={[styles.notifRow, { backgroundColor: colors.background }]}>
          <View style={styles.notifRowContent}>
            <Ionicons name="chatbubbles-outline" size={20} color={colors.primary} style={styles.notifIcon} />
            <View>
              <Text style={[styles.notifLabel, { color: colors.textPrimary }]}>
                Mensagens e conversas
              </Text>
              <Text style={[styles.notifDesc, { color: colors.textSecondary }]}>
                Quando alguém enviar mensagem ou iniciar conversa sobre um pet
              </Text>
            </View>
          </View>
          <Switch
            value={notifyMessages}
            onValueChange={(v) => updateNotificationPref('notifyMessages', v)}
            trackColor={{ false: colors.background, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
        <View style={[styles.notifRow, { backgroundColor: colors.background }]}>
          <View style={styles.notifRowContent}>
            <Ionicons name="time-outline" size={20} color={colors.primary} style={styles.notifIcon} />
            <View>
              <Text style={[styles.notifLabel, { color: colors.textPrimary }]}>
                Lembretes de conversas
              </Text>
              <Text style={[styles.notifDesc, { color: colors.textSecondary }]}>
                Lembrete quando você não responde há um tempo (ex.: conversa sobre um pet)
              </Text>
            </View>
          </View>
          <Switch
            value={notifyReminders}
            onValueChange={(v) => updateNotificationPref('notifyReminders', v)}
            trackColor={{ false: colors.background, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
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
  sectionSub: {
    fontSize: 13,
    marginBottom: spacing.sm,
    opacity: 0.9,
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
  notifSection: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: 16,
    overflow: 'hidden',
  },
  notifSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  notifSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  notifSectionSub: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: spacing.md,
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
  notifRowContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: spacing.sm,
  },
  notifIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  notifLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  notifDesc: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
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
