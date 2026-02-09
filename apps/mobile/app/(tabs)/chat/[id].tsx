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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../../src/hooks/useTheme';
import { useAuthStore } from '../../../src/stores/authStore';
import { getMessages, sendMessage, type SendMessagePayload } from '../../../src/api/messages';
import { getConversation, postConversationTyping } from '../../../src/api/conversations';
import { presign } from '../../../src/api/uploads';
import { createReport } from '../../../src/api/reports';
import { blockUser } from '../../../src/api/blocks';
import { getFriendlyErrorMessage } from '../../../src/utils/errorMessage';
import { LoadingLogo } from '../../../src/components';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../../../src/theme';

const TYPING_DEBOUNCE_MS = 500;
const CHAT_IMAGE_MAX = 280;

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

  const { data: conversation } = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => getConversation(id!),
    enabled: !!id,
    refetchInterval: 2000,
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
  } = useInfiniteQuery({
    queryKey: ['messages', id],
    queryFn: ({ pageParam }) => getMessages(id!, pageParam),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!id,
  });

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
    },
  });
  const reportUserMutation = useMutation({
    mutationFn: (reason: string) =>
      createReport({ targetType: 'USER', targetId: otherUserId!, reason }),
    onSuccess: () => {
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
                onPress: () => reportUserMutation.mutate(r.value),
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
  }, [otherUserId, otherUserName, reportUserMutation, blockUserMutation]);

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
      const { uploadUrl, publicUrl } = await presign(filename, `image/${ext === 'jpg' ? 'jpeg' : ext}`);
      const response = await fetch(uri);
      const blob = await response.blob();
      const putRes = await fetch(uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': blob.type || 'image/jpeg' } });
      if (!putRes.ok) throw new Error('Falha no upload');
      sendMutation.mutate({ imageUrl: publicUrl });
    } catch (e) {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível enviar a foto.'));
    }
  }, [id, sendMutation]);

  if (isLoading && messages.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <LoadingLogo size={140} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        data={[...messages].reverse()}
        keyExtractor={(m) => m.id}
        inverted
        contentContainerStyle={styles.list}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
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
              <Image
                source={{ uri: item.imageUrl }}
                style={[styles.bubbleImage, item.content ? { marginBottom: 4 } : null]}
                resizeMode="cover"
              />
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
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: colors.primary }]}
          onPress={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
        >
          <Text style={styles.sendBtnText}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.md, paddingBottom: spacing.sm },
  loader: { padding: spacing.sm, alignItems: 'center' },
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
  bubbleImage: { width: CHAT_IMAGE_MAX, maxHeight: CHAT_IMAGE_MAX, borderRadius: 12, marginBottom: 4 },
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
});
