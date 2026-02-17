/**
 * E-mail enviado quando um admin de ONG adiciona um membro à equipe.
 * Diferente do e-mail de "definir senha" do admin/parceiro: este é exclusivo para membros da ONG.
 * O link permite definir a senha e acessar o app como membro (válido 48h).
 */
export type PartnerMemberInviteEmailData = {
  setPasswordLink: string;
  ongName: string;
  recipientName: string;
};

export function getPartnerMemberInviteEmailHtml(data: PartnerMemberInviteEmailData, logoUrl?: string): string {
  const logoImg = logoUrl
    ? `<img src="${logoUrl}" alt="Adopet" width="140" height="48" style="display:block; margin:0 auto; max-height: 48px; width: auto;" />`
    : '<span style="font-size: 26px; font-weight: 700; color: #0D9488; letter-spacing: -0.5px;">Adopet</span>';
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite para equipe da ONG - Adopet</title>
</head>
<body style="margin:0; padding:0; background-color:#E5EDEA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#E5EDEA; padding: 24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px;">
          <tr>
            <td style="background-color: #ffffff; border: 2px solid #0D9488; border-radius: 16px 16px 0 0; padding: 28px 24px; text-align: center;">
              ${logoImg}
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #57534E;">Convite para equipe da ONG</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 32px 24px; border-left: 2px solid #0D9488; border-right: 2px solid #0D9488; border-bottom: 2px solid #0D9488; border-radius: 0 0 16px 16px;">
              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #1C1917;">Você foi adicionado(a) à equipe da ONG</h1>
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #57534E;">Olá${data.recipientName ? `, ${data.recipientName}` : ''}!</p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #57534E;">O administrador da <strong>${data.ongName}</strong> adicionou você como membro da equipe no Adopet. Como membro, você poderá ajudar na gestão dos pets e adoções dessa ONG.</p>
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #57534E;">Clique no botão abaixo para criar sua senha e acessar o app. O link é válido por 48 horas.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px 0;">
                    <a href="${data.setPasswordLink}" style="display: inline-block; background: linear-gradient(135deg, #0D9488 0%, #14B8A6 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4);">Criar minha senha e acessar</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 13px; color: #78716C;">Se você não esperava este convite, ignore este e-mail.</p>
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

export function getPartnerMemberInviteEmailText(data: PartnerMemberInviteEmailData): string {
  return `Você foi adicionado(a) à equipe da ONG - Adopet

Olá${data.recipientName ? `, ${data.recipientName}` : ''}!

O administrador da ${data.ongName} adicionou você como membro da equipe no Adopet. Como membro, você poderá ajudar na gestão dos pets e adoções dessa ONG.

Crie sua senha e acesse o app (link válido por 48 horas):

${data.setPasswordLink}

Se você não esperava este convite, ignore este e-mail.

Equipe Adopet`;
}
