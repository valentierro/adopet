import { api } from './client';

export type PartnershipRequestPayload = {
  tipo: 'ong' | 'comercial';
  nome: string;
  email: string;
  instituicao: string;
  telefone: string;
  mensagem?: string;
  /** ONG */
  cnpj?: string;
  anoFundacao?: string;
  cep?: string;
  endereco?: string;
  /** Comercial */
  personType?: 'PF' | 'CNPJ';
  documentoComercial?: string;
  planoDesejado?: string;
};

/**
 * Envia solicitação de parceria (ONG ou comercial) por e-mail. Rota pública, sem autenticação.
 */
export async function postPartnershipRequest(payload: PartnershipRequestPayload): Promise<{ ok: true }> {
  return api.post<{ ok: true }>('/public/partnership-request', payload, { skipAuth: true });
}
