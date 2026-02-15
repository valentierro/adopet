import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../../src/hooks/useTheme';
import { useAuthStore } from '../../../src/stores/authStore';
import { getMessages, sendMessage, type SendMessagePayload } from '../../../src/api/messages';
import { getConversation, postConversationTyping } from '../../../src/api/conversations';
import { confirmAdoption, patchPetStatus } from '../../../src/api/pets';
import { presign } from '../../../src/api/uploads';
import { BASE_URL } from '../../../src/api/client';
import { createReport } from '../../../src/api/reports';
import { blockUser } from '../../../src/api/blocks';
import { getFriendlyErrorMessage } from '../../../src/utils/errorMessage';
import { LoadingLogo, PrimaryButton, SecondaryButton } from '../../../src/components';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../../../src/theme';

const TYPING_DEBOUNCE_MS = 500;
const CHAT_IMAGE_MAX = 280;

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

const USER_REPORT_REASONS = [
  { label: 'Comportamento inadequado', value: 'INAPPROPRIATE' },
  { label: 'Spam', value: 'SPAM' },
  { label: 'Assédio', value: 'HARASSMENT' },
  { label: 'Outro', value: 'OTHER' },
];

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const userId = useAuthStore((s) => s.user?.id);
  const [text, setText] = useState('');
  const [fullScreenImageUri, setFullScreenImageUri] = useState<string | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);

  const resolveImageUri = useCallback((imageUrl: string) => {
    return imageUrl.startsWith('http')
      ? imageUrl
      : `${BASE_URL.replace(/\/v1\/?$/, '')}/${imageUrl.replace(/^\/+/, '')}`;
  }, []);

  const { data: conversation, refetch: refetchConversation } = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => getConversation(id!),
    enabled: !!id,
    refetchInterval: 4500,
    refetchIntervalInBackground: false,
  });
  const otherUserId = conversation?.otherUser?.id;
  const otherUserName = conversation?.otherUser?.name ?? 'Usuário';
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchMessages,
  } = useInfiniteQuery({
    queryKey: ['messages', id],
    queryFn: ({ pageParam }) => getMessages(id!, pageParam),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!id,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  useFocusEffect(
    useCallback(() => {
      if (id) {
        refetchConversation();
        refetchMessages();
      }
    }, [id, refetchConversation, refetchMessages]),
  );

  // Atualiza contador de não lidas após carregar mensagens (API marca como lidas no getMessages)
  useEffect(() => {
    if (id && data?.pages?.length) {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  }, [id, data?.pages?.length, queryClient]);

  const sendMutation = useMutation({
    mutationFn: (payload: SendMessagePayload) => sendMessage(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.refetchQueries({ queryKey: ['conversations'] });
    },
  });
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportDescription, setReportDescription] = useState('');

  const reportUserMutation = useMutation({
    mutationFn: ({ reason, description }: { reason: string; description?: string }) =>
      createReport({ targetType: 'USER', targetId: otherUserId!, reason, description: description?.trim() || undefined }),
    onSuccess: () => {
      setReportModalVisible(false);
      setReportReason(null);
      setReportDescription('');
      Alert.alert('Denúncia enviada', 'Obrigado. Nossa equipe analisará.');
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível enviar a denúncia.'));
    },
  });
  const blockUserMutation = useMutation({
    mutationFn: () => blockUser(otherUserId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      Alert.alert('Usuário bloqueado', 'Você não verá mais as conversas com esta pessoa.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível bloquear.'));
    },
  });

  const showChatMenu = useCallback(() => {
    if (!otherUserId) return;
    Alert.alert('Opções da conversa', 'O que deseja fazer?', [
      {
        text: 'Denunciar usuário',
        onPress: () => {
          Alert.alert(
            'Denunciar usuário',
            'Selecione o motivo:',
            [
              ...USER_REPORT_REASONS.map((r) => ({
                text: r.label,
                onPress: () => {
                  setReportReason(r.value);
                  setReportModalVisible(true);
                },
              })),
              { text: 'Cancelar', style: 'cancel' },
            ]
          );
        },
      },
      {
        text: 'Bloquear usuário',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Bloquear usuário',
            `Tem certeza que deseja bloquear ${otherUserName}? Você não verá mais as conversas com esta pessoa.`,
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Bloquear', style: 'destructive', onPress: () => blockUserMutation.mutate() },
            ]
          );
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }, [otherUserId, otherUserName, blockUserMutation]);

  const handleEnviarDenuncia = () => {
    if (!reportReason) return;
    reportUserMutation.mutate({ reason: reportReason, description: reportDescription || undefined });
  };

  // Indicador de digitação: debounce ao digitar
  useEffect(() => {
    if (!id || !text.trim()) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      postConversationTyping(id).catch(() => {});
      typingTimeoutRef.current = null;
    }, TYPING_DEBOUNCE_MS);
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [id, text]);

  const otherUserProfileLine =
    conversation?.otherUser &&
    (conversation.otherUser.housingType ||
      conversation.otherUser.hasYard !== undefined ||
      conversation.otherUser.hasOtherPets !== undefined ||
      conversation.otherUser.hasChildren !== undefined ||
      conversation.otherUser.timeAtHome)
      ? [
          conversation.otherUser.housingType === 'CASA' ? 'Casa' : conversation.otherUser.housingType === 'APARTAMENTO' ? 'Apto' : null,
          conversation.otherUser.hasYard === true ? 'Quintal' : null,
          conversation.otherUser.hasOtherPets === true ? 'Outros pets' : null,
          conversation.otherUser.hasChildren === true ? 'Crianças' : null,
          conversation.otherUser.timeAtHome === 'MOST_DAY' ? 'Em casa' : conversation.otherUser.timeAtHome === 'HALF_DAY' ? 'Metade do dia' : conversation.otherUser.timeAtHome === 'LITTLE' ? 'Pouco em casa' : null,
        ]
          .filter(Boolean)
          .join(' • ')
      : '';

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () =>
        conversation?.pet ? (
          <View style={styles.headerTitle}>
            {conversation.pet.photoUrl ? (
              <Image
                source={{ uri: conversation.pet.photoUrl }}
                style={[styles.headerPetImage, { backgroundColor: colors.surface }]}
              />
            ) : (
              <View style={[styles.headerPetImage, styles.headerPetImagePlaceholder, { backgroundColor: colors.surface }]}>
                <Ionicons name="paw" size={18} color={colors.textSecondary} />
              </View>
            )}
            <View>
              <Text style={[styles.headerUserName, { color: colors.textPrimary }]} numberOfLines={1}>
                {otherUserName}
              </Text>
              <Text style={[styles.headerPetName, { color: colors.textSecondary }]} numberOfLines={1}>
                {conversation.pet.name}
              </Text>
              {otherUserProfileLine ? (
                <Text style={[styles.headerProfileLine, { color: colors.textSecondary }]} numberOfLines={1}>
                  {otherUserProfileLine}
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          <Text style={{ color: colors.textPrimary, fontSize: 17, fontWeight: '600' }} numberOfLines={1}>
            {otherUserName}
          </Text>
        ),
      headerRight: otherUserId
        ? () => (
            <TouchableOpacity onPress={showChatMenu} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={{ padding: 8 }}>
              <Ionicons name="ellipsis-horizontal" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          )
        : undefined,
    });
  }, [navigation, otherUserId, otherUserName, conversation?.pet, conversation?.otherUser, otherUserProfileLine, showChatMenu, colors.textPrimary, colors.textSecondary, colors.surface]);

  const messages = data?.pages.flatMap((p) => p.items) ?? [];
  const adoptionFinalized = conversation?.pet?.adoptionFinalized === true;
  const canConfirmAdoption =
    !!conversation?.pet?.pendingAdopterId &&
    conversation.pet.pendingAdopterId === userId &&
    !adoptionFinalized;

  const canTutorConfirmAdoption =
    !!conversation?.pet?.isTutor &&
    conversation.pet.status !== 'ADOPTED' &&
    !!conversation.petId &&
    !!otherUserId;

  const confirmAdoptionMutation = useMutation({
    mutationFn: () => confirmAdoption(conversation!.petId!),
    onSuccess: async () => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['conversation', id] }),
        queryClient.refetchQueries({ queryKey: ['me', 'pending-adoption-confirmations'] }),
        queryClient.refetchQueries({
          predicate: (q) => q.queryKey[0] === 'me' && q.queryKey[1] === 'adoptions',
        }),
        queryClient.refetchQueries({ queryKey: ['me', 'tutor-stats'] }),
      ]);
      Alert.alert('Adoção confirmada', 'Sua confirmação foi registrada. A adoção seguirá para validação do Adopet.');
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível confirmar. Tente novamente.'));
    },
  });

  const tutorConfirmAdoptionMutation = useMutation({
    mutationFn: () =>
      patchPetStatus(conversation!.petId!, 'ADOPTED', { pendingAdopterId: otherUserId! }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['conversation', id] }),
        queryClient.refetchQueries({ queryKey: ['conversations'] }),
        queryClient.refetchQueries({ queryKey: ['pet', conversation!.petId!] }),
        queryClient.refetchQueries({ queryKey: ['me', 'tutor-stats'] }),
      ]);
      Alert.alert(
        'Pet marcado como adotado',
        `${otherUserName} foi indicado(a) como adotante. A pessoa receberá um pedido para confirmar a adoção no app; após isso, a adoção seguirá para confirmação do Adopet.`,
      );
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível marcar como adotado. Tente novamente.'));
    },
  });

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate({ content: trimmed });
    setText('');
  }, [text, sendMutation]);

  const handleSendPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão', 'Precisamos acessar suas fotos para enviar imagem.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    if (!id || sendMutation.isPending) return;
    try {
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `chat-${Date.now()}.${ext === 'jpg' ? 'jpg' : ext}`;
      const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
      const { uploadUrl, publicUrl } = await presign(filename, contentType);
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      if (!base64 || base64.length === 0) throw new Error('Imagem vazia ou inacessível.');
      const bytes = base64ToUint8Array(base64);
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
        throw new Error(errText || `Upload falhou (${putRes.status})`);
      }
      sendMutation.mutate({ imageUrl: publicUrl });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : String(e);
      Alert.alert('Erro', message || 'Não foi possível enviar a foto.');
    }
  }, [id, sendMutation]);

  const handleSavePhoto = useCallback(async () => {
    if (!fullScreenImageUri || savingPhoto) return;
    try {
      setSavingPhoto(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão', 'É necessário permitir acesso ao álbum para salvar a foto.');
        return;
      }
      const filename = `adopet-${Date.now()}.jpg`;
      const localPath = `${FileSystem.cacheDirectory}${filename}`;
      const result = await FileSystem.downloadAsync(fullScreenImageUri, localPath);
      // Android exige URI com file://; saveToLibraryAsync evita erro de argumentos em algumas versões
      const localUri =
        Platform.OS === 'android' && !result.uri.startsWith('file://')
          ? `file://${result.uri}`
          : result.uri;
      await MediaLibrary.saveToLibraryAsync(localUri);
      Alert.alert('Foto salva', 'A foto foi salva no seu álbum.');
      setFullScreenImageUri(null);
    } catch (e) {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível salvar a foto.'));
    } finally {
      setSavingPhoto(false);
    }
  }, [fullScreenImageUri, savingPhoto]);

  if (isLoading && messages.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <LoadingLogo size={140} />
      </View>
    );
  }

  return (
    <>
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        data={[...messages].reverse()}
        keyExtractor={(m) => m.id}
        inverted
        contentContainerStyle={styles.list}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        ListHeaderComponent={
          conversation?.otherUserTyping ? (
            <View style={[styles.typingRow, { backgroundColor: colors.surface }]}>
              <Text style={[styles.typingText, { color: colors.textSecondary }]}>
                {otherUserName} está digitando…
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          <>
            {canTutorConfirmAdoption && (
              <TouchableOpacity
                style={[styles.confirmAdoptionBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  Alert.alert(
                    'Confirmar adoção',
                    `Marcar este pet como adotado para ${otherUserName}? O anúncio sairá do feed e a pessoa receberá um pedido para confirmar a adoção no app.`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Confirmar',
                        onPress: () => tutorConfirmAdoptionMutation.mutate(),
                      },
                    ],
                  );
                }}
                disabled={tutorConfirmAdoptionMutation.isPending}
              >
                {tutorConfirmAdoptionMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={22} color="#fff" />
                    <Text style={styles.confirmAdoptionBtnText}>
                      Confirmar adoção para {otherUserName}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {canConfirmAdoption && (
              <TouchableOpacity
                style={[styles.confirmAdoptionBtn, { backgroundColor: colors.primary }]}
                onPress={() => confirmAdoptionMutation.mutate()}
                disabled={confirmAdoptionMutation.isPending}
              >
                {confirmAdoptionMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={22} color="#fff" />
                    <Text style={styles.confirmAdoptionBtnText}>Confirmar adoção</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            <View style={[styles.safetyTips, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
              <View style={styles.safetyTipsHeader}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                <Text style={[styles.safetyTipsTitle, { color: colors.textPrimary }]}>Dicas de segurança</Text>
              </View>
              <Text style={[styles.safetyTipsText, { color: colors.textSecondary }]}>
                • Combine o primeiro encontro em local público e movimentado.{'\n'}
                • Não envie dinheiro antes de conhecer a pessoa e o pet.{'\n'}
                • Desconfie de pedidos de depósito ou transferência antecipada.{'\n'}
                • Ao combinar entrega, prefira horário de dia e local seguro.
              </Text>
            </View>
            {adoptionFinalized && (
              <View style={[styles.adoptionBanner, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                <Text style={[styles.adoptionBannerText, { color: colors.textPrimary }]}>
                  Adoção finalizada. Esta conversa continua disponível para combinar entrega e dúvidas pós-adoção.
                </Text>
              </View>
            )}
            {isFetchingNextPage ? (
              <View style={styles.loader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null}
          </>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.senderId === userId
                ? [styles.bubbleRight, { backgroundColor: colors.primary }]
                : [styles.bubbleLeft, { backgroundColor: colors.surface }],
            ]}
          >
            {item.imageUrl ? (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setFullScreenImageUri(resolveImageUri(item.imageUrl!))}
              >
                <Image
                  source={{ uri: resolveImageUri(item.imageUrl!) }}
                  style={[styles.bubbleImage, item.content ? { marginBottom: 4 } : null]}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ) : null}
            {item.content ? (
              <Text
                style={[
                  styles.bubbleText,
                  { color: item.senderId === userId ? '#fff' : colors.textPrimary },
                ]}
              >
                {item.content}
              </Text>
            ) : null}
          </View>
        )}
      />
      <View style={[styles.inputRow, { backgroundColor: colors.surface, borderTopColor: colors.background }]}>
        <TouchableOpacity
          onPress={handleSendPhoto}
          disabled={sendMutation.isPending}
          style={[styles.attachBtn, { backgroundColor: colors.background }]}
        >
          <Ionicons name="image-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary }]}
          value={text}
          onChangeText={setText}
          placeholder="Mensagem"
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={2000}
          accessibilityLabel="Campo de mensagem"
          accessibilityHint="Digite sua mensagem para enviar na conversa"
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: colors.primary }]}
          onPress={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensagem"
          accessibilityHint="Toque duas vezes para enviar"
          accessibilityState={{ disabled: !text.trim() || sendMutation.isPending }}
        >
          <Text style={styles.sendBtnText}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>

    <Modal visible={reportModalVisible} transparent animationType="fade">
      <Pressable style={styles.reportModalOverlay} onPress={() => setReportModalVisible(false)}>
        <Pressable style={[styles.reportModalBox, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.reportModalTitle, { color: colors.textPrimary }]}>Detalhes da denúncia (opcional)</Text>
          <TextInput
            style={[styles.reportModalInput, { color: colors.textPrimary, borderColor: colors.textSecondary }]}
            placeholder="Descreva o que aconteceu, se quiser"
            placeholderTextColor={colors.textSecondary}
            value={reportDescription}
            onChangeText={setReportDescription}
            multiline
            numberOfLines={3}
            maxLength={2000}
          />
          <View style={styles.reportModalActions}>
            <SecondaryButton title="Cancelar" onPress={() => setReportModalVisible(false)} />
            <PrimaryButton
              title={reportUserMutation.isPending ? 'Enviando...' : 'Enviar'}
              onPress={handleEnviarDenuncia}
              disabled={reportUserMutation.isPending}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>

    <Modal visible={!!fullScreenImageUri} transparent animationType="fade">
      <Pressable style={styles.imageViewerOverlay} onPress={() => setFullScreenImageUri(null)}>
        <Pressable style={styles.imageViewerContent} onPress={(e) => e.stopPropagation()}>
          {fullScreenImageUri ? (
            <Image
              source={{ uri: fullScreenImageUri }}
              style={styles.imageViewerImage}
              resizeMode="contain"
            />
          ) : null}
          <View style={[styles.imageViewerActions, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[styles.imageViewerBtn, { borderColor: colors.textSecondary }]}
              onPress={() => setFullScreenImageUri(null)}
            >
              <Text style={[styles.imageViewerBtnText, { color: colors.textSecondary }]}>Fechar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.imageViewerBtn, { backgroundColor: colors.primary }]}
              onPress={handleSavePhoto}
              disabled={savingPhoto}
            >
              <Text style={styles.imageViewerBtnTextPrimary}>
                {savingPhoto ? 'Salvando...' : 'Salvar foto'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.md, paddingBottom: spacing.sm },
  loader: { padding: spacing.sm, alignItems: 'center' },
  safetyTips: {
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  safetyTipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  safetyTipsTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  safetyTipsText: {
    fontSize: 13,
    lineHeight: 20,
  },
  confirmAdoptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  confirmAdoptionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  adoptionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  adoptionBannerText: { flex: 1, fontSize: 13 },
  typingRow: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: 12, alignSelf: 'flex-start', marginBottom: spacing.xs },
  typingText: { fontSize: 13, fontStyle: 'italic' },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, maxWidth: 220 },
  headerPetImage: { width: 36, height: 36, borderRadius: 18 },
  headerPetImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  headerUserName: { fontSize: 17, fontWeight: '600' },
  headerPetName: { fontSize: 12, marginTop: 2 },
  headerProfileLine: { fontSize: 11, marginTop: 2, opacity: 0.9 },
  bubble: {
    maxWidth: '80%',
    padding: spacing.sm,
    borderRadius: 16,
    marginVertical: spacing.xs,
  },
  bubbleLeft: { alignSelf: 'flex-start' },
  bubbleRight: { alignSelf: 'flex-end' },
  bubbleText: { fontSize: 15 },
  bubbleImage: {
    width: CHAT_IMAGE_MAX,
    minHeight: 120,
    maxHeight: CHAT_IMAGE_MAX,
    borderRadius: 12,
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.sm,
    borderTopWidth: 1,
  },
  attachBtn: { padding: spacing.sm, borderRadius: 20, marginRight: spacing.sm },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    maxHeight: 100,
    fontSize: 16,
  },
  sendBtn: { marginLeft: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20 },
  sendBtnText: { color: '#fff', fontWeight: '600' },
  reportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  reportModalBox: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 12,
    padding: spacing.lg,
  },
  reportModalTitle: { fontSize: 16, fontWeight: '600', marginBottom: spacing.sm },
  reportModalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  reportModalActions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerContent: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerImage: {
    width: '100%',
    flex: 1,
  },
  imageViewerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    width: '100%',
    justifyContent: 'center',
  },
  imageViewerBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    borderWidth: 2,
  },
  imageViewerBtnText: { fontSize: 16, fontWeight: '600' },
  imageViewerBtnTextPrimary: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
