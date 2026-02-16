/**
 * E-mail enviado para parcerias@appadopet.com.br quando um usuário envia solicitação de parceria (ONG ou comercial) pelo app.
 */
export type PartnershipRequestEmailData = {
  tipo: 'ong' | 'comercial';
  nome: string;
  email: string;
  instituicao: string;
  telefone: string;
  mensagem?: string | null;
  /** ONG */
  cnpj?: string | null;
  anoFundacao?: string | null;
  cep?: string | null;
  endereco?: string | null;
  /** Comercial */
  personType?: string | null;
  documentoComercial?: string | null;
  planoDesejado?: string | null;
  sentAt: string; // ISO
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getPartnershipRequestEmailText(data: PartnershipRequestEmailData): string {
  const tipoLabel = data.tipo === 'ong' ? 'ONG/instituição' : 'comercial';
  const lines: string[] = [
    '--- Solicitação de parceria Adopet ---',
    '',
    `Tipo: ${tipoLabel}`,
    `Enviado em: ${data.sentAt}`,
    '',
    '--- Dados do solicitante ---',
    `Nome: ${data.nome}`,
    `E-mail: ${data.email}`,
    `Telefone: ${data.telefone}`,
    data.tipo === 'ong' ? `Instituição: ${data.instituicao}` : `Estabelecimento: ${data.instituicao}`,
    '',
  ];
  if (data.tipo === 'ong') {
    if (data.cnpj) lines.push(`CNPJ: ${data.cnpj}`);
    if (data.anoFundacao) lines.push(`Ano de fundação: ${data.anoFundacao}`);
    if (data.cep) lines.push(`CEP: ${data.cep}`);
    if (data.endereco) lines.push(`Endereço: ${data.endereco}`);
    lines.push('');
  } else {
    if (data.personType && data.documentoComercial) {
      lines.push(`${data.personType === 'PF' ? 'CPF' : 'CNPJ'}: ${data.documentoComercial}`);
    }
    if (data.planoDesejado) lines.push(`Plano desejado: ${data.planoDesejado}`);
    lines.push('');
  }
  if (data.mensagem) {
    lines.push('--- Mensagem ---', data.mensagem);
  }
  return lines.filter(Boolean).join('\n');
}

export function getPartnershipRequestEmailHtml(data: PartnershipRequestEmailData, logoUrl?: string): string {
  const tipoLabel = data.tipo === 'ong' ? 'ONG / instituição' : 'comercial';
  const logoImg = logoUrl
    ? `<img src="${logoUrl}" alt="Adopet" width="120" height="40" style="display:block; max-height: 40px; width: auto;" />`
    : '<span style="font-size: 22px; font-weight: 700; color: #0D9488;">Adopet</span>';
  const extraOng =
    data.tipo === 'ong' && (data.cnpj || data.anoFundacao || data.cep || data.endereco)
      ? `
    <tr><td style="padding: 8px 0 4px 0; font-size: 14px; color: #57534E;"><strong>Dados da instituição</strong></td></tr>
    <tr><td style="padding: 0 0 12px 0; font-size: 14px; color: #1C1917;">
      ${[data.cnpj && `CNPJ: ${escapeHtml(data.cnpj)}`, data.anoFundacao && `Ano de fundação: ${escapeHtml(data.anoFundacao)}`, data.cep && `CEP: ${escapeHtml(data.cep)}`, data.endereco && `Endereço: ${escapeHtml(data.endereco)}`].filter(Boolean).join('<br/>')}
    </td></tr>`
      : '';
  const extraComercial =
    data.tipo === 'comercial' && (data.personType || data.documentoComercial || data.planoDesejado)
      ? `
    <tr><td style="padding: 8px 0 4px 0; font-size: 14px; color: #57534E;"><strong>Dados comerciais</strong></td></tr>
    <tr><td style="padding: 0 0 12px 0; font-size: 14px; color: #1C1917;">
      ${[data.personType && data.documentoComercial && `${data.personType === 'PF' ? 'CPF' : 'CNPJ'}: ${escapeHtml(data.documentoComercial)}`, data.planoDesejado && `Plano desejado: ${escapeHtml(data.planoDesejado)}`].filter(Boolean).join('<br/>')}
    </td></tr>`
      : '';
  const msgBlock = data.mensagem
    ? `<tr><td style="padding: 12px 0 4px 0; font-size: 14px; color: #57534E;"><strong>Mensagem</strong></td></tr><tr><td style="padding: 0 0 12px 0; font-size: 14px; color: #1C1917; white-space: pre-wrap;">${escapeHtml(data.mensagem)}</td></tr>`
    : '';
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solicitação de parceria - Adopet</title>
</head>
<body style="margin:0; padding:0; background-color:#E5EDEA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#E5EDEA; padding: 24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px;">
          <tr>
            <td style="background-color: #ffffff; border: 2px solid #0D9488; border-radius: 16px 16px 0 0; padding: 24px 24px; text-align: center;">
              ${logoImg}
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #57534E;">Cada adoção começa com um passo</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 24px 24px; border-left: 2px solid #0D9488; border-right: 2px solid #0D9488; border-bottom: 2px solid #0D9488; border-radius: 0 0 16px 16px;">
              <h1 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #0D9488;">Nova solicitação de parceria (${tipoLabel})</h1>
              <p style="margin: 0 0 20px 0; font-size: 13px; color: #78716C;">Enviada pelo formulário do app em ${escapeHtml(data.sentAt)}.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 14px;">
                <tr><td style="padding: 8px 0 4px 0; font-size: 14px; color: #57534E;"><strong>Nome</strong></td></tr>
                <tr><td style="padding: 0 0 12px 0; font-size: 14px; color: #1C1917;">${escapeHtml(data.nome)}</td></tr>
                <tr><td style="padding: 8px 0 4px 0; font-size: 14px; color: #57534E;"><strong>E-mail</strong></td></tr>
                <tr><td style="padding: 0 0 12px 0; font-size: 14px; color: #1C1917;">${escapeHtml(data.email)}</td></tr>
                <tr><td style="padding: 8px 0 4px 0; font-size: 14px; color: #57534E;"><strong>Telefone</strong></td></tr>
                <tr><td style="padding: 0 0 12px 0; font-size: 14px; color: #1C1917;">${escapeHtml(data.telefone)}</td></tr>
                <tr><td style="padding: 8px 0 4px 0; font-size: 14px; color: #57534E;"><strong>${data.tipo === 'ong' ? 'Instituição' : 'Estabelecimento'}</strong></td></tr>
                <tr><td style="padding: 0 0 12px 0; font-size: 14px; color: #1C1917;">${escapeHtml(data.instituicao)}</td></tr>
                ${extraOng}
                ${extraComercial}
                ${msgBlock}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
