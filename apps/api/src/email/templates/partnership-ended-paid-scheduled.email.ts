/**
 * E-mail enviado ao parceiro pago quando a Adopet encerra a parceria (cancelamento ao final do período já pago).
 */
export type PartnershipEndedPaidScheduledEmailData = {
  partnerName: string;
  /** Data fim do período já pago (ex.: "31/03/2026") */
  periodEndFormatted: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getPartnershipEndedPaidScheduledEmailHtml(data: PartnershipEndedPaidScheduledEmailData, logoUrl?: string): string {
  const logoImg = logoUrl
    ? `<img src="${logoUrl}" alt="Adopet" width="120" height="40" style="display:block; max-height: 40px; width: auto;" />`
    : '<span style="font-size: 22px; font-weight: 700; color: #0D9488;">Adopet</span>';
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Parceria encerrada - Adopet</title>
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
              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #1C1917;">Parceria encerrada</h1>
              <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #57534E;">
                Informamos que a parceria paga da <strong>${escapeHtml(data.partnerName)}</strong> com a Adopet foi encerrada pela nossa equipe.
              </p>
              <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #57534E;">
                Você mantém acesso ao portal do parceiro até <strong>${escapeHtml(data.periodEndFormatted)}</strong> (fim do período já pago). Não haverá nova cobrança.
              </p>
              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #57534E;">
                A partir de ${escapeHtml(data.periodEndFormatted)} sua página deixará de aparecer no app. Para voltar a ser parceiro no futuro, entre em contato ou solicite novamente pelo app.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 24px 0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #78716C;">Equipe Adopet</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export function getPartnershipEndedPaidScheduledEmailText(data: PartnershipEndedPaidScheduledEmailData): string {
  return `Parceria encerrada - Adopet

Informamos que a parceria paga da ${data.partnerName} com a Adopet foi encerrada pela nossa equipe.

Você mantém acesso ao portal do parceiro até ${data.periodEndFormatted} (fim do período já pago). Não haverá nova cobrança.

A partir de ${data.periodEndFormatted} sua página deixará de aparecer no app. Para voltar a ser parceiro no futuro, entre em contato ou solicite novamente pelo app.

Equipe Adopet`;
}
