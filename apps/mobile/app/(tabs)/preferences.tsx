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

const SIZE_OPTIONS: { value: 'BOTH' | 'small' | 'medium' | 'large' | 'xlarge'; label: string }[] = [
  { value: 'BOTH', label: 'Qualquer' },
  { value: 'small', label: 'Pequeno' },
  { value: 'medium', label: 'Médio' },
  { value: 'large', label: 'Grande' },
  { value: 'xlarge', label: 'Muito grande' },
];

const SEX_OPTIONS: { value: 'BOTH' | 'male' | 'female'; label: string }[] = [
  { value: 'BOTH', label: 'Qualquer' },
  { value: 'male', label: 'Macho' },
  { value: 'female', label: 'Fêmea' },
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
  const [notifyNewPets, setNotifyNewPets] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyReminders, setNotifyReminders] = useState(true);
  const [notifyListingReminders, setNotifyListingReminders] = useState(true);
  const [sizePref, setSizePref] = useState<'BOTH' | 'small' | 'medium' | 'large' | 'xlarge'>('BOTH');
  const [sexPref, setSexPref] = useState<'BOTH' | 'male' | 'female'>('BOTH');

  useEffect(() => {
    if (prefs) {
      setSpecies(prefs.species);
      setSizePref((prefs.sizePref as 'BOTH' | 'small' | 'medium' | 'large' | 'xlarge') ?? 'BOTH');
      setSexPref((prefs.sexPref as 'BOTH' | 'male' | 'female') ?? 'BOTH');
      setNotifyNewPets(prefs.notifyNewPets);
      setNotifyMessages(prefs.notifyMessages);
      setNotifyReminders(prefs.notifyReminders);
      setNotifyListingReminders(prefs.notifyListingReminders ?? true);
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
    mutation.mutate({
      species,
      sizePref,
      sexPref,
      notifyNewPets,
      notifyMessages,
      notifyReminders,
      notifyListingReminders,
      ...(prefs?.radiusKm != null && { radiusKm: prefs.radiusKm }),
    });
  };

  const updateNotificationPref = (
    key: 'notifyNewPets' | 'notifyMessages' | 'notifyReminders' | 'notifyListingReminders',
    value: boolean,
  ) => {
    if (key === 'notifyNewPets') setNotifyNewPets(value);
    else if (key === 'notifyMessages') setNotifyMessages(value);
    else if (key === 'notifyReminders') setNotifyReminders(value);
    else setNotifyListingReminders(value);
    mutation.mutate({
      species,
      sizePref,
      sexPref,
      notifyNewPets: key === 'notifyNewPets' ? value : notifyNewPets,
      notifyMessages: key === 'notifyMessages' ? value : notifyMessages,
      notifyReminders: key === 'notifyReminders' ? value : notifyReminders,
      notifyListingReminders: key === 'notifyListingReminders' ? value : notifyListingReminders,
      ...(prefs?.radiusKm != null && { radiusKm: prefs.radiusKm }),
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
      <Text style={[styles.section, { color: colors.textSecondary }]}>
        Espécie, porte e sexo preferidos são usados no match score.
      </Text>
      <Text style={[styles.section, { color: colors.textSecondary, marginTop: spacing.sm }]}>Espécie</Text>
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
        Sexo preferido do pet (match)
      </Text>
      <View style={styles.optionsRow}>
        {SEX_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.optionChip,
              { backgroundColor: sexPref === opt.value ? colors.primary : colors.surface },
            ]}
            onPress={() => setSexPref(opt.value)}
          >
            <Text
              style={[
                styles.optionChipText,
                { color: sexPref === opt.value ? '#fff' : colors.textPrimary },
              ]}
            >
              {opt.label}
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
                Notificação de novos pets na sua região
              </Text>
              <Text style={[styles.notifDesc, { color: colors.textSecondary }]}>
                Ative para receber avisos quando surgirem pets novos na espécie configurada acima (o raio você define na aba Mapa)
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
        <View style={[styles.notifRow, { backgroundColor: colors.background }]}>
          <View style={styles.notifRowContent}>
            <Ionicons name="document-text-outline" size={20} color={colors.primary} style={styles.notifIcon} />
            <View>
              <Text style={[styles.notifLabel, { color: colors.textPrimary }]}>
                Lembretes para atualizar anúncios
              </Text>
              <Text style={[styles.notifDesc, { color: colors.textSecondary }]}>
                Mensagem periódica (a cada ~30 dias) para conferir se seus anúncios estão em dia
              </Text>
            </View>
          </View>
          <Switch
            value={notifyListingReminders}
            onValueChange={(v) => updateNotificationPref('notifyListingReminders', v)}
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
