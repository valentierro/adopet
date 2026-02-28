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
  ScrollView,
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
import { confirmAdoption, patchPetStatus, getMatchScore, cancelAdoption, declineAdoption } from '../../../src/api/pets';
import { presign } from '../../../src/api/uploads';
import { BASE_URL } from '../../../src/api/client';
import { createReport } from '../../../src/api/reports';
import { blockUser } from '../../../src/api/blocks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFriendlyErrorMessage, isKycRequiredError, isKycNotCompleteError, getApiErrorBodyMessage } from '../../../src/utils/errorMessage';
import { getMatchScoreColor } from '../../../src/utils/matchScoreColor';
import { trackEvent } from '../../../src/analytics';
import { LoadingLogo, PrimaryButton, SecondaryButton, Toast, MatchScoreBadge, VerifiedBadge } from '../../../src/components';
import { getMe } from '../../../src/api/me';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../../../src/theme';

const CHAT_REMINDER_KEY_PREFIX = 'adopet_chat_reminder_';

const TYPING_DEBOUNCE_MS = 500;

const SPECIES_LABEL: Record<string, string> = { dog: 'Cachorro', cat: 'Gato' };
const SIZE_LABEL: Record<string, string> = { small: 'Pequeno', medium: 'Médio', large: 'Grande', xlarge: 'Muito grande' };
function formatPetBasicInfo(pet: { species?: string; size?: string; age?: number } | undefined): string {
  if (!pet) return '';
  const parts: string[] = [];
  if (pet.species) parts.push(SPECIES_LABEL[pet.species] ?? pet.species);
  if (pet.size) parts.push(SIZE_LABEL[pet.size] ?? pet.size);
  if (pet.age != null) parts.push(pet.age === 1 ? '1 ano' : `${pet.age} anos`);
  return parts.join(' • ');
}
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

/** Checklist obrigatório para o tutor antes de confirmar adoção (resguarda o app e informa responsabilidades). */
const ADOPTION_CHECKLIST_ITEMS: { key: string; label: string }[] = [
  {
    key: 'platform',
    label:
      'Entendo que o Adopet é uma plataforma de conexão entre tutores e interessados, e não se responsabiliza pela adoção em si, pela entrega do pet ou por quaisquer danos decorrentes.',
  },
  {
    key: 'followup',
    label:
      'Comprometo-me a acompanhar o bem-estar do pet após a adoção e a manter contato com o adotante para esclarecer dúvidas sobre cuidados, saúde e adaptação.',
  },
  {
    key: 'delivery',
    label:
      'Confirmo que realizei (ou que será feita em data combinada) a entrega do pet e que o adotante demonstrou condições adequadas para recebê-lo.',
  },
  {
    key: 'process',
    label:
      'Estou ciente de que o adotante receberá um pedido para confirmar a adoção no app e que a adoção seguirá para validação da equipe Adopet.',
  },
];

/** Checklist que o tutor deve marcar antes de confirmar adoção. Resguarda o app e informa responsabilidades. */
const TUTOR_ADOPTION_CHECKLIST = [
  {
    id: 'liability',
    text: 'Entendo que o Adopet é uma plataforma de conexão e não se responsabiliza pela adoção em si, pela entrega do pet ou por quaisquer danos decorrentes.',
  },
  {
    id: 'followup',
    text: 'Comprometo-me a acompanhar o bem-estar do pet após a adoção e manter contato com o adotante para esclarecer dúvidas sobre cuidados, saúde e adaptação.',
  },
  {
    id: 'delivery',
    text: 'Confirmo que realizei (ou realizarei em data combinada) a entrega do pet e que o adotante demonstrou condições adequadas para recebê-lo.',
  },
  {
    id: 'process',
    text: 'Estou ciente de que o adotante receberá um pedido para confirmar a adoção no app e que a adoção seguirá para validação da equipe Adopet.',
  },
];

