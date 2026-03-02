/**
 * E-mail curto de agradecimento quando a assinatura do parceiro comercial é renovada (invoice.paid, billing_reason = subscription_cycle).
 */
export type PartnerSubscriptionRenewalEmailData = {
  partnerName: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getPartnerSubscriptionRenewalEmailHtml(
  data: PartnerSubscriptionRenewalEmailData,
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
  <title>Assinatura renovada - Adopet</title>
</head>
<body style="margin:0; padding:0; background-color:#E5EDEA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#E5EDEA; padding: 24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px;">
          <tr>
            <td style="background: linear-gradient(135deg, #0D9488 0%, #0F766E 100%); border-radius: 14px 14px 0 0; padding: 28px 24px; text-align: center;">
              ${logoImg}
              <p style="margin: 12px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.95);">Assinatura renovada ✓</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 28px 24px; border-left: 2px solid #0D9488; border-right: 2px solid #0D9488; border-bottom: 2px solid #0D9488; border-radius: 0 0 14px 14px;">
              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #1C1917;">Olá, ${escapeHtml(data.partnerName)}!</h1>
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #57534E;">Sua assinatura foi renovada com sucesso. Obrigado por continuar com a gente — sua parceria segue ativa e sua página permanece visível no app.</p>
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

export function getPartnerSubscriptionRenewalEmailText(data: PartnerSubscriptionRenewalEmailData): string {
  return `Olá, ${data.partnerName}!

Sua assinatura foi renovada com sucesso. Obrigado por continuar com a gente — sua parceria segue ativa.

Equipe Adopet`;
}
