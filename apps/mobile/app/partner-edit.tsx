import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, PrimaryButton, LoadingLogo } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { getMyPartner, updateMyPartner } from '../src/api/partner';
import { presign, confirmPartnerLogoUpload } from '../src/api/uploads';
import { getFriendlyErrorMessage } from '../src/utils/errorMessage';
import { spacing } from '../src/theme';

export default function PartnerEditScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const { data: partner, isLoading } = useQuery({ queryKey: ['me', 'partner'], queryFn: getMyPartner });
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (partner) {
      setName(partner.name ?? '');
      setCity(partner.city ?? '');
      setDescription(partner.description ?? '');
      setWebsite(partner.website ?? '');
      setPhone(partner.phone ?? '');
      setEmail(partner.email ?? '');
      setAddress(partner.address ?? '');
      setLogoUrl(partner.logoUrl ?? null);
    }
  }, [partner]);

  const updateMutation = useMutation({
    mutationFn: (body: Parameters<typeof updateMyPartner>[0]) => updateMyPartner(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'partner'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      router.back();
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível salvar.'));
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      name: name.trim() || undefined,
      city: city.trim() || undefined,
      description: description.trim() || undefined,
      website: website.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      logoUrl: logoUrl || undefined,
    });
  };

  const uploadLogoMutation = useMutation({
    mutationFn: async (uri: string) => {
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `partner-logo.${ext === 'jpg' ? 'jpg' : ext}`;
      const { uploadUrl, key } = await presign(filename, `image/${ext === 'jpg' ? 'jpeg' : ext}`);
      const response = await fetch(uri);
      const blob = await response.blob();
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': blob.type || 'image/jpeg' },
      });
      if (!putRes.ok) throw new Error(`Upload falhou: ${putRes.status}`);
      return confirmPartnerLogoUpload(key);
    },
    onSuccess: (data) => {
      setLogoUrl(data.logoUrl);
      queryClient.invalidateQueries({ queryKey: ['me', 'partner'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível enviar a logo.'));
    },
  });

  const pickAndUploadLogo = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão', 'Precisamos acessar suas fotos para definir a logo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    uploadLogoMutation.mutate(result.assets[0].uri);
  }, [uploadLogoMutation]);

  if (isLoading && !partner) {
    return (
      <ScreenContainer>
        <LoadingLogo size={120} />
      </ScreenContainer>
    );
  }
  if (!partner) {
    return null;
  }

  const inputStyle = [styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.primary + '40' }];
  const labelStyle = [styles.label, { color: colors.textSecondary }];

  return (
    <ScreenContainer scroll>
      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
        <Text style={labelStyle}>Logo do estabelecimento</Text>
        <Text style={[styles.logoHint, { color: colors.textSecondary }]}>Exibida na página de parceiros para os usuários</Text>
        <TouchableOpacity
          style={[styles.logoWrap, { backgroundColor: colors.surface, borderColor: colors.primary + '40' }]}
          onPress={pickAndUploadLogo}
          disabled={uploadLogoMutation.isPending}
        >
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.logoImage} resizeMode="contain" />
          ) : (
            <View style={[styles.logoPlaceholder, { backgroundColor: colors.background }]}>
              <Ionicons name="business-outline" size={40} color={colors.textSecondary} />
              <Text style={[styles.logoPlaceholderText, { color: colors.textSecondary }]}>
                {uploadLogoMutation.isPending ? 'Enviando...' : 'Toque para adicionar logo'}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={labelStyle}>Nome do estabelecimento</Text>
        <TextInput style={inputStyle} placeholder="Ex: Clínica Veterinária X" placeholderTextColor={colors.textSecondary} value={name} onChangeText={setName} />
        <Text style={labelStyle}>Cidade</Text>
        <TextInput style={inputStyle} placeholder="São Paulo" placeholderTextColor={colors.textSecondary} value={city} onChangeText={setCity} />
        <Text style={labelStyle}>Endereço completo</Text>
        <TextInput style={inputStyle} placeholder="Rua, número, bairro, CEP" placeholderTextColor={colors.textSecondary} value={address} onChangeText={setAddress} />
        <Text style={labelStyle}>Telefone</Text>
        <TextInput style={inputStyle} placeholder="(11) 99999-9999" placeholderTextColor={colors.textSecondary} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Text style={labelStyle}>E-mail de contato</Text>
        <TextInput style={inputStyle} placeholder="contato@estabelecimento.com" placeholderTextColor={colors.textSecondary} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Text style={labelStyle}>Site</Text>
        <TextInput style={inputStyle} placeholder="https://..." placeholderTextColor={colors.textSecondary} value={website} onChangeText={setWebsite} keyboardType="url" autoCapitalize="none" />
        <Text style={labelStyle}>Descrição</Text>
        <TextInput style={[inputStyle, styles.textArea]} placeholder="Conte sobre seu estabelecimento..." placeholderTextColor={colors.textSecondary} value={description} onChangeText={setDescription} multiline numberOfLines={4} textAlignVertical="top" />
        <PrimaryButton title={updateMutation.isPending ? 'Salvando...' : 'Salvar'} onPress={handleSave} disabled={updateMutation.isPending} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  form: { paddingBottom: spacing.xl, gap: spacing.sm },
  label: { fontSize: 14, fontWeight: '600', marginTop: spacing.sm },
  logoHint: { fontSize: 12, marginTop: 2, marginBottom: spacing.xs },
  logoWrap: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: { width: '100%', height: '100%' },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  logoPlaceholderText: { fontSize: 11, marginTop: 4, textAlign: 'center' },
  input: { padding: spacing.md, borderRadius: 12, borderWidth: 1, fontSize: 16 },
  textArea: { minHeight: 100, paddingTop: spacing.md },
});
