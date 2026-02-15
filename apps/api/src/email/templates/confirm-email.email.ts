/**
 * E-mail com link para confirmar o endereço de e-mail no cadastro.
 */
export function getConfirmEmailHtml(confirmLink: string, logoUrl?: string): string {
  const logoImg = logoUrl
    ? `<img src="${logoUrl}" alt="Adopet" width="140" height="48" style="display:block; margin:0 auto; max-height: 48px; width: auto;" />`
    : '<span style="font-size: 26px; font-weight: 700; color: #0D9488; letter-spacing: -0.5px;">Adopet</span>';
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmar e-mail - Adopet</title>
</head>
<body style="margin:0; padding:0; background-color:#E5EDEA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#E5EDEA; padding: 24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px;">
          <tr>
            <td style="background-color: #ffffff; border: 2px solid #D97706; border-radius: 16px 16px 0 0; padding: 28px 24px; text-align: center;">
              ${logoImg}
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #57534E;">Cada adoção começa com um passo</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 32px 24px; border-left: 2px solid #D97706; border-right: 2px solid #D97706; border-bottom: 2px solid #D97706; border-radius: 0 0 16px 16px;">
              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #1C1917;">Confirme seu e-mail</h1>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #57534E;">Você criou uma conta no Adopet. Clique no botão abaixo para confirmar seu endereço de e-mail e ativar sua conta. O link é válido por 24 horas.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px 0;">
                    <a href="${confirmLink}" style="display: inline-block; background: linear-gradient(135deg, #D97706 0%, #F59E0B 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(217, 119, 6, 0.4);">Confirmar e-mail</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 13px; color: #78716C;">Se não foi você que criou a conta, ignore este e-mail.</p>
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
</html>
  `.trim();
}

export function getConfirmEmailText(confirmLink: string): string {
  return `Confirmar e-mail - Adopet

Você criou uma conta no Adopet. Clique no link abaixo para confirmar seu e-mail (válido por 24 horas):

${confirmLink}

Se não foi você, ignore este e-mail.

Equipe Adopet`;
}
