/**
 * E-mail enviado para contato@appadopet.com.br quando um usuário reporta um bug no app.
 */
export type BugReportEmailData = {
  reportId: string;
  message: string;
  stack?: string | null;
  screen?: string | null;
  userComment?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  reportedAt: string; // ISO
  serverTime: string; // ISO
  serverEnv?: string;
};

export function getBugReportEmailText(data: BugReportEmailData): string {
  const lines: string[] = [
    '--- Reporte de bug (Adopet) ---',
    '',
    `ID do reporte: ${data.reportId}`,
    `Data/hora (app): ${data.reportedAt}`,
    `Data/hora (servidor): ${data.serverTime}`,
    data.serverEnv ? `Ambiente: ${data.serverEnv}` : '',
    '',
    '--- Quem reportou ---',
    data.userName ? `Nome: ${data.userName}` : 'Usuário não logado',
    data.userEmail ? `E-mail: ${data.userEmail}` : '',
    '',
    '--- Mensagem do erro ---',
    data.message,
    '',
  ];
  if (data.screen) {
    lines.push('--- Tela/rota ---', data.screen, '');
  }
  if (data.userComment) {
    lines.push('--- Comentário do usuário ---', data.userComment, '');
  }
  if (data.stack) {
    lines.push('--- Stack trace / detalhes técnicos ---', data.stack);
  }
  return lines.filter(Boolean).join('\n');
}

export function getBugReportEmailHtml(data: BugReportEmailData, logoUrl?: string): string {
  const logoImg = logoUrl
    ? `<img src="${logoUrl}" alt="Adopet" width="120" height="40" style="display:block; max-height: 40px; width: auto;" />`
    : '<span style="font-size: 22px; font-weight: 700; color: #0D9488;">Adopet</span>';
  const userBlock = data.userEmail || data.userName
    ? `
    <tr><td style="padding: 8px 0 4px 0; font-size: 14px; color: #57534E;"><strong>Quem reportou</strong></td></tr>
    <tr><td style="padding: 0 0 12px 0; font-size: 14px; color: #1C1917;">
      ${data.userName ?? '—'} ${data.userEmail ? `&lt;${data.userEmail}&gt;` : ''}
    </td></tr>`
    : '<tr><td style="padding: 8px 0 12px 0; font-size: 14px; color: #78716C;">Usuário não logado</td></tr>';
  const screenBlock = data.screen
    ? `<tr><td style="padding: 8px 0 4px 0; font-size: 14px; color: #57534E;"><strong>Tela/rota</strong></td></tr><tr><td style="padding: 0 0 12px 0; font-size: 14px; color: #1C1917; font-family: monospace;">${escapeHtml(data.screen)}</td></tr>`
    : '';
  const commentBlock = data.userComment
    ? `<tr><td style="padding: 8px 0 4px 0; font-size: 14px; color: #57534E;"><strong>Comentário do usuário</strong></td></tr><tr><td style="padding: 0 0 12px 0; font-size: 14px; color: #1C1917; white-space: pre-wrap;">${escapeHtml(data.userComment)}</td></tr>`
    : '';
  const stackBlock = data.stack
    ? `<tr><td style="padding: 12px 0 4px 0; font-size: 14px; color: #57534E;"><strong>Stack trace / detalhes técnicos</strong></td></tr><tr><td style="padding: 0 0 12px 0; font-size: 12px; color: #44403C; font-family: monospace; white-space: pre-wrap; background: #F5F5F4; padding: 12px; border-radius: 8px; overflow-x: auto;">${escapeHtml(data.stack)}</td></tr>`
    : '';
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte de bug - Adopet</title>
</head>
<body style="margin:0; padding:0; background-color:#E5EDEA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#E5EDEA; padding: 24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px;">
          <tr>
            <td style="background-color: #ffffff; border: 2px solid #D97706; border-radius: 16px 16px 0 0; padding: 24px 24px; text-align: center;">
              ${logoImg}
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #57534E;">Cada adoção começa com um passo</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 24px 24px; border-left: 2px solid #D97706; border-right: 2px solid #D97706; border-bottom: 2px solid #D97706; border-radius: 0 0 16px 16px;">
              <h1 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #B45309;">🐛 Novo reporte de bug</h1>
              <p style="margin: 0 0 20px 0; font-size: 13px; color: #78716C;">Um usuário reportou um erro no app. Detalhes abaixo e em anexo.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 14px;">
                <tr><td style="padding: 8px 0 4px 0; font-size: 14px; color: #57534E;"><strong>ID</strong></td></tr>
                <tr><td style="padding: 0 0 12px 0; font-size: 13px; color: #78716C; font-family: monospace;">${escapeHtml(data.reportId)}</td></tr>
                <tr><td style="padding: 8px 0 4px 0; font-size: 14px; color: #57534E;"><strong>Data/hora (servidor)</strong></td></tr>
                <tr><td style="padding: 0 0 12px 0; font-size: 14px; color: #1C1917;">${escapeHtml(data.serverTime)}</td></tr>
                ${data.serverEnv ? `<tr><td style="padding: 0 0 12px 0; font-size: 13px; color: #78716C;">Ambiente: ${escapeHtml(data.serverEnv)}</td></tr>` : ''}
                ${userBlock}
                <tr><td style="padding: 8px 0 4px 0; font-size: 14px; color: #57534E;"><strong>Mensagem do erro</strong></td></tr>
                <tr><td style="padding: 0 0 12px 0; font-size: 14px; color: #1C1917; background: #FEF3C7; padding: 12px; border-radius: 8px; border-left: 4px solid #D97706;">${escapeHtml(data.message)}</td></tr>
                ${screenBlock}
                ${commentBlock}
                ${stackBlock}
              </table>
              <p style="margin: 20px 0 0 0; font-size: 12px; color: #78716C;">Este e-mail foi enviado automaticamente. O conteúdo completo está disponível no anexo <code>bug-report.txt</code> para arquivamento.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
