/**
 * E-mail de parabéns e agradecimento para quem colocou o pet para adoção (tutor).
 */
import type { AdoptionEmailData } from './adoption-congratulations-adopter.email';

export function getAdoptionCongratulationsTutorHtml(data: AdoptionEmailData, logoUrl?: string): string {
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
  <title>Obrigado por essa adoção - Adopet</title>
</head>
<body style="margin:0; padding:0; background-color:#E5EDEA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#E5EDEA; padding: 24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px;">
          <tr>
            <td style="background-color: #ffffff; border: 2px solid #0D9488; border-bottom: none; border-radius: 16px 16px 0 0; padding: 28px 24px; text-align: center;">
              ${logoImg}
              <p style="margin: 14px 0 0 0; font-size: 15px; color: #57534E;">Você fez a diferença</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 32px 24px; border-left: 2px solid #0D9488; border-right: 2px solid #0D9488;">
              <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1C1917;">Obrigado, ${data.recipientName}!</h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #57534E;">A adoção de <strong>${data.petName}</strong> foi confirmada. Você deu a ele(a) a chance de um novo lar e uma nova família.</p>
              ${petImg}
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #CCFBF1; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #0F766E; text-transform: uppercase; letter-spacing: 0.5px;">Pet adotado</p>
                    <p style="margin: 0; font-size: 15px; color: #1C1917;"><strong>${data.petName}</strong> · ${data.speciesLabel}${data.breed ? ` · ${data.breed}` : ''} · ${data.age} ano(s)</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #57534E;">Sua atitude de divulgar a adoção responsável e usar o Adopet ajuda a conectar mais pets a lares amorosos. Cada anúncio conta.</p>
              <h2 style="margin: 24px 0 12px 0; font-size: 17px; font-weight: 600; color: #1C1917;">Continue fazendo a diferença</h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.7; color: #57534E;">Indique o Adopet para amigos que queiram adotar ou que tenham pets para doar. Quanto mais gente usar a plataforma, mais histórias como a de ${data.petName} vamos escrever juntos.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 8px 0 16px 0;">
                    <a href="https://appadopet.com.br/" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #0D9488 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.4);">Indicar o Adopet para amigos</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 13px; color: #78716C;">Obrigado por confiar no Adopet. Parabéns por essa nova etapa na vida de ${data.petName}!</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 0 24px 24px; border-left: 2px solid #0D9488; border-right: 2px solid #0D9488; border-bottom: 2px solid #0D9488; border-radius: 0 0 16px 16px;">
              <p style="margin: 0; font-size: 12px; color: #78716C; text-align: center;">Equipe Adopet</p>
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

export function getAdoptionCongratulationsTutorText(data: AdoptionEmailData): string {
  return `Obrigado, ${data.recipientName}!

A adoção de ${data.petName} foi confirmada. Você deu a ele(a) a chance de um novo lar.

Continue fazendo a diferença: indique o Adopet para amigos que queiram adotar ou divulgar pets.

https://appadopet.com.br/

Equipe Adopet`;
}
