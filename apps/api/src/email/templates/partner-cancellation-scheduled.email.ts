/**
 * E-mail enviado quando o parceiro (ou admin) agenda cancelamento da assinatura (cancel_at_period_end).
 * Confirma que a solicitação foi registrada e informa até quando há acesso.
 */
export type PartnerCancellationScheduledEmailData = {
  partnerName: string;
  /** Data fim do período (ex.: "31/03/2026") */
  periodEndFormatted: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getPartnerCancellationScheduledEmailHtml(
  data: PartnerCancellationScheduledEmailData,
  logoUrl?: string,
): string {
  const logoImg = logoUrl
    ? `<img src="${logoUrl}" alt="Adopet" width="120" height="42" style="display:block; margin:0 auto; max-height: 42px; width: auto;" />`
    : '<span style="font-size: 22px; font-weight: 700; color: #0D9488; letter-spacing: -0.5px;">Adopet</span>';
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cancelamento agendado - Adopet</title>
</head>
<body style="margin:0; padding:0; background-color:#E5EDEA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#E5EDEA; padding: 24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px;">
          <tr>
            <td style="background: linear-gradient(135deg, #0D9488 0%, #0F766E 100%); border-radius: 14px 14px 0 0; padding: 28px 24px; text-align: center;">
              ${logoImg}
              <p style="margin: 12px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.95);">Cancelamento agendado</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 28px 24px; border-left: 2px solid #0D9488; border-right: 2px solid #0D9488; border-bottom: 2px solid #0D9488; border-radius: 0 0 14px 14px;">
              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #1C1917;">Olá, ${escapeHtml(data.partnerName)}!</h1>
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #57534E;">Sua solicitação de cancelamento foi registrada com sucesso. Você mantém acesso ao portal e à sua página no app até <strong>${escapeHtml(data.periodEndFormatted)}</strong>. Não haverá nova cobrança.</p>
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #57534E;">A partir dessa data, sua página deixará de aparecer no app. Se mudar de ideia antes disso, você pode reativar pelo mesmo portal (Gerenciar assinatura no app).</p>
              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #57534E;">Equipe Adopet</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export function getPartnerCancellationScheduledEmailText(data: PartnerCancellationScheduledEmailData): string {
  return `Olá, ${data.partnerName}!

Sua solicitação de cancelamento foi registrada com sucesso. Você mantém acesso ao portal e à sua página no app até ${data.periodEndFormatted}. Não haverá nova cobrança.

A partir dessa data, sua página deixará de aparecer no app. Se mudar de ideia antes disso, reative pelo portal (Gerenciar assinatura no app).

Equipe Adopet`;
}
