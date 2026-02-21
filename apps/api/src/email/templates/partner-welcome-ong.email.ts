/**
 * E-mail de boas-vindas à ONG quando a parceria é aprovada (após finalizar cadastro).
 * Linguagem não comercial; foco em adoção voluntária e divulgação.
 */
export type PartnerWelcomeOngEmailData = {
  ongName: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getPartnerWelcomeOngEmailHtml(data: PartnerWelcomeOngEmailData, logoUrl?: string): string {
  const logoImg = logoUrl
    ? `<img src="${logoUrl}" alt="Adopet" width="140" height="48" style="display:block; margin:0 auto; max-height: 48px; width: auto;" />`
    : '<span style="font-size: 26px; font-weight: 700; color: #0D9488; letter-spacing: -0.5px;">Adopet</span>';
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo(a) à parceria - Adopet</title>
</head>
<body style="margin:0; padding:0; background-color:#E5EDEA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#E5EDEA; padding: 24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px;">
          <tr>
            <td style="background: linear-gradient(135deg, #0D9488 0%, #0F766E 100%); border-radius: 16px 16px 0 0; padding: 32px 24px; text-align: center;">
              ${logoImg}
              <p style="margin: 14px 0 0 0; font-size: 15px; color: rgba(255,255,255,0.95);">Parceria aprovada</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 32px 24px; border-left: 2px solid #0D9488; border-right: 2px solid #0D9488;">
              <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #1C1917;">Bem-vindo(a), ${escapeHtml(data.ongName)}!</h1>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #57534E;">Sua instituição agora faz parte da rede Adopet. Juntos, podemos conectar mais pets a lares responsáveis e dar visibilidade ao trabalho de proteção animal.</p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #F0FDFA; border-radius: 12px; margin-bottom: 24px; border: 1px solid #99F6E4;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 12px 0; font-size: 17px; font-weight: 700; color: #0F766E;">O que a parceria oferece</h2>
                    <ul style="margin: 0; padding-left: 20px; font-size: 15px; line-height: 1.8; color: #1C1917;">
                      <li><strong>Página da instituição</strong> — Sua ONG aparece no app para quem busca adotar na região.</li>
                      <li><strong>Portal do parceiro</strong> — Cadastre cupons e serviços, gerencie membros da equipe e anúncios em parceria.</li>
                      <li><strong>Mais adoções</strong> — Conecte os pets sob sua guarda a pessoas comprometidas com a adoção responsável.</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <h2 style="margin: 24px 0 12px 0; font-size: 17px; font-weight: 700; color: #1C1917;">Divulgue o Adopet</h2>
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #57534E;">Quanto mais pessoas conhecerem o app, mais pets encontram lar. Indique o Adopet para adotantes, nas redes sociais e em eventos — mais visibilidade para sua instituição e mais adoções conscientes.</p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #57534E;">Compartilhe: <strong>appadopet.com.br</strong> — adoção voluntária, sem comercialização de animais.</p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #FEF3C7; border-radius: 12px; border: 1px solid #FCD34D; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #92400E;"><strong>Importante:</strong> O Adopet não incentiva nem apoia a comercialização de pets. Todas as adoções no app são voluntárias; não há compra e venda de animais. Nosso objetivo é conectar quem quer adotar a quem oferece um lar com responsabilidade.</p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #57534E;">Em outro e-mail você recebeu o link para definir sua senha e acessar o app. Use-o para entrar no portal do parceiro e começar a usar todos os recursos.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 0 24px 24px; border-left: 2px solid #0D9488; border-right: 2px solid #0D9488; border-bottom: 2px solid #0D9488; border-radius: 0 0 16px 16px;">
              <p style="margin: 0; font-size: 12px; color: #78716C; text-align: center;">Equipe Adopet · Obrigado por fazer parte dessa rede</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export function getPartnerWelcomeOngEmailText(data: PartnerWelcomeOngEmailData): string {
  return `Bem-vindo(a), ${data.ongName}!

Sua instituição agora faz parte da rede Adopet. Juntos, podemos conectar mais pets a lares responsáveis.

O que a parceria oferece:
- Página da instituição: sua ONG aparece no app para quem busca adotar na região.
- Portal do parceiro: cadastre cupons e serviços, gerencie membros e anúncios em parceria.
- Mais adoções: conecte os pets sob sua guarda a pessoas comprometidas com a adoção responsável.

Divulgue o Adopet: indique o app para adotantes e nas redes sociais. Compartilhe: appadopet.com.br — adoção voluntária, sem comercialização de animais.

Importante: O Adopet não incentiva nem apoia a comercialização de pets. Todas as adoções no app são voluntárias; não há compra e venda de animais.

Em outro e-mail você recebeu o link para definir sua senha e acessar o app.

Equipe Adopet`;
}