/** Checklist obrigatório para o adotante antes de confirmar que realizou a adoção. */
const ADOPTER_CHECKLIST_ITEMS: { key: string; label: string }[] = [
  { key: 'care', label: 'Assumo a responsabilidade de cuidar do pet com zelo, oferecendo ambiente adequado, alimentação e cuidados veterinários.' },
  { key: 'noAbandon', label: 'Comprometo-me a não abandonar o animal e a não utilizá-lo para fins que impliquem maus-tratos ou crueldade.' },
  { key: 'contact', label: 'Estou ciente de que o doador ou o Adopet podem entrar em contato para acompanhar como o pet está e que responder é uma forma de demonstrar responsabilidade.' },
  { key: 'confirm', label: 'Confirmo que realizei a adoção e assumo todas as responsabilidades acima.' },
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
  const [reminderToast, setReminderToast] = useState<string | null>(null);
  const [showMatchScoreModal, setShowMatchScoreModal] = useState(false);
  const [matchSectionExpanded, setMatchSectionExpanded] = useState(true);
  const [mismatchSectionExpanded, setMismatchSectionExpanded] = useState(true);
  const [neutralSectionExpanded, setNeutralSectionExpanded] = useState(false);
  const [showAdoptionChecklistModal, setShowAdoptionChecklistModal] = useState(false);
  const [adoptionChecklist, setAdoptionChecklist] = useState<Record<string, boolean>>({});
  const [showAdopterChecklistModal, setShowAdopterChecklistModal] = useState(false);
  const [adopterChecklist, setAdopterChecklist] = useState<Record<string, boolean>>({});
  const [showAdoptionThankYouModal, setShowAdoptionThankYouModal] = useState(false);

  const resolveImageUri = useCallback((imageUrl: string) => {
    return imageUrl.startsWith('http')
      ? imageUrl
      : `${BASE_URL.replace(/\/v1\/?$/, '')}/${imageUrl.replace(/^\/+/, '')}`;
  }, []);

  const { data: conversation, refetch: refetchConversation } = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => getConversation(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const otherUserDeactivated = query.state.data?.otherUserDeactivated;
      if (otherUserDeactivated) return false;
      return 5000;
    },
    refetchIntervalInBackground: false,
  });
  const otherUserId = conversation?.otherUser?.id;
  const otherUserName = conversation?.otherUser?.name ?? 'Usuário';
  const otherUserKycVerified = conversation?.otherUser?.kycVerified === true;
  const otherUserIsPartner = conversation?.otherUser?.isPartner === true;
  const canMarkAsAdopterWithoutKyc = otherUserKycVerified || otherUserIsPartner;
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe });
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
    refetchInterval: (query) => {
      const conversationData = queryClient.getQueryData<{ otherUserDeactivated?: boolean }>(['conversation', id]);
      if (conversationData?.otherUserDeactivated) return false;
      return 5000;
    },
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

  // Lembrete "adoção voluntária e sem custos" uma vez por conversa
  useEffect(() => {
    if (!id || !data?.pages?.length) return;
    const messages = data.pages.flatMap((p) => p.items);
    if (messages.length === 0) return;
    const key = CHAT_REMINDER_KEY_PREFIX + id;
    AsyncStorage.getItem(key).then((seen) => {
      if (seen) return;
      setReminderToast('Lembrete: adoção no Adopet é voluntária e sem custos.');
      AsyncStorage.setItem(key, '1');
    });
  }, [id, data?.pages]);

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

  const isTutorView = !!conversation?.pet?.isTutor && !!conversation.petId && !!otherUserId;
  // Tutor vê o match do adotante com o pet; interessado vê o próprio match com o pet
  const adopterIdForMatch = isTutorView ? otherUserId! : userId!;
  const { data: matchScoreData } = useQuery({
    queryKey: ['match-score', conversation?.petId, adopterIdForMatch],
    queryFn: () => getMatchScore(conversation!.petId!, adopterIdForMatch),
    enabled: !!conversation?.petId && !!adopterIdForMatch,
  });

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

  const petBasicInfo = formatPetBasicInfo(conversation?.pet);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: conversation?.pet ? `${otherUserName} · ${conversation.pet.name}` : 'Conversa',
      headerTitleAlign: 'left' as const,
      headerRight: otherUserId
        ? () => (
            <TouchableOpacity onPress={showChatMenu} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={{ padding: 8 }}>
              <Ionicons name="ellipsis-horizontal" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          )
        : undefined,
    });
  }, [navigation, otherUserId, otherUserName, conversation?.pet, showChatMenu, colors.textPrimary]);

  const messages = data?.pages.flatMap((p) => p.items) ?? [];
  const adoptionFinalized = conversation?.pet?.adoptionFinalized === true;
  const adopterHasConfirmed = conversation?.pet?.adopterHasConfirmed === true;
  const canConfirmAdoption =
    !!conversation?.pet?.pendingAdopterId &&
    conversation.pet.pendingAdopterId === userId &&
    !adopterHasConfirmed;

  const canTutorConfirmAdoption =
    !!conversation?.pet?.isTutor &&
    conversation.pet.status !== 'ADOPTED' &&
    !!conversation.petId &&
    !!otherUserId;

  const canTutorCancelAdoption =
    !!conversation?.pet?.isTutor &&
    conversation.pet.status === 'ADOPTED' &&
    !adoptionFinalized &&
    !!conversation.petId;

  const canAdopterDeclineAdoption = !!conversation?.pet?.canAdopterDecline && !!conversation.petId;

  const confirmAdoptionMutation = useMutation({
    mutationFn: (responsibilityTermAccepted: boolean) =>
      confirmAdoption(conversation!.petId!, { responsibilityTermAccepted }),
    onSuccess: async () => {
      trackEvent({ name: 'adoption_confirmed', properties: { petId: conversation!.petId! } });
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['conversation', id] }),
        queryClient.refetchQueries({ queryKey: ['me', 'pending-adoption-confirmations'] }),
        queryClient.refetchQueries({
          predicate: (q) => q.queryKey[0] === 'me' && q.queryKey[1] === 'adoptions',
        }),
        queryClient.refetchQueries({ queryKey: ['me', 'tutor-stats'] }),
      ]);
      setShowAdopterChecklistModal(false);
      setShowAdoptionThankYouModal(true);
    },
    onError: (e: unknown) => {
      if (isKycRequiredError(e)) {
        Alert.alert(
          'Verificação necessária',
          'Para confirmar a adoção é preciso completar a verificação de identidade (KYC).',
          [
            { text: 'Fazer verificação', onPress: () => router.push('/kyc') },
            { text: 'Depois' },
          ],
        );
        return;
      }
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
      if (isKycNotCompleteError(e)) {
        const bodyMsg = getApiErrorBodyMessage(e);
        Alert.alert(
          'Verificação pendente',
          bodyMsg ?? `${otherUserName} ainda não finalizou a verificação de identidade (KYC). Peça para a pessoa completar em Perfil → Verificação de identidade.`,
        );
        return;
      }
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível marcar como adotado. Tente novamente.'));
    },
  });

  const cancelAdoptionMutation = useMutation({
    mutationFn: () => cancelAdoption(conversation!.petId!),
    onSuccess: async () => {
      trackEvent({ name: 'adoption_cancelled', properties: { petId: conversation!.petId! } });
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['conversation', id] }),
        queryClient.refetchQueries({ queryKey: ['conversations'] }),
        queryClient.refetchQueries({ queryKey: ['pet', conversation!.petId!] }),
        queryClient.refetchQueries({ queryKey: ['me', 'tutor-stats'] }),
      ]);
      Alert.alert('Processo cancelado', 'O pet voltou a ficar disponível. O adotante indicado foi notificado.');
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível cancelar. Tente novamente.'));
    },
  });

  const declineAdoptionMutation = useMutation({
    mutationFn: () => declineAdoption(conversation!.petId!),
    onSuccess: async () => {
      trackEvent({ name: 'adoption_declined_by_adopter', properties: { petId: conversation!.petId! } });
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['conversation', id] }),
        queryClient.refetchQueries({ queryKey: ['conversations'] }),
        queryClient.refetchQueries({ queryKey: ['pet', conversation!.petId!] }),
        queryClient.refetchQueries({ queryKey: ['me', 'pending-adoption-confirmations'] }),
        queryClient.refetchQueries({ predicate: (q) => q.queryKey[0] === 'me' && q.queryKey[1] === 'adoptions' }),
        queryClient.refetchQueries({ queryKey: ['me', 'tutor-stats'] }),
      ]);
      Alert.alert('Você desistiu', 'O pet voltou a ficar disponível. O tutor foi notificado.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (e: unknown) => {
      Alert.alert('Erro', getFriendlyErrorMessage(e, 'Não foi possível desistir. Tente novamente.'));
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
      {conversation?.pet ? (
        <View style={[styles.chatInfoBar, { backgroundColor: colors.surface, borderBottomColor: colors.border ?? colors.surface }]}>
          <View style={styles.chatInfoBarRow}>
            {conversation.pet.photoUrl ? (
              <Image
                source={{ uri: conversation.pet.photoUrl }}
                style={[styles.chatInfoBarImage, { backgroundColor: colors.background }]}
              />
            ) : (
              <View style={[styles.chatInfoBarImage, styles.chatInfoBarImagePlaceholder, { backgroundColor: colors.background }]}>
                <Ionicons name="paw" size={22} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.chatInfoBarText}>
              {conversation.petId && !isTutorView ? (
                <View style={styles.chatInfoBarNameRow}>
                  <TouchableOpacity
                    onPress={() =>
                      conversation.otherUserDeactivated
                        ? router.push('/user-unavailable')
                        : router.push({ pathname: '/tutor-profile', params: { petId: conversation.petId! } })
                    }
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }}
                  >
                    <Text style={[styles.chatInfoBarTutorName, styles.chatInfoBarTutorNameLink, { color: colors.primary }]} numberOfLines={1}>
                      {otherUserName}
                    </Text>
                  </TouchableOpacity>
                  {otherUserKycVerified && <VerifiedBadge size={14} iconBackgroundColor={colors.primary} />}
                </View>
              ) : (
                <View style={styles.chatInfoBarNameRow}>
                  {conversation.petId && isTutorView && conversation.otherUser ? (
                    <TouchableOpacity
                      onPress={() =>
                        conversation.otherUserDeactivated
                          ? router.push('/user-unavailable')
                          : router.push({ pathname: '/tutor-profile', params: { userId: conversation.otherUser.id } })
                      }
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }}
                    >
                      <Text style={[styles.chatInfoBarTutorName, styles.chatInfoBarTutorNameLink, { color: colors.primary }]} numberOfLines={1}>
                        {otherUserName}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.chatInfoBarTutorName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {otherUserName}
                    </Text>
                  )}
                  {otherUserKycVerified && <VerifiedBadge size={14} iconBackgroundColor={colors.primary} />}
                </View>
              )}
              <Text style={[styles.chatInfoBarPetName, { color: colors.textSecondary }]} numberOfLines={1}>
                {conversation.pet.name}
              </Text>
              {petBasicInfo ? (
                <Text style={[styles.chatInfoBarBasicInfo, { color: colors.textSecondary }]} numberOfLines={1}>
                  {petBasicInfo}
                </Text>
              ) : null}
              {otherUserProfileLine ? (
                <Text style={[styles.chatInfoBarProfileLine, { color: colors.textSecondary }]} numberOfLines={1}>
                  {otherUserProfileLine}
                </Text>
              ) : null}
            </View>
            {matchScoreData?.score != null ? (
              <TouchableOpacity
                style={styles.chatInfoBarMatch}
                onPress={() => setShowMatchScoreModal(true)}
                activeOpacity={0.8}
                accessibilityLabel={`Match ${matchScoreData.score}% ${isTutorView ? 'com este adotante' : 'com você'}. Toque para ver detalhes.`}
                accessibilityRole="button"
              >
                <MatchScoreBadge
                  data={matchScoreData}
                  size="medium"
                  contextLabel={isTutorView ? 'com este adotante' : 'com você'}
                />
                <Ionicons name="chevron-down" size={14} color={getMatchScoreColor(matchScoreData.score)} style={styles.chatMatchBadgeChevron} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}
      {conversation?.otherUserDeactivated ? (
        <View style={[styles.chatDeactivatedBanner, { backgroundColor: (colors.error || '#DC2626') + '18', borderColor: (colors.error || '#DC2626') + '40' }]}>
          <Ionicons name="information-circle" size={22} color={colors.error || '#DC2626'} />
          <Text style={[styles.chatDeactivatedText, { color: colors.textPrimary }]}>
            Este chat foi desativado pois o usuário não está mais ativo no app.
          </Text>
        </View>
      ) : null}
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
            <View style={[styles.chatDisclaimerWrap, { backgroundColor: colors.primary + '0c' }]}>
              <Text style={[styles.chatDisclaimerText, { color: colors.textSecondary }]}>
                Adoção responsável, voluntária e sem custos
              </Text>
            </View>
            {canConfirmAdoption && me?.kycStatus !== 'VERIFIED' && !me?.isPartner && (
              <TouchableOpacity
                style={[styles.kycBannerChat, { backgroundColor: (colors.warning || '#d97706') + '22', borderColor: (colors.warning || '#d97706') + '60' }]}
                onPress={() => router.push('/kyc')}
                activeOpacity={0.8}
              >
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.warning || '#d97706'} />
                <Text style={[styles.kycBannerChatText, { color: colors.textPrimary }]}>
                  Para concluir o processo de adoção, complete a verificação de identidade (KYC).
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            {canTutorCancelAdoption && (
              <TouchableOpacity
                style={[styles.confirmAdoptionBtn, { backgroundColor: colors.surface, borderWidth: 2, borderColor: (colors.error || '#dc2626') + '80' }]}
                onPress={() => {
                  Alert.alert(
                    'Cancelar processo',
                    'O pet voltará a ficar disponível e o adotante indicado será notificado. Deseja continuar?',
                    [
                      { text: 'Não', style: 'cancel' },
                      {
                        text: 'Sim, cancelar',
                        style: 'destructive',
                        onPress: () => cancelAdoptionMutation.mutate(),
                      },
                    ],
                  );
                }}
                disabled={cancelAdoptionMutation.isPending}
              >
                {cancelAdoptionMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={22} color={colors.error || '#dc2626'} />
                    <Text style={[styles.confirmAdoptionBtnText, { color: colors.error || '#dc2626' }]}>
                      Cancelar processo de adoção
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {canTutorConfirmAdoption && (
              <>
                {!canMarkAsAdopterWithoutKyc && (
                  <Text style={[styles.confirmAdoptionHint, { color: colors.textSecondary }]}>
                    Só é possível marcar como adotante quem tiver concluído a verificação de identidade (KYC). Parceiros estão isentos.
                  </Text>
                )}
                <TouchableOpacity
                  style={[styles.confirmAdoptionBtn, { backgroundColor: colors.primary }, !canMarkAsAdopterWithoutKyc && { opacity: 0.85 }]}
                  onPress={() => {
                  if (!canMarkAsAdopterWithoutKyc) {
                    Alert.alert(
                      'Verificação pendente',
                      `${otherUserName} ainda não finalizou a verificação de identidade (KYC). A pessoa precisa completar em Perfil → Verificação de identidade para que você possa marcá-la como adotante. Parceiros (ONG/estabelecimento) estão isentos.`,
                    );
                    return;
                  }
                  setAdoptionChecklist({});
                  setShowAdoptionChecklistModal(true);
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
              </>
            )}
            {canConfirmAdoption && (
              <TouchableOpacity
                style={[styles.confirmAdoptionBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setAdopterChecklist({});
                  setShowAdopterChecklistModal(true);
                }}
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
            {canAdopterDeclineAdoption && (
              <TouchableOpacity
                style={[styles.confirmAdoptionBtn, { backgroundColor: colors.surface, borderWidth: 2, borderColor: (colors.error || '#dc2626') + '80' }]}
                onPress={() => {
                  Alert.alert(
                    'Desistir da adoção',
                    'O pet voltará a ficar disponível e o tutor será notificado. Deseja continuar?',
                    [
                      { text: 'Não', style: 'cancel' },
                      {
                        text: 'Sim, desistir',
                        style: 'destructive',
                        onPress: () => declineAdoptionMutation.mutate(),
                      },
                    ],
                  );
                }}
                disabled={declineAdoptionMutation.isPending}
              >
                {declineAdoptionMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={22} color={colors.error || '#dc2626'} />
                    <Text style={[styles.confirmAdoptionBtnText, { color: colors.error || '#dc2626' }]}>
                      Desistir da adoção
                    </Text>
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
                • Não é permitida a comercialização de animais no Adopet — a adoção é voluntária e sem custos.{'\n'}
                • Combine o primeiro encontro em local público e movimentado.{'\n'}
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
            {item.senderId === userId ? (
              <View style={styles.bubbleMetaRow}>
                <Text style={[styles.bubbleMetaText, { color: 'rgba(255,255,255,0.8)' }]}>
                  {item.readAt ? 'Lida' : 'Enviada'}
                </Text>
                <Ionicons
                  name={item.readAt ? 'checkmark-done' : 'checkmark'}
                  size={12}
                  color="rgba(255,255,255,0.8)"
                  style={styles.bubbleMetaIcon}
                />
              </View>
            ) : null}
          </View>
        )}
      />
      {!conversation?.otherUserDeactivated ? (
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
      ) : (
        <View style={[styles.inputRowDisabled, { backgroundColor: colors.surface, borderTopColor: colors.background }]}>
          <Text style={[styles.inputRowDisabledText, { color: colors.textSecondary }]}>
            Não é possível enviar mensagens neste chat.
          </Text>
        </View>
      )}
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

      {showAdoptionChecklistModal && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowAdoptionChecklistModal(false)}>
          <Pressable style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={() => setShowAdoptionChecklistModal(false)}>
            <Pressable
              style={[styles.modalCard, styles.matchScoreModalCard, { backgroundColor: colors.surface, maxHeight: '85%' }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={[styles.matchScoreModalHeader, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="checkmark-done-outline" size={36} color={colors.primary} />
                <Text style={[styles.matchScoreModalScore, { color: colors.primary, fontSize: 20 }]}>Antes de confirmar</Text>
                <Text style={[styles.matchScoreModalSubtitle, { color: colors.textSecondary }]}>
                  Marque todos os itens para prosseguir
                </Text>
              </View>
              <ScrollView style={styles.matchScoreModalScroll} contentContainerStyle={styles.matchScoreModalScrollContent} showsVerticalScrollIndicator>
                {ADOPTION_CHECKLIST_ITEMS.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.adoptionChecklistRow, { borderColor: colors.textSecondary + '40' }]}
                    onPress={() =>
                      setAdoptionChecklist((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                    }
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.adoptionChecklistBox,
                        {
                          borderColor: adoptionChecklist[item.key] ? colors.primary : colors.textSecondary + '60',
                          backgroundColor: adoptionChecklist[item.key] ? colors.primary : 'transparent',
                        },
                      ]}
                    >
                      {adoptionChecklist[item.key] && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </View>
                    <Text style={[styles.adoptionChecklistLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.adoptionChecklistActions}>
                <TouchableOpacity
                  style={[styles.adoptionChecklistBtn, { borderColor: colors.textSecondary }]}
                  onPress={() => setShowAdoptionChecklistModal(false)}
                >
                  <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.adoptionChecklistBtn,
                    {
                      backgroundColor: colors.primary,
                      borderWidth: 0,
                      opacity:
                        ADOPTION_CHECKLIST_ITEMS.every((i) => adoptionChecklist[i.key]) ? 1 : 0.5,
                    },
                  ]}
                  disabled={
                    !ADOPTION_CHECKLIST_ITEMS.every((i) => adoptionChecklist[i.key]) ||
                    tutorConfirmAdoptionMutation.isPending
                  }
                  onPress={() => {
                    if (!ADOPTION_CHECKLIST_ITEMS.every((i) => adoptionChecklist[i.key])) return;
                    setShowAdoptionChecklistModal(false);
                    setAdoptionChecklist({});
                    tutorConfirmAdoptionMutation.mutate();
                  }}
                >
                  {tutorConfirmAdoptionMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Confirmar adoção para {otherUserName}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {showAdopterChecklistModal && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowAdopterChecklistModal(false)}>
          <Pressable style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={() => setShowAdopterChecklistModal(false)}>
            <Pressable
              style={[styles.modalCard, styles.matchScoreModalCard, { backgroundColor: colors.surface, maxHeight: '85%' }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={[styles.matchScoreModalHeader, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="checkmark-done-outline" size={36} color={colors.primary} />
                <Text style={[styles.matchScoreModalScore, { color: colors.primary, fontSize: 20 }]}>Antes de confirmar</Text>
                <Text style={[styles.matchScoreModalSubtitle, { color: colors.textSecondary }]}>
                  Marque todos os itens para confirmar que realizou a adoção
                </Text>
              </View>
              <ScrollView style={styles.matchScoreModalScroll} contentContainerStyle={styles.matchScoreModalScrollContent} showsVerticalScrollIndicator>
                {ADOPTER_CHECKLIST_ITEMS.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.adoptionChecklistRow, { borderColor: colors.textSecondary + '40' }]}
                    onPress={() =>
                      setAdopterChecklist((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                    }
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.adoptionChecklistBox,
                        {
                          borderColor: adopterChecklist[item.key] ? colors.primary : colors.textSecondary + '60',
                          backgroundColor: adopterChecklist[item.key] ? colors.primary : 'transparent',
                        },
                      ]}
                    >
                      {adopterChecklist[item.key] && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </View>
                    <Text style={[styles.adoptionChecklistLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.adoptionChecklistActions}>
                <TouchableOpacity
                  style={[styles.adoptionChecklistBtn, { borderColor: colors.textSecondary }]}
                  onPress={() => setShowAdopterChecklistModal(false)}
                  disabled={declineAdoptionMutation.isPending}
                >
                  <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.adoptionChecklistBtn, { borderColor: (colors.error || '#dc2626') + '80' }]}
                  onPress={() => {
                    Alert.alert(
                      'Desistir da adoção',
                      'O pet voltará a ficar disponível e o tutor será notificado. Deseja continuar?',
                      [
                        { text: 'Não', style: 'cancel' },
                        {
                          text: 'Sim, desistir',
                          style: 'destructive',
                          onPress: () => {
                            setShowAdopterChecklistModal(false);
                            declineAdoptionMutation.mutate();
                          },
                        },
                      ],
                    );
                  }}
                  disabled={declineAdoptionMutation.isPending}
                >
                  {declineAdoptionMutation.isPending ? (
                    <ActivityIndicator size="small" color={colors.error || '#dc2626'} />
                  ) : (
                    <Text style={{ color: colors.error || '#dc2626', fontWeight: '600' }}>Desistir</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.adoptionChecklistBtn,
                    {
                      backgroundColor: colors.primary,
                      borderWidth: 0,
                      opacity: ADOPTER_CHECKLIST_ITEMS.every((i) => adopterChecklist[i.key]) ? 1 : 0.5,
                    },
                  ]}
                  disabled={
                    !ADOPTER_CHECKLIST_ITEMS.every((i) => adopterChecklist[i.key]) ||
                    confirmAdoptionMutation.isPending ||
                    declineAdoptionMutation.isPending
                  }
                  onPress={() => {
                    if (!ADOPTER_CHECKLIST_ITEMS.every((i) => adopterChecklist[i.key])) return;
                    setShowAdopterChecklistModal(false);
                    setAdopterChecklist({});
                    confirmAdoptionMutation.mutate(true);
                  }}
                >
                  {confirmAdoptionMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Confirmar adoção</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      <Modal visible={showAdoptionThankYouModal} transparent animationType="fade">
        <Pressable style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={() => setShowAdoptionThankYouModal(false)}>
          <Pressable style={[styles.thankYouModalCard, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.thankYouIconWrap, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="heart" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.thankYouTitle, { color: colors.textPrimary }]}>Obrigado! Adoção confirmada</Text>
            <Text style={[styles.thankYouText, { color: colors.textSecondary }]}>
              Sua confirmação foi registrada com sucesso. A adoção seguirá para validação da equipe Adopet.
              {'\n\n'}
              Isso não atrapalha o processo: você pode seguir o combinado com o tutor para concretizar a adoção (encontro, entrega do pet, etc.).
            </Text>
            <TouchableOpacity
              style={[styles.thankYouBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowAdoptionThankYouModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.thankYouBtnText}>Entendi</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {showMatchScoreModal && matchScoreData && matchScoreData.score != null && (() => {
        const criteria = matchScoreData.criteria ?? [];
        const matchItems = criteria.length > 0
          ? criteria.filter((c) => c.status === 'match').map((c) => c.message)
          : (matchScoreData.highlights ?? []);
        const mismatchItems = criteria.length > 0
          ? criteria.filter((c) => c.status === 'mismatch').map((c) => c.message)
          : (matchScoreData.concerns ?? []);
        const neutralItems = criteria.length > 0
          ? criteria.filter((c) => c.status === 'neutral').map((c) => c.message)
          : [];
        const hex = getMatchScoreColor(matchScoreData.score);
        return (
          <Modal visible transparent animationType="fade" onRequestClose={() => setShowMatchScoreModal(false)}>
            <Pressable style={styles.modalOverlay} onPress={() => setShowMatchScoreModal(false)}>
              <Pressable style={[styles.modalCard, styles.matchScoreModalCard, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
                <View style={[styles.matchScoreModalHeader, { backgroundColor: hex + '20' }]}>
                  <View style={styles.matchScoreModalHeaderInner}>
                    <Ionicons name="speedometer-outline" size={40} color={hex} style={styles.matchScoreModalHeaderIcon} />
                    <Text style={[styles.matchScoreModalScore, { color: hex }]}>{matchScoreData.score}%</Text>
                    <Text style={[styles.matchScoreModalSubtitle, { color: colors.textSecondary }]}>
                      {isTutorView ? 'compatibilidade com este adotante' : 'compatibilidade com você'}
                    </Text>
                  </View>
                </View>
                <ScrollView style={styles.matchScoreModalScroll} contentContainerStyle={styles.matchScoreModalScrollContent} showsVerticalScrollIndicator={true} bounces={true}>
                  {matchItems.length > 0 ? (
                    <View style={styles.matchScoreModalSection}>
                      <TouchableOpacity
                        style={styles.matchScoreModalSectionHeader}
                        onPress={() => setMatchSectionExpanded((e) => !e)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.matchScoreModalSectionTitle, { color: hex }]}>Pontos em comum</Text>
                        <Text style={[styles.matchScoreModalSectionCount, { color: colors.textSecondary }]}>{matchItems.length}</Text>
                        <Ionicons name={matchSectionExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                      {matchSectionExpanded && matchItems.map((msg, i) => (
                        <View key={i} style={styles.matchScoreModalRow}>
                          <View style={styles.matchScoreModalRowIcon}>
                            <Ionicons name="checkmark-circle" size={18} color={hex} />
                          </View>
                          <Text style={[styles.matchScoreModalItem, { color: colors.textPrimary }]}>{String(msg).replace(/\n/g, ' ')}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  {mismatchItems.length > 0 ? (
                    <View style={styles.matchScoreModalSection}>
                      <TouchableOpacity
                        style={styles.matchScoreModalSectionHeader}
                        onPress={() => setMismatchSectionExpanded((e) => !e)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.matchScoreModalSectionTitle, { color: colors.textSecondary }]}>Pontos de atenção</Text>
                        <Text style={[styles.matchScoreModalSectionCount, { color: colors.textSecondary }]}>{mismatchItems.length}</Text>
                        <Ionicons name={mismatchSectionExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                      {mismatchSectionExpanded && mismatchItems.map((msg, i) => (
                        <View key={i} style={styles.matchScoreModalRow}>
                          <View style={styles.matchScoreModalRowIcon}>
                            <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
                          </View>
                          <Text style={[styles.matchScoreModalItem, { color: colors.textSecondary }]}>{String(msg).replace(/\n/g, ' ')}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  {neutralItems.length > 0 ? (
                    <View style={styles.matchScoreModalSection}>
                      <TouchableOpacity
                        style={styles.matchScoreModalSectionHeader}
                        onPress={() => setNeutralSectionExpanded((e) => !e)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.matchScoreModalSectionTitle, { color: colors.textSecondary }]}>Não informado no perfil</Text>
                        <Text style={[styles.matchScoreModalSectionCount, { color: colors.textSecondary }]}>{neutralItems.length}</Text>
                        <Ionicons name={neutralSectionExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                      {neutralSectionExpanded && neutralItems.map((msg, i) => (
                        <View key={i} style={styles.matchScoreModalRow}>
                          <View style={styles.matchScoreModalRowIcon}>
                            <Ionicons name="help-circle-outline" size={18} color={colors.textSecondary} />
                          </View>
                          <Text style={[styles.matchScoreModalItem, { color: colors.textSecondary }]}>{String(msg).replace(/\n/g, ' ')}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </ScrollView>
                <TouchableOpacity
                  style={[styles.matchScoreModalCloseBtn, { backgroundColor: hex }]}
                  onPress={() => setShowMatchScoreModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.matchScoreModalCloseText}>Fechar</Text>
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          </Modal>
        );
      })()}

    <Toast message={reminderToast} onHide={() => setReminderToast(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.md, paddingBottom: spacing.sm },
  loader: { padding: spacing.sm, alignItems: 'center' },
  kycBannerChat: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  kycBannerChatText: { flex: 1, fontSize: 13 },
  chatDisclaimerWrap: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  chatDisclaimerText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
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
  confirmAdoptionHint: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
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
  chatDeactivatedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.sm,
    marginTop: spacing.xs,
    borderRadius: 10,
    borderWidth: 1,
  },
  chatDeactivatedText: { flex: 1, fontSize: 14 },
  chatInfoBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  chatInfoBarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chatInfoBarImage: { width: 48, height: 48, borderRadius: 24 },
  chatInfoBarImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  chatInfoBarText: { flex: 1, minWidth: 0, gap: 2 },
  chatInfoBarNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chatInfoBarTutorName: { fontSize: 16, fontWeight: '700' },
  chatInfoBarTutorNameLink: { textDecorationLine: 'underline' },
  chatInfoBarPetName: { fontSize: 14, marginTop: 1, fontWeight: '500' },
  chatInfoBarBasicInfo: { fontSize: 12, marginTop: 1, opacity: 0.95 },
  chatInfoBarProfileLine: { fontSize: 11, marginTop: 2, opacity: 0.9 },
  chatInfoBarMatch: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.xs,
    gap: 2,
  },
  chatMatchBadgeChevron: { marginLeft: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
  },
  matchScoreModalCard: {
    maxWidth: 340,
    width: '100%',
    alignItems: 'stretch',
    maxHeight: '85%',
  },
  thankYouModalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
  },
  thankYouIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  thankYouTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: spacing.md },
  thankYouText: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: spacing.lg },
  thankYouBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  thankYouBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  matchScoreModalHeader: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    marginBottom: spacing.md,
    width: '100%',
  },
  matchScoreModalHeaderInner: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchScoreModalHeaderIcon: { marginBottom: spacing.sm },
  matchScoreModalScore: { fontSize: 48, fontWeight: '700' },
  matchScoreModalSubtitle: { fontSize: 13, marginTop: 4 },
  matchScoreModalScroll: {
    flexGrow: 1,
    flexShrink: 1,
    maxHeight: 320,
    marginBottom: spacing.sm,
    alignSelf: 'stretch',
  },
  matchScoreModalScrollContent: {
    paddingBottom: spacing.sm,
  },
  matchScoreModalSection: {
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    paddingBottom: spacing.sm,
    alignItems: 'flex-start',
    width: '100%',
  },
  matchScoreModalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  matchScoreModalSectionTitle: { fontSize: 14, fontWeight: '600', flex: 1 },
  matchScoreModalSectionCount: { fontSize: 13 },
  matchScoreModalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    width: '100%',
  },
  matchScoreModalRowIcon: { width: 22, marginRight: spacing.sm },
  matchScoreModalItem: { flex: 1, fontSize: 14, lineHeight: 20, textAlign: 'left' },
  adoptionChecklistRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  adoptionChecklistBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adoptionChecklistLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  adoptionChecklistActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  adoptionChecklistBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  matchScoreModalCloseBtn: {
    alignSelf: 'stretch',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  matchScoreModalCloseText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  bubble: {
    maxWidth: '80%',
    padding: spacing.sm,
    borderRadius: 16,
    marginVertical: spacing.xs,
  },
  bubbleLeft: { alignSelf: 'flex-start' },
  bubbleRight: { alignSelf: 'flex-end' },
  bubbleText: { fontSize: 15 },
  bubbleMetaRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 2, gap: 4 },
  bubbleMetaText: { fontSize: 11 },
  bubbleMetaIcon: {},
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
  inputRowDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
  },
  inputRowDisabledText: { fontSize: 14 },
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
