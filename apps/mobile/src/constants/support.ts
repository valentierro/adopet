/**
 * Email de suporte / canal para exercício de direitos LGPD (privacidade, portabilidade, exclusão).
 * Atualize para o email real do seu negócio ou DPO.
 */
export const SUPPORT_EMAIL = 'contato@appadopet.com.br';

/** Link mailto para o usuário solicitar exclusão da conta e dos dados (LGPD / requisitos de loja). */
export const REQUEST_ACCOUNT_DELETION_URL = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Solicitação de exclusão de conta e dados - Adopet')}&body=${encodeURIComponent('Olá,\n\nSolicito a exclusão da minha conta e de todos os meus dados pessoais no aplicativo Adopet, em conformidade com a LGPD.\n\nMeu e-mail cadastrado no app: [informe aqui]\n\nAtenciosamente,')}`;
