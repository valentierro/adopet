/**
 * Template HTML para e-mail com senha temporária (recuperação de senha).
 * Cores: primary #0D9488, primaryDark #0F766E; botão laranja #D97706, #F59E0B.
 */
export function getTempPasswordEmailHtml(temporaryPassword: string, logoUrl?: string): string {
  const logoImg = logoUrl
    ? `<img src="${logoUrl}" alt="Adopet" width="140" height="48" style="display:block; margin:0 auto; max-height: 48px; width: auto;" />`
    : '<span style="font-size: 26px; font-weight: 700; color: #0D9488; letter-spacing: -0.5px;">Adopet</span>';
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Senha temporária - Adopet</title>
</head>
<body style="margin:0; padding:0; background-color:#E5EDEA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
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
            <td style="background-color: #ffffff; padding: 32px 24px; border-left: 2px solid #D97706; border-right: 2px solid #D97706; border-bottom: 2px solid #D97706; border-radius: 0 0 16px 16px; box-shadow: 0 4px 24px rgba(13, 148, 136, 0.08);">
              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #1C1917;">Sua senha foi redefinida</h1>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #57534E;">Você pediu para redefinir a senha. A senha atual foi substituída pela temporária abaixo. Use-a para entrar no app.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
                <tr>
                  <td style="background-color: #E5EDEA; padding: 16px 20px; border-radius: 12px; text-align: center;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #57534E; text-transform: uppercase; letter-spacing: 0.5px;">Senha temporária</p>
                    <p style="margin: 0; font-size: 22px; font-weight: 700; color: #1C1917; letter-spacing: 2px; font-family: monospace;">${temporaryPassword}</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #57534E;">Abra o app Adopet, entre com seu e-mail e use a senha acima. Recomendamos alterar a senha nas configurações do app depois de entrar.</p>
              <hr style="border: none; border-top: 1px solid #E7E5E4; margin: 24px 0 16px 0;">
              <p style="margin: 0; font-size: 13px; color: #78716C;">Se não foi você que pediu essa alteração, entre em contato conosco o quanto antes.</p>
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

export function getTempPasswordEmailText(temporaryPassword: string): string {
  return `Sua senha foi redefinida

Use esta senha temporária para entrar no app Adopet:

${temporaryPassword}

Recomendamos alterar a senha nas configurações do app depois de entrar.

Se não foi você que pediu essa alteração, entre em contato conosco.

Equipe Adopet`;
}
