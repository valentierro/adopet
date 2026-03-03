/**
 * E-mail de boas-vindas ao usuário tutor (cadastro no app).
 * Incentivo à doação responsável, uso ético da plataforma, proibição de comércio de pets e informação sobre KYC.
 */
export type TutorWelcomeEmailData = {
  userName: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getTutorWelcomeEmailHtml(data: TutorWelcomeEmailData, logoUrl?: string): string {
  const logoImg = logoUrl
    ? `<img src="${logoUrl}" alt="Adopet" width="140" height="48" style="display:block; margin:0 auto; max-height: 48px; width: auto;" />`
    : '<span style="font-size: 26px; font-weight: 700; color: #0D9488; letter-spacing: -0.5px;">Adopet</span>';
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo(a) ao Adopet</title>
</head>
<body style="margin:0; padding:0; background-color:#E5EDEA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#E5EDEA; padding: 24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px;">
          <tr>
            <td style="background: linear-gradient(135deg, #0D9488 0%, #0F766E 100%); border-radius: 16px 16px 0 0; padding: 32px 24px; text-align: center;">
              ${logoImg}
              <p style="margin: 14px 0 0 0; font-size: 15px; color: rgba(255,255,255,0.95);">Cada adoção começa com um passo</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 32px 24px; border-left: 2px solid #0D9488; border-right: 2px solid #0D9488;">
              <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #1C1917;">Olá, ${escapeHtml(data.userName)}! Bem-vindo(a) ao Adopet</h1>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #57534E;">Sua conta foi criada com sucesso. Aqui você pode divulgar pets para adoção ou encontrar seu novo companheiro — de forma segura, responsável e 100% voluntária.</p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #F0FDFA; border-radius: 12px; margin-bottom: 24px; border: 1px solid #99F6E4;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 12px 0; font-size: 17px; font-weight: 700; color: #0F766E;">Use a plataforma com responsabilidade</h2>
                    <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.7; color: #1C1917;">O Adopet existe para conectar animais a lares que realmente os acolhem. Ao publicar um pet para adoção ou ao se candidatar como adotante, você concorda em agir com transparência, respeito e compromisso com o bem-estar animal.</p>
                    <ul style="margin: 0; padding-left: 20px; font-size: 15px; line-height: 1.8; color: #1C1917;">
                      <li>Seja honesto(a) nas informações do pet e no seu perfil.</li>
                      <li>Mantenha o contato com adotantes ou tutores durante o processo.</li>
                      <li>Priorize o interesse do animal em todas as decisões.</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #FEF3C7; border-radius: 12px; border: 1px solid #FCD34D; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #92400E;"><strong>Não é permitido comércio de pets.</strong> O Adopet é uma plataforma de adoção voluntária. Não autorizamos venda, cobrança por animais ou qualquer forma de comercialização. Quem descumprir as regras pode ter a conta desativada. Ajude a manter o app um espaço seguro para todos.</p>
                  </td>
                </tr>
              </table>

              <h2 style="margin: 24px 0 12px 0; font-size: 17px; font-weight: 700; color: #1C1917;">Verificação de identidade (KYC)</h2>
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.7; color: #57534E;">Para <strong>finalizar o processo de adoção</strong> como adotante, é necessário concluir a verificação de identidade (KYC) no app. Esse passo garante mais segurança para tutores e adotantes e ajuda a combater fraudes. Quando você se candidatar a um pet, vamos orientar você a enviar os documentos; após a análise da nossa equipe, você poderá confirmar a adoção com tranquilidade.</p>

              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #57534E;">Se você for <strong>divulgar um pet para adoção</strong>, basta criar o anúncio no app. A verificação KYC é obrigatória principalmente para quem deseja adotar.</p>

              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #57534E;">Qualquer dúvida, estamos à disposição. Boas adoções e obrigado por fazer parte dessa rede!</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 0 24px 24px; border-left: 2px solid #0D9488; border-right: 2px solid #0D9488; border-bottom: 2px solid #0D9488; border-radius: 0 0 16px 16px;">
              <p style="margin: 0; font-size: 12px; color: #78716C; text-align: center;">Equipe Adopet · Obrigado por usar a plataforma com responsabilidade</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export function getTutorWelcomeEmailText(data: TutorWelcomeEmailData): string {
  return `Olá, ${data.userName}! Bem-vindo(a) ao Adopet

Sua conta foi criada com sucesso. Aqui você pode divulgar pets para adoção ou encontrar seu novo companheiro — de forma segura, responsável e 100% voluntária.

Use a plataforma com responsabilidade
O Adopet existe para conectar animais a lares que realmente os acolhem. Ao publicar um pet para adoção ou ao se candidatar como adotante, aja com transparência, respeito e compromisso com o bem-estar animal: seja honesto(a) nas informações, mantenha o contato durante o processo e priorize o interesse do animal.

Não é permitido comércio de pets
O Adopet é uma plataforma de adoção voluntária. Não autorizamos venda, cobrança por animais ou qualquer forma de comercialização. Quem descumprir as regras pode ter a conta desativada.

Verificação de identidade (KYC)
Para finalizar o processo de adoção como adotante, é necessário concluir a verificação de identidade (KYC) no app. Esse passo garante mais segurança para todos. Quando você se candidatar a um pet, vamos orientar o envio dos documentos; após a análise, você poderá confirmar a adoção. Se você for divulgar um pet para adoção, basta criar o anúncio no app.

Qualquer dúvida, estamos à disposição. Boas adoções!

Equipe Adopet`;
}
