import { api } from './client';

export type AdoptionFormQuestionDto = {
  id?: string;
  sortOrder?: number;
  type: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  useForScoring?: boolean;
  weight?: number;
  scoringConfig?: Record<string, unknown>;
};

export type AdoptionFormTemplateWithQuestions = {
  id: string;
  partnerId: string;
  name: string;
  version: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  questions: Array<{
    id: string;
    templateId?: string;
    sortOrder: number;
    type: string;
    label: string;
    required: boolean;
    placeholder?: string | null;
    options?: unknown;
    useForScoring?: boolean;
    weight?: number;
    scoringConfig?: Record<string, unknown>;
  }>;
};

export async function listAdoptionFormTemplates(): Promise<AdoptionFormTemplateWithQuestions[]> {
  return api.get<AdoptionFormTemplateWithQuestions[]>('/partners/me/adoption-forms') ?? [];
}

export async function getAdoptionFormTemplate(id: string): Promise<AdoptionFormTemplateWithQuestions> {
  const res = await api.get<AdoptionFormTemplateWithQuestions>(`/partners/me/adoption-forms/${id}`);
  if (!res) throw new Error('Template não encontrado');
  return res;
}

export async function createAdoptionFormTemplate(payload: {
  name: string;
  questions: AdoptionFormQuestionDto[];
}): Promise<AdoptionFormTemplateWithQuestions> {
  return api.post<AdoptionFormTemplateWithQuestions>('/partners/me/adoption-forms', payload);
}

export async function updateAdoptionFormTemplate(
  id: string,
  payload: { name?: string; questions?: AdoptionFormQuestionDto[] },
): Promise<AdoptionFormTemplateWithQuestions> {
  return api.patch<AdoptionFormTemplateWithQuestions>(`/partners/me/adoption-forms/${id}`, payload);
}

export async function deactivateAdoptionFormTemplate(id: string): Promise<{ message: string }> {
  return api.delete<{ message: string }>(`/partners/me/adoption-forms/${id}`);
}
