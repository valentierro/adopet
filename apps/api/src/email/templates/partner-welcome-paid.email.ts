/**
 * E-mail de boas-vindas ao parceiro comercial após o primeiro pagamento ser confirmado (webhook Stripe checkout.session.completed).
 * Destacado: vantagens da parceria, tutorial do portal, disclaimer de expectativas e resguardo do app.
 */
export type PartnerWelcomePaidEmailData = {
  partnerName: string;
};

export type PartnerWelcomePaidEmailOptions = {
  /** Se true, o HTML inclui imagens inline (cid:portal-menu e cid:portal-dashboard); os anexos devem ser enviados pelo chamador. */
  includePortalImages?: boolean;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getPartnerWelcomePaidEmailHtml(
  data: PartnerWelcomePaidEmailData,
  logoUrl?: string,
  options?: PartnerWelcomePaidEmailOptions,
): string {
  const logoImg = logoUrl
    ? `<img src="${logoUrl}" alt="Adopet" width="140" height="48" style="display:block; margin:0 auto; max-height: 48px; width: auto;" />`
    : '<span style="font-size: 26px; font-weight: 700; color: #0D9488; letter-spacing: -0.5px;">Adopet</span>';
  const includePortalImages = options?.includePortalImages === true;

  const portalImagesBlock = includePortalImages
    ? `
              <h2 style="margin: 28px 0 16px 0; font-size: 17px; font-weight: 700; color: #1C1917;">📱 Tutorial: Como usar o portal no app</h2>
              <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #57534E;">No app, acesse <strong>Perfil → Parceiro → Portal do parceiro</strong>. Lá você gerencia dados do estabelecimento, cupons de desconto, serviços e acompanha analytics. Abaixo, um resumo visual:</p>
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #78716C;">Onde encontrar no menu:</p>
              <img src="cid:portal-menu" alt="Menu Perfil - Portal do parceiro" width="100%" style="max-width: 400px; height: auto; border-radius: 12px; border: 1px solid #e5e7eb; display: block; margin: 0 0 20px 0;" />
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #78716C;">Tela principal do portal (assinatura ativa, dados e atalhos):</p>
              <img src="cid:portal-dashboard" alt="Portal do parceiro - assinatura ativa" width="100%" style="max-width: 400px; height: auto; border-radius: 12px; border: 1px solid #e5e7eb; display: block; margin: 0 0 24px 0;" />`
    : `
              <h2 style="margin: 28px 0 16px 0; font-size: 17px; font-weight: 700; color: #1C1917;">📱 Tutorial: Como usar o portal no app</h2>
              <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #57534E;"><strong>Passo 1:</strong> Abra o app Adopet e vá em <strong>Perfil</strong> (ícone de pessoa).</p>
              <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #57534E;"><strong>Passo 2:</strong> Expanda a seção <strong>Parceiro</strong> e toque em <strong>Portal do parceiro</strong>.</p>
              <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #57534E;"><strong>Passo 3:</strong> No portal você pode: editar dados do estabelecimento, criar cupons de desconto, cadastrar serviços prestados, ver analytics de visitas e gerenciar sua assinatura. Use o botão <strong>Ver página pública</strong> para ver como sua página aparece para os usuários.</p>
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #57534E;">Dica: quanto mais completo o perfil e mais cupons/serviços cadastrados, maior a chance de aparecer para quem busca na região.</p>`;

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
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px;">
          <tr>
            <td style="background: linear-gradient(135deg, #0D9488 0%, #0F766E 100%); border-radius: 20px 20px 0 0; padding: 40px 28px; text-align: center; box-shadow: 0 4px 20px rgba(13, 148, 136, 0.3);">
              ${logoImg}
              <p style="margin: 16px 0 0 0; font-size: 18px; font-weight: 600; color: rgba(255,255,255,0.98); letter-spacing: 0.5px;">Parceria ativa ✓</p>
              <p style="margin: 6px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.9);">Obrigado por fazer parte da rede</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 36px 28px; border-left: 2px solid #0D9488; border-right: 2px solid #0D9488;">
              <h1 style="margin: 0 0 12px 0; font-size: 28px; font-weight: 700; color: #1C1917; letter-spacing: -0.3px;">Bem-vindo(a), ${escapeHtml(data.partnerName)}! 🎉</h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.65; color: #57534E;">Seu pagamento foi confirmado e sua parceria está ativa. Você agora faz parte da rede de parceiros do Adopet e pode aproveitar todos os benefícios. Estamos muito felizes em tê-lo(a) conosco!</p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #FEF2F2; border-radius: 12px; margin-bottom: 24px; border: 1px solid #FECACA;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: #991B1B;">⚠️ Importante — Expectativas realistas</p>
                    <p style="margin: 0; font-size: 14px; line-height: 1.65; color: #7F1D1D;">A parceria com o Adopet <strong>não garante aumento de vendas</strong>. O app oferece <strong>visibilidade</strong> para um público que valoriza pets e adoção responsável — o que pode ajudar nos seus resultados. Recomendamos divulgar seus cupons e serviços, acompanhar o que funciona e ter expectativas alinhadas. Cada negócio é único.</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%); border-radius: 12px; margin-bottom: 24px; border: 1px solid #99F6E4;">
                <tr>
                  <td style="padding: 24px;">
                    <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #0F766E;">✨ Vantagens da sua parceria</h2>
                    <ul style="margin: 0; padding-left: 22px; font-size: 15px; line-height: 2; color: #1C1917;">
                      <li><strong>Visibilidade regional</strong> — Sua página e ofertas aparecem para quem busca pets e serviços na região.</li>
                      <li><strong>Portal completo no app</strong> — Gerencie cupons, serviços, dados do estabelecimento e analytics em um só lugar.</li>
                      <li><strong>Conexão com o público certo</strong> — Pessoas que adotam ou cuidam de pets podem descobrir seu estabelecimento.</li>
                      <li><strong>Selo de parceiro</strong> — Destaque visual que transmite confiança e compromisso com adoção responsável.</li>
                      <li><strong>Marketplace de ofertas</strong> — Seus cupons e serviços entram na vitrine do app para quem navega por benefícios.</li>
                    </ul>
                  </td>
                </tr>
              </table>

              ${portalImagesBlock}

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #FFFBEB; border-radius: 12px; margin: 24px 0; border: 1px solid #FDE68A;">
                <tr>
                  <td style="padding: 18px;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.65; color: #92400E;"><strong>Resguardo do Adopet:</strong> O Adopet não incentiva nem apoia a comercialização de pets. Todas as adoções no app são voluntárias; não há compra e venda de animais. Nosso objetivo é conectar quem quer adotar a quem oferece um lar com responsabilidade. A parceria é uma forma de apoiar esse ecossistema e conectar seu negócio a esse público.</p>
                  </td>
                </tr>
              </table>

              <h2 style="margin: 28px 0 12px 0; font-size: 17px; font-weight: 700; color: #1C1917;">Compartilhe o Adopet</h2>
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #57534E;">Quanto mais pessoas conhecerem o app, mais pets encontram lar. Indique o Adopet para clientes, nas redes sociais e no seu estabelecimento — você ganha visibilidade e mais pessoas adotam com responsabilidade.</p>
              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #57534E;">Compartilhe: <strong>appadopet.com.br</strong> — adoção voluntária, sem comercialização de animais.</p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 12px 0 20px 0;">
                    <a href="https://appadopet.com.br/" style="display: inline-block; background: linear-gradient(135deg, #0D9488 0%, #0F766E 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 36px; border-radius: 12px; box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4);">Acessar o portal no app</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 0 28px 28px; border-left: 2px solid #0D9488; border-right: 2px solid #0D9488; border-bottom: 2px solid #0D9488; border-radius: 0 0 20px 20px;">
              <p style="margin: 0; font-size: 13px; color: #78716C; text-align: center;">Equipe Adopet · Cada adoção começa com um passo</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export function getPartnerWelcomePaidEmailText(data: PartnerWelcomePaidEmailData): string {
  return `Bem-vindo(a), ${data.partnerName}!

Seu pagamento foi confirmado e sua parceria está ativa. Você agora faz parte da rede de parceiros do Adopet. Obrigado por fazer parte!

IMPORTANTE — Expectativas realistas:
A parceria com o Adopet NÃO GARANTE aumento de vendas. O app oferece visibilidade para um público que valoriza pets e adoção responsável — o que pode ajudar nos seus resultados. Recomendamos divulgar seus cupons e serviços e acompanhar o que funciona.

Vantagens da sua parceria:
- Visibilidade regional: sua página e ofertas aparecem para quem busca pets e serviços na região.
- Portal completo no app: gerencie cupons, serviços, dados do estabelecimento e analytics.
- Conexão com o público certo: pessoas que adotam ou cuidam de pets podem descobrir seu estabelecimento.
- Selo de parceiro: destaque visual que transmite confiança.
- Marketplace de ofertas: seus cupons e serviços entram na vitrine do app.

Tutorial — Como usar o portal no app:
1. Abra o app Adopet e vá em Perfil.
2. Expanda a seção Parceiro e toque em Portal do parceiro.
3. No portal você pode: editar dados do estabelecimento, criar cupons, cadastrar serviços, ver analytics e gerenciar sua assinatura. Use "Ver página pública" para ver como sua página aparece para os usuários.

Resguardo: O Adopet não incentiva a comercialização de pets. Todas as adoções são voluntárias; não há compra e venda de animais.

Compartilhe o Adopet: appadopet.com.br — quanto mais pessoas conhecerem, mais pets encontram lar.

Acesse o portal: https://appadopet.com.br/

Equipe Adopet`;
}
