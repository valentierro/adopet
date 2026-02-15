/**
 * E-mail enviado para contato@appadopet.com.br quando um usuário envia uma sugestão pelo app.
 */
export type SuggestionEmailData = {
  reportId: string;
  message: string;
  userComment?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  reportedAt: string; // ISO
  serverTime: string; // ISO
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getSuggestionEmailText(data: SuggestionEmailData): string {
  const lines: string[] = [
    '--- Sugestão (Adopet) ---',
    '',
    `ID: ${data.reportId}`,
    `Data/hora (servidor): ${data.serverTime}`,
    '',
    '--- Quem enviou ---',
    data.userName ? `Nome: ${data.userName}` : 'Usuário não logado',
    data.userEmail ? `E-mail: ${data.userEmail}` : '',
    '',
    '--- Sugestão ---',
    data.message,
    '',
  ];
  if (data.userComment) {
    lines.push('--- Detalhes adicionais ---', data.userComment);
  }
  return lines.filter(Boolean).join('\n');
}

export function getSuggestionEmailHtml(data: SuggestionEmailData, logoUrl?: string): string {
  const logoImg = logoUrl
    ? `<img src="${logoUrl}" alt="Adopet" width="120" height="40" style="display:block; max-height: 40px; width: auto;" />`
    : '<span style="font-size: 22px; font-weight: 700; color: #0D9488;">Adopet</span>';
  const userBlock =
    data.userEmail || data.userName
      ? `
    <tr><td style="padding: 8px 0 4px 0; font-size: 14px; color: #57534E;"><strong>Quem enviou</strong></td></tr>
    <tr><td style="padding: 0 0 12px 0; font-size: 14px; color: #1C1917;">
      ${data.userName ?? '—'} ${data.userEmail ? `&lt;${data.userEmail}&gt;` : ''}
    </td></tr>`
      : '<tr><td style="padding: 8px 0 12px 0; font-size: 14px; color: #78716C;">Usuário não logado</td></tr>';
  const commentBlock = data.userComment
    ? `<tr><td style="padding: 8px 0 4px 0; font-size: 14px; color: #57534E;"><strong>Detalhes adicionais</strong></td></tr><tr><td style="padding: 0 0 12px 0; font-size: 14px; color: #1C1917; white-space: pre-wrap;">${escapeHtml(data.userComment)}</td></tr>`
    : '';
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sugestão - Adopet</title>
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
              <h1 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #0D9488;">💡 Nova sugestão</h1>
              <p style="margin: 0 0 20px 0; font-size: 13px; color: #78716C;">Um usuário enviou uma sugestão para o app. Detalhes abaixo.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 14px;">
                <tr><td style="padding: 8px 0 4px 0; font-size: 14px; color: #57534E;"><strong>ID</strong></td></tr>
                <tr><td style="padding: 0 0 12px 0; font-size: 13px; color: #78716C; font-family: monospace;">${escapeHtml(data.reportId)}</td></tr>
                <tr><td style="padding: 8px 0 4px 0; font-size: 14px; color: #57534E;"><strong>Data/hora</strong></td></tr>
                <tr><td style="padding: 0 0 12px 0; font-size: 14px; color: #1C1917;">${escapeHtml(data.serverTime)}</td></tr>
                ${userBlock}
                <tr><td style="padding: 8px 0 4px 0; font-size: 14px; color: #57534E;"><strong>Sugestão</strong></td></tr>
                <tr><td style="padding: 0 0 12px 0; font-size: 14px; color: #1C1917; background: #CCFBF1; padding: 12px; border-radius: 8px; border-left: 4px solid #0D9488;">${escapeHtml(data.message)}</td></tr>
                ${commentBlock}
              </table>
              <p style="margin: 20px 0 0 0; font-size: 12px; color: #78716C;">Este e-mail foi enviado automaticamente pelo app Adopet.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
