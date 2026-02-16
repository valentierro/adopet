/**
 * E-mail com link para definir senha (conta criada pela aprovação de parceria ou convite como membro ONG).
 * O link abre uma página onde o usuário define a senha (válido 48h).
 */
export type SetPasswordEmailData = {
  setPasswordLink: string;
  title: string;
  bodyHtml: string;
  bodyText: string;
  buttonLabel?: string;
};

const DEFAULT_BUTTON = 'Definir minha senha';

export function getSetPasswordEmailHtml(data: SetPasswordEmailData, logoUrl?: string): string {
  const logoImg = logoUrl
    ? `<img src="${logoUrl}" alt="Adopet" width="140" height="48" style="display:block; margin:0 auto; max-height: 48px; width: auto;" />`
    : '<span style="font-size: 26px; font-weight: 700; color: #0D9488; letter-spacing: -0.5px;">Adopet</span>';
  const btn = data.buttonLabel ?? DEFAULT_BUTTON;
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title} - Adopet</title>
</head>
<body style="margin:0; padding:0; background-color:#E5EDEA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#E5EDEA; padding: 24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px;">
          <tr>
            <td style="background-color: #ffffff; border: 2px solid #0D9488; border-radius: 16px 16px 0 0; padding: 28px 24px; text-align: center;">
              ${logoImg}
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #57534E;">Cada adoção começa com um passo</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 32px 24px; border-left: 2px solid #0D9488; border-right: 2px solid #0D9488; border-bottom: 2px solid #0D9488; border-radius: 0 0 16px 16px;">
              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #1C1917;">${data.title}</h1>
              <div style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #57534E;">${data.bodyHtml}</div>
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #57534E;">Clique no botão abaixo para definir sua senha e acessar o app. O link é válido por 48 horas.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px 0;">
                    <a href="${data.setPasswordLink}" style="display: inline-block; background: linear-gradient(135deg, #0D9488 0%, #14B8A6 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4);">${btn}</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 13px; color: #78716C;">Se não foi você que solicitou, ignore este e-mail.</p>
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

export function getSetPasswordEmailText(data: SetPasswordEmailData): string {
  return `${data.title} - Adopet

${data.bodyText}

Defina sua senha (link válido por 48 horas):

${data.setPasswordLink}

Equipe Adopet`;
}
