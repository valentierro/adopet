import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { api, BASE_URL } from './client';

export type AdoptionFormQuestion = {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string | null;
  options?: unknown;
  sortOrder?: number;
};

export type AdoptionRequestWithDetails = {
  id: string;
  petId: string;
  adopterId: string;
  conversationId: string;
  templateId: string | null;
  status: string;
  formSentAt: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  rejectionFeedback: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  pet?: { id: string; name: string };
  adopter?: { id: string; name: string };
  submission?: {
    id: string;
    templateSnapshot: unknown;
    answers: unknown;
    consentAt: string;
    submittedAt: string;
    matchScore?: number | null;
    matchScoreBreakdown?: Array<{
      questionId: string;
      label: string;
      weight: number;
      answerDisplay: string;
      points: number;
      maxPoints: number;
      status: 'match' | 'mismatch' | 'neutral';
    }>;
    matchScoreCalculatedAt?: string | null;
  };
};

export type FormForRequest = {
  requestId: string;
  expiresAt?: string | null;
  template: {
    id: string;
    name: string;
    questions: AdoptionFormQuestion[];
  };
};

export async function getMyAdoptionRequests(): Promise<AdoptionRequestWithDetails[]> {
  return api.get<AdoptionRequestWithDetails[]>('/adoption-requests/my-requests') ?? [];
}

export async function getAdoptionRequestForm(requestId: string): Promise<FormForRequest> {
  const res = await api.get<FormForRequest>(`/adoption-requests/${requestId}/form`);
  if (!res) throw new Error('Formulário não encontrado');
  return res;
}

export async function getAdoptionRequest(requestId: string): Promise<AdoptionRequestWithDetails> {
  const res = await api.get<AdoptionRequestWithDetails>(`/adoption-requests/${requestId}`);
  if (!res) throw new Error('Solicitação não encontrada');
  return res;
}

export async function submitAdoptionForm(
  requestId: string,
  payload: { answers: Record<string, unknown>; consentAt: string },
): Promise<AdoptionRequestWithDetails> {
  return api.post<AdoptionRequestWithDetails>(`/adoption-requests/${requestId}/submit`, payload);
}

/** Parceiro: envia formulário ao interessado */
export async function sendAdoptionForm(payload: {
  conversationId: string;
  templateId?: string;
}): Promise<AdoptionRequestWithDetails> {
  return api.post<AdoptionRequestWithDetails>('/adoption-requests/send-form', payload);
}

/** Parceiro: lista solicitações (opcional por pet) */
export async function listAdoptionRequests(petId?: string): Promise<AdoptionRequestWithDetails[]> {
  const params = petId ? { petId } : undefined;
  return api.get<AdoptionRequestWithDetails[]>('/adoption-requests', params) ?? [];
}

/** Parceiro: aprova solicitação */
export async function approveAdoptionRequest(requestId: string): Promise<AdoptionRequestWithDetails> {
  return api.post<AdoptionRequestWithDetails>(`/adoption-requests/${requestId}/approve`, {});
}

/** Parceiro: rejeita solicitação com feedback opcional */
export async function rejectAdoptionRequest(
  requestId: string,
  payload?: { feedback?: string },
): Promise<AdoptionRequestWithDetails> {
  return api.post<AdoptionRequestWithDetails>(`/adoption-requests/${requestId}/reject`, payload ?? {});
}

/** Parceiro: baixa PDF do formulário preenchido e abre o compartilhamento */
export async function downloadAdoptionRequestSubmissionPdf(
  requestId: string,
  getToken: () => string | null,
  petName?: string,
): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('Não autenticado');
  const url = `${BASE_URL.replace(/\/$/, '')}/adoption-requests/${requestId}/submission/pdf`;
  const safeName = (petName || 'adocao').replace(/[^a-z0-9\u00C0-\u024F-]/gi, '-').replace(/-+/g, '-') || 'adocao';
  const filename = `formulario-${safeName}-${Date.now()}.pdf`;
  const localUri = FileSystem.documentDirectory + filename;
  const result = await FileSystem.downloadAsync(url, localUri, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (result.status !== 200) {
    throw new Error(`Falha ao baixar o PDF (status ${result.status})`);
  }
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Compartilhamento não disponível neste dispositivo');
  await Sharing.shareAsync(localUri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Salvar formulário de adoção',
  });
}
