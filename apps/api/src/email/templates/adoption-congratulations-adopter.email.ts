/**
 * E-mail de parabéns para quem adotou o pet (após confirmação da adoção).
 */
export type AdoptionEmailData = {
  petName: string;
  petPhotoUrl?: string | null;
  tutorName: string;
  recipientName: string;
  speciesLabel: string;
  breed?: string | null;
  age: number;
};

export function getAdoptionCongratulationsAdopterHtml(data: AdoptionEmailData, logoUrl?: string): string {
  const logoImg = logoUrl
    ? `<img src="${logoUrl}" alt="Adopet" width="140" height="48" style="display:block; margin:0 auto; max-height: 48px; width: auto;" />`
    : '<span style="font-size: 26px; font-weight: 700; color: #0D9488; letter-spacing: -0.5px;">Adopet</span>';
  const petImg = data.petPhotoUrl
    ? `<img src="${data.petPhotoUrl}" alt="${data.petName}" width="200" height="200" style="width: 200px; height: 200px; object-fit: cover; border-radius: 16px; display: block; margin: 0 auto 20px;" />`
    : '';
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Parabéns pela sua adoção! - Adopet</title>
</head>
<body style="margin:0; padding:0; background-color:#E5EDEA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#E5EDEA; padding: 24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px;">
          <tr>
            <td style="background-color: #ffffff; border: 2px solid #F59E0B; border-bottom: none; border-radius: 16px 16px 0 0; padding: 28px 24px; text-align: center;">
              ${logoImg}
              <p style="margin: 14px 0 0 0; font-size: 15px; color: #57534E;">Cada adoção é um novo começo</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 32px 24px; border-left: 2px solid #F59E0B; border-right: 2px solid #F59E0B;">
              <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1C1917;">Parabéns, ${data.recipientName}!</h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #57534E;">Sua adoção foi confirmada. <strong>${data.petName}</strong> agora faz parte da sua família.</p>
              ${petImg}
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #FEF3C7; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #92400E; text-transform: uppercase; letter-spacing: 0.5px;">Seu novo amigo</p>
                    <p style="margin: 0; font-size: 15px; color: #1C1917;"><strong>${data.petName}</strong> · ${data.speciesLabel}${data.breed ? ` · ${data.breed}` : ''} · ${data.age} ano(s)</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #57534E;">Agradecemos a ${data.tutorName} por ter confiado no Adopet para encontrar um lar para ${data.petName}. Juntos, estamos fazendo a diferença.</p>
              <h2 style="margin: 24px 0 12px 0; font-size: 17px; font-weight: 600; color: #1C1917;">Dicas para os primeiros dias</h2>
              <ul style="margin: 0 0 24px 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #57534E;">
                <li>Respeite o tempo de adaptação: um ambiente calmo ajuda muito.</li>
                <li>Mantenha a alimentação indicada pelo tutor e consulte um veterinário em breve.</li>
                <li>Ofereça um cantinho só dele(a) para descanso e segurança.</li>
                <li>Paciência e carinho são a base de um vínculo duradouro.</li>
              </ul>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 8px 0 16px 0;">
                    <a href="https://appadopet.com.br/" style="display: inline-block; background: linear-gradient(135deg, #D97706 0%, #F59E0B 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(217, 119, 6, 0.4);">Indique o Adopet para amigos</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 13px; color: #78716C;">Compartilhe o app com quem também quer adotar ou divulgar pets para adoção. Cada indicação pode gerar uma nova história de amor.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 0 24px 24px; border-left: 2px solid #F59E0B; border-right: 2px solid #F59E0B; border-bottom: 2px solid #F59E0B; border-radius: 0 0 16px 16px;">
              <p style="margin: 0; font-size: 12px; color: #78716C; text-align: center;">Equipe Adopet · Obrigado por fazer parte dessa história</p>
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

export function getAdoptionCongratulationsAdopterText(data: AdoptionEmailData): string {
  return `Parabéns, ${data.recipientName}!

Sua adoção foi confirmada. ${data.petName} agora faz parte da sua família.

Dados do pet: ${data.petName} · ${data.speciesLabel}${data.breed ? ` · ${data.breed}` : ''} · ${data.age} ano(s).

Agradecemos a ${data.tutorName} por ter confiado no Adopet.

Dicas: respeite o tempo de adaptação, mantenha a alimentação indicada, ofereça um cantinho de descanso e consulte um veterinário em breve.

Indique o Adopet para amigos: https://appadopet.com.br/

Equipe Adopet`;
}
