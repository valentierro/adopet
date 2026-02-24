import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, PrimaryButton } from '../src/components';
import { useTheme } from '../src/hooks/useTheme';
import { presign } from '../src/api/uploads';
import { requestVerification } from '../src/api/verification';
import { getFriendlyErrorMessage } from '../src/utils/errorMessage';
import { spacing } from '../src/theme';

const REQUIRED_PHOTOS_USER = 1;
const REQUIRED_PHOTOS_PET = 2;

export default function VerificationRequestScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ type: string; petId?: string; petName?: string }>();
  const { colors } = useTheme();
  const type = (params.type === 'PET_VERIFIED' ? 'PET_VERIFIED' : 'USER_VERIFIED') as 'USER_VERIFIED' | 'PET_VERIFIED';
  const petId = params.petId ?? undefined;
  const petName = params.petName ?? undefined;

  const requiredCount = type === 'USER_VERIFIED' ? REQUIRED_PHOTOS_USER : REQUIRED_PHOTOS_PET;
  const [photoUris, setPhotoUris] = useState<string[]>(Array(requiredCount).fill(''));
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [skipReason, setSkipReason] = useState('');

  const pickImage = useCallback(
    async (index: number) => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão', 'Precisamos acessar suas fotos para anexar a evidência.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'USER_VERIFIED' && index === 0 ? [1, 1] : [4, 3],
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]) return;
      setPhotoUris((prev) => {
        const next = [...prev];
        next[index] = result.assets[0].uri;
        return next;
      });
    },
    [type],
  );

  const uploadAndGetPublicUrls = useCallback(async (): Promise<string[]> => {
    const uris = photoUris.filter(Boolean);
    if (uris.length === 0) return [];
    setUploading(true);
    try {
      const publicUrls: string[] = [];
      for (let i = 0; i < uris.length; i++) {
        const uri = uris[i];
        const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
        const filename = `verification-${i}.${ext === 'jpg' ? 'jpg' : ext}`;
        const { uploadUrl, publicUrl } = await presign(filename, `image/${ext === 'jpg' ? 'jpeg' : ext}`);
        const response = await fetch(uri);
        const blob = await response.blob();
        const putRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: blob,
          headers: { 'Content-Type': blob.type || 'image/jpeg' },
        });
        if (!putRes.ok) throw new Error(`Upload falhou: ${putRes.status}`);
        publicUrls.push(publicUrl);
      }
      return publicUrls;
    } finally {
      setUploading(false);
    }
  }, [photoUris]);

  const submitWithPhotos = useCallback(async () => {
    const uris = photoUris.filter(Boolean);
    if (uris.length < requiredCount) {
      Alert.alert(
        'Fotos obrigatórias',
        type === 'USER_VERIFIED'
          ? 'Envie uma foto do seu rosto (sem óculos escuros) para solicitar verificação de perfil.'
          : 'Envie duas fotos: uma do seu rosto (sem óculos escuros) e outra sua com o pet.',
      );
      return;
    }
    setSubmitting(true);
    try {
      const evidenceUrls = await uploadAndGetPublicUrls();
      if (evidenceUrls.length < requiredCount) {
        Alert.alert('Erro', 'Falha ao enviar as fotos. Tente novamente.');
        return;
      }
      await requestVerification({
        type,
        ...(petId && { petId }),
        evidenceUrls,
      });
      queryClient.invalidateQueries({ queryKey: ['verification-status'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      if (petId) {
        queryClient.invalidateQueries({ queryKey: ['pet', petId] });
        queryClient.invalidateQueries({ queryKey: ['pets', 'mine'] });
      }
      Alert.alert(
        'Solicitação enviada',
        'Sua solicitação de verificação foi enviada. A equipe Adopet analisará em breve. Você receberá uma notificação quando houver resposta.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e: unknown) {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível enviar. Tente novamente.'));
    } finally {
      setSubmitting(false);
    }
  }, [photoUris, requiredCount, type, petId, uploadAndGetPublicUrls, router, queryClient]);

  const submitWithoutPhotos = useCallback(async () => {
    const reason = skipReason.trim();
    if (!reason) {
      Alert.alert('Motivo', 'Informe brevemente o motivo para não enviar fotos (ex.: dificuldade para tirar selfie).');
      return;
    }
    setSubmitting(true);
    setShowSkipModal(false);
    try {
      await requestVerification({
        type,
        ...(petId && { petId }),
        skipEvidenceReason: reason,
      });
      queryClient.invalidateQueries({ queryKey: ['verification-status'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      if (petId) {
        queryClient.invalidateQueries({ queryKey: ['pet', petId] });
        queryClient.invalidateQueries({ queryKey: ['pets', 'mine'] });
      }
      Alert.alert(
        'Solicitação enviada',
        'Sua solicitação foi enviada sem fotos. A equipe analisará com base nos dados do perfil/anúncio. Você receberá uma notificação quando houver resposta.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e: unknown) {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível enviar. Tente novamente.'));
    } finally {
      setSubmitting(false);
    }
  }, [type, petId, skipReason, router, queryClient]);

  const allFilled = photoUris.filter(Boolean).length >= requiredCount;

  return (
    <ScreenContainer scroll>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {type === 'USER_VERIFIED' ? 'Verificação de perfil' : 'Verificação do pet'}
        </Text>
        <View style={[styles.infoBox, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
          <Ionicons name="information-circle" size={22} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textPrimary }]}>
            Para a equipe Adopet analisar sua solicitação, envie as fotos abaixo. Assim confirmamos sua identidade
            {type === 'PET_VERIFIED' ? ' e que você está com o pet' : ''}.
          </Text>
        </View>

        {type === 'USER_VERIFIED' && (
          <View style={styles.photoSection}>
            <Text style={[styles.photoLabel, { color: colors.textPrimary }]}>
              1. Sua foto de rosto (sem óculos escuros)
            </Text>
            <TouchableOpacity
              style={[styles.photoSlot, { backgroundColor: colors.surface, borderColor: colors.textSecondary + '50' }]}
              onPress={() => pickImage(0)}
            >
              {photoUris[0] ? (
                <Image source={{ uri: photoUris[0] }} style={styles.photoPreview} resizeMode="cover" />
              ) : (
                <>
                  <Ionicons name="camera" size={40} color={colors.textSecondary} />
                  <Text style={[styles.photoPlaceholder, { color: colors.textSecondary }]}>Tirar ou escolher foto</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {type === 'PET_VERIFIED' && (
          <>
            <View style={styles.photoSection}>
              <Text style={[styles.photoLabel, { color: colors.textPrimary }]}>
                1. Sua foto de rosto (sem óculos escuros)
              </Text>
              <TouchableOpacity
                style={[styles.photoSlot, { backgroundColor: colors.surface, borderColor: colors.textSecondary + '50' }]}
                onPress={() => pickImage(0)}
              >
                {photoUris[0] ? (
                  <Image source={{ uri: photoUris[0] }} style={styles.photoPreview} resizeMode="cover" />
                ) : (
                  <>
                    <Ionicons name="camera" size={40} color={colors.textSecondary} />
                    <Text style={[styles.photoPlaceholder, { color: colors.textSecondary }]}>Tirar ou escolher foto</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.photoSection}>
              <Text style={[styles.photoLabel, { color: colors.textPrimary }]}>
                2. Foto sua com o pet {petName ? `(${petName})` : ''}
              </Text>
              <TouchableOpacity
                style={[styles.photoSlot, { backgroundColor: colors.surface, borderColor: colors.textSecondary + '50' }]}
                onPress={() => pickImage(1)}
              >
                {photoUris[1] ? (
                  <Image source={{ uri: photoUris[1] }} style={styles.photoPreview} resizeMode="cover" />
                ) : (
                  <>
                    <Ionicons name="camera" size={40} color={colors.textSecondary} />
                    <Text style={[styles.photoPlaceholder, { color: colors.textSecondary }]}>Tirar ou escolher foto</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        <PrimaryButton
          title={uploading || submitting ? 'Enviando…' : 'Enviar solicitação'}
          onPress={submitWithPhotos}
          disabled={!allFilled || uploading || submitting}
          style={styles.submitBtn}
        />

        <TouchableOpacity
          style={[styles.skipLink, { borderColor: colors.textSecondary + '50' }]}
          onPress={() => setShowSkipModal(true)}
          disabled={submitting}
        >
          <Ionicons name="accessibility-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.skipLinkText, { color: colors.textSecondary }]}>
            Não consigo enviar fotos (ex.: deficiência visual, dificuldade para selfie)
          </Text>
        </TouchableOpacity>
        <Text style={[styles.skipHint, { color: colors.textSecondary }]}>
          Quem tem deficiência visual ou outra dificuldade pode usar a opção acima. A equipe analisará com os dados do perfil/anúncio.
        </Text>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()} disabled={submitting}>
          <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>

      <Modal visible={showSkipModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Enviar sem fotos</Text>
            <Text style={[styles.modalText, { color: colors.textSecondary }]}>
              Informe brevemente o motivo (ex.: deficiência visual, dificuldade para selfie). A análise será feita apenas com os dados do perfil/anúncio.
            </Text>
            <TextInput
              style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.textSecondary + '60' }]}
              placeholder="Motivo"
              placeholderTextColor={colors.textSecondary}
              value={skipReason}
              onChangeText={setSkipReason}
              multiline
              numberOfLines={2}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.surface }]} onPress={() => setShowSkipModal(false)}>
                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={submitWithoutPhotos}
                disabled={!skipReason.trim() || submitting}
              >
                {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalBtnTextWhite}>Enviar sem fotos</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  title: { fontSize: 20, fontWeight: '700', marginBottom: spacing.md },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  infoText: { flex: 1, fontSize: 14 },
  photoSection: { marginBottom: spacing.lg },
  photoLabel: { fontSize: 14, fontWeight: '600', marginBottom: spacing.sm },
  photoSlot: {
    height: 180,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPreview: { width: '100%', height: '100%', borderRadius: 10 },
  photoPlaceholder: { marginTop: spacing.sm, fontSize: 13 },
  submitBtn: { marginTop: spacing.sm, marginBottom: spacing.lg },
  skipLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  skipLinkText: { fontSize: 14 },
  skipHint: { fontSize: 12, fontStyle: 'italic', marginBottom: spacing.xl },
  cancelBtn: { alignSelf: 'center' },
  cancelBtnText: { fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalBox: { borderRadius: 16, padding: spacing.xl },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  modalText: { fontSize: 14, marginBottom: spacing.md },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  modalActions: { flexDirection: 'row', gap: spacing.md, justifyContent: 'flex-end' },
  modalBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: 10 },
  modalBtnText: { fontSize: 15, fontWeight: '600' },
  modalBtnTextWhite: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
