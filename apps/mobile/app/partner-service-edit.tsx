import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, TouchableOpacity, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, PrimaryButton, LoadingLogo, PartnerPanelLayout } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { getMyPartnerServices, createPartnerService, updatePartnerService } from '../src/api/partner';
import { presign } from '../src/api/uploads';
import { getFriendlyErrorMessage } from '../src/utils/errorMessage';
import { spacing } from '../src/theme';

export default function PartnerServiceEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const isEdit = !!params.id;
  const { data: services, isLoading } = useQuery({
    queryKey: ['me', 'partner', 'services'],
    queryFn: getMyPartnerServices,
  });
  const existing = isEdit ? (services ?? []).find((s) => s.id === params.id) : null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceDisplay, setPriceDisplay] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [active, setActive] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDescription(existing.description ?? '');
      setPriceDisplay(existing.priceDisplay ?? '');
      setValidUntil(existing.validUntil ? existing.validUntil.slice(0, 10) : '');
      setActive(existing.active);
      setImageUrl(existing.imageUrl ?? null);
    }
  }, [existing]);

  const pickAndUploadPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão', 'Precisamos acessar suas fotos para adicionar uma imagem ao serviço.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploadingPhoto(true);
    try {
      const uri = result.assets[0].uri;
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `partner-service-${Date.now()}.${ext === 'jpg' ? 'jpg' : ext}`;
      const { uploadUrl, publicUrl } = await presign(filename, `image/${ext === 'jpg' ? 'jpeg' : ext}`);
      const response = await fetch(uri);
      const blob = await response.blob();
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': blob.type || 'image/jpeg' },
      });
      if (!putRes.ok) throw new Error('Falha no upload');
      setImageUrl(publicUrl);
    } catch (e) {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível enviar a foto.'));
    } finally {
      setUploadingPhoto(false);
    }
  }, []);

  const createMutation = useMutation({
    mutationFn: createPartnerService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'services'] });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      router.back();
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível criar o serviço.')),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updatePartnerService>[1] }) => updatePartnerService(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'partner', 'services'] });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      router.back();
    },
    onError: (e: unknown) => Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível atualizar o serviço.')),
  });

  const handleSave = () => {
    const nameTrim = name.trim();
    if (!nameTrim || nameTrim.length < 2) {
      Alert.alert('Campo obrigatório', 'Informe o nome do serviço (mín. 2 caracteres).');
      return;
    }
    if (isEdit && params.id) {
      updateMutation.mutate({
        id: params.id,
        body: {
          name: nameTrim,
          description: description.trim() || undefined,
          priceDisplay: priceDisplay.trim() || undefined,
          validUntil: validUntil.trim() || null,
          active,
          imageUrl: imageUrl?.trim() || null,
        },
      });
    } else {
      createMutation.mutate({
        name: nameTrim,
        description: description.trim() || undefined,
        priceDisplay: priceDisplay.trim() || undefined,
        validUntil: validUntil.trim() || undefined,
        imageUrl: imageUrl?.trim() || undefined,
      });
    }
  };

  if (isEdit && isLoading && !existing) {
    return (
      <ScreenContainer>
        <LoadingLogo size={120} />
      </ScreenContainer>
    );
  }

  const inputStyle = [styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }];
  const labelStyle = [styles.label, { color: colors.textSecondary }];

  return (
    <ScreenContainer scroll={false}>
      <PartnerPanelLayout>
        <ScrollView style={styles.scrollWrap} contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
        <Text style={labelStyle}>Foto do serviço (opcional)</Text>
        <TouchableOpacity
          style={[styles.photoWrap, { backgroundColor: colors.surface, borderColor: colors.primary + '40' }]}
          onPress={pickAndUploadPhoto}
          disabled={uploadingPhoto}
        >
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.photoPreview} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              {uploadingPhoto ? (
                <Text style={[styles.photoPlaceholderText, { color: colors.textSecondary }]}>Enviando...</Text>
              ) : (
                <>
                  <Ionicons name="image-outline" size={32} color={colors.textSecondary} />
                  <Text style={[styles.photoPlaceholderText, { color: colors.textSecondary }]}>Toque para adicionar foto</Text>
                </>
              )}
            </View>
          )}
        </TouchableOpacity>
        <Text style={labelStyle}>Nome do serviço *</Text>
        <TextInput style={inputStyle} placeholder="Ex: Banho e tosa" placeholderTextColor={colors.textSecondary} value={name} onChangeText={setName} />
        <Text style={labelStyle}>Preço ou valor (opcional)</Text>
        <TextInput style={inputStyle} placeholder="Ex: A partir de R$ 50 ou Sob consulta" placeholderTextColor={colors.textSecondary} value={priceDisplay} onChangeText={setPriceDisplay} />
        <Text style={labelStyle}>Validade (opcional, AAAA-MM-DD)</Text>
        <TextInput style={inputStyle} placeholder="2025-12-31" placeholderTextColor={colors.textSecondary} value={validUntil} onChangeText={setValidUntil} />
        <Text style={labelStyle}>Descrição (opcional)</Text>
        <TextInput style={[inputStyle, styles.textArea]} placeholder="Ex: Banho completo + tosa higiênica para cães" placeholderTextColor={colors.textSecondary} value={description} onChangeText={setDescription} multiline />
        {isEdit && (
          <TouchableOpacity style={styles.activeRow} onPress={() => setActive((a) => !a)}>
            <Text style={[styles.activeLabel, { color: colors.textPrimary }]}>Serviço ativo (visível no app)</Text>
            <View style={[styles.checkbox, { borderColor: active ? colors.primary : colors.textSecondary, backgroundColor: active ? colors.primary : 'transparent' }]}>
              {active ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
          </TouchableOpacity>
        )}
        <PrimaryButton
          title={isEdit ? (updateMutation.isPending ? 'Salvando...' : 'Salvar') : createMutation.isPending ? 'Criando...' : 'Cadastrar serviço'}
          onPress={handleSave}
          disabled={createMutation.isPending || updateMutation.isPending}
        />
        </ScrollView>
      </PartnerPanelLayout>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollWrap: { flex: 1 },
  form: { paddingBottom: spacing.xl, gap: spacing.sm },
  label: { fontSize: 14, fontWeight: '600', marginTop: spacing.sm },
  input: { padding: spacing.md, borderRadius: 12, borderWidth: 1, fontSize: 16 },
  textArea: { minHeight: 80, paddingTop: spacing.md },
  photoWrap: { width: '100%', height: 160, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  photoPreview: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  photoPlaceholderText: { fontSize: 14 },
  activeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  activeLabel: { fontSize: 16 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
