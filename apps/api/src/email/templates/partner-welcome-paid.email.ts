/**
 * E-mail de boas-vindas ao parceiro pago após cadastro e pagamento concluídos com sucesso (webhook Stripe).
 */
export type PartnerWelcomePaidEmailData = {
  partnerName: string;
};

export type PartnerWelcomePaidEmailOptions = {
  /** Se true, o HTML inclui imagens inline (cid:portal-menu e cid:portal-dashboard); as anexos devem ser enviados pelo chamador. */
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
              <h2 style="margin: 28px 0 16px 0; font-size: 17px; font-weight: 700; color: #1C1917;">Conheça o portal do parceiro</h2>
              <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #57534E;">No app, acesse <strong>Perfil → Parceiro → Portal do parceiro</strong>. Lá você gerencia dados do estabelecimento, cupons de desconto, serviços e acompanha analytics. Abaixo, um resumo visual:</p>
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #78716C;">Onde encontrar no menu:</p>
              <img src="cid:portal-menu" alt="Menu Perfil - Portal do parceiro" width="100%" style="max-width: 400px; height: auto; border-radius: 12px; border: 1px solid #e5e7eb; display: block; margin: 0 0 20px 0;" />
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #78716C;">Tela principal do portal (assinatura ativa, dados e atalhos):</p>
              <img src="cid:portal-dashboard" alt="Portal do parceiro - assinatura ativa" width="100%" style="max-width: 400px; height: auto; border-radius: 12px; border: 1px solid #e5e7eb; display: block; margin: 0 0 24px 0;" />`
    : `
              <h2 style="margin: 28px 0 16px 0; font-size: 17px; font-weight: 700; color: #1C1917;">Conheça o portal do parceiro</h2>
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #57534E;">No app, acesse <strong>Perfil → Parceiro → Portal do parceiro</strong>. Lá você gerencia dados do estabelecimento, cupons de desconto, serviços prestados, analytics e sua assinatura. Use também o botão <strong>Ver página pública</strong> para ver como sua página aparece para os usuários.</p>`;

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
              <p style="margin: 14px 0 0 0; font-size: 15px; color: rgba(255,255,255,0.95);">Sua parceria está ativa</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 32px 24px; border-left: 2px solid #0D9488; border-right: 2px solid #0D9488;">
              <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #1C1917;">Bem-vindo(a), ${escapeHtml(data.partnerName)}!</h1>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #57534E;">Seu cadastro foi concluído e o pagamento confirmado. Você já faz parte da rede de parceiros do Adopet e pode aproveitar todos os benefícios da sua parceria.</p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #FEF3C7; border-radius: 12px; margin-bottom: 24px; border: 1px solid #FCD34D;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #92400E;"><strong>Expectativas:</strong> A parceria com o Adopet <strong>não garante aumento de vendas</strong>. Ela pode gerar <strong>visibilidade</strong> para um público que gosta de pets e valoriza adoção responsável — o que pode ajudar nos seus resultados. Recomendamos divulgar seus cupons e serviços no app e acompanhar o que funciona melhor para o seu negócio.</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #F0FDFA; border-radius: 12px; margin-bottom: 24px; border: 1px solid #99F6E4;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 12px 0; font-size: 17px; font-weight: 700; color: #0F766E;">O que sua parceria oferece</h2>
                    <ul style="margin: 0; padding-left: 20px; font-size: 15px; line-height: 1.8; color: #1C1917;">
                      <li><strong>Visibilidade</strong> — Sua página e ofertas aparecem para quem busca pets na região.</li>
                      <li><strong>Portal do parceiro</strong> — Gerencie cupons, serviços e informações no app.</li>
                      <li><strong>Conexão com o público</strong> — Pessoas que adotam ou cuidam de pets podem conhecer seu estabelecimento.</li>
                    </ul>
                  </td>
                </tr>
              </table>
              ${portalImagesBlock}

              <h2 style="margin: 24px 0 12px 0; font-size: 17px; font-weight: 700; color: #1C1917;">Divulgue o Adopet</h2>
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #57534E;">Quanto mais pessoas conhecerem o app, mais pets encontram lar. Indique o Adopet para clientes, nas redes sociais e no seu estabelecimento — você ganha visibilidade e mais pessoas adotam com responsabilidade.</p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #57534E;">Compartilhe: <strong>appadopet.com.br</strong> — adoção voluntária, sem comercialização de animais.</p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #FEF3C7; border-radius: 12px; border: 1px solid #FCD34D; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #92400E;"><strong>Importante:</strong> O Adopet não incentiva nem apoia a comercialização de pets. Todas as adoções no app são voluntárias; não há compra e venda de animais. Nosso objetivo é conectar quem quer adotar a quem oferece um lar com responsabilidade.</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 8px 0 16px 0;">
                    <a href="https://appadopet.com.br/" style="display: inline-block; background: linear-gradient(135deg, #0D9488 0%, #0F766E 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4);">Acessar o portal do parceiro</a>
                  </td>
                </tr>
              </table>
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

export function getPartnerWelcomePaidEmailText(data: PartnerWelcomePaidEmailData): string {
  return `Bem-vindo(a), ${data.partnerName}!

Seu cadastro foi concluído e o pagamento confirmado. Você já faz parte da rede de parceiros do Adopet.

Expectativas: A parceria com o Adopet não garante aumento de vendas. Ela pode gerar visibilidade para um público que gosta de pets e valoriza adoção responsável — o que pode ajudar nos seus resultados. Recomendamos divulgar seus cupons e serviços no app e acompanhar o que funciona melhor para o seu negócio.

O que sua parceria oferece:
- Visibilidade: sua página e ofertas aparecem para quem busca pets na região.
- Portal do parceiro: gerencie cupons, serviços e informações no app (Perfil → Parceiro → Portal do parceiro).
- Conexão com o público: pessoas que adotam ou cuidam de pets podem conhecer seu estabelecimento.

Conheça o portal do parceiro: no app, Perfil → Parceiro → Portal do parceiro. Lá você gerencia dados do estabelecimento, cupons de desconto, serviços prestados, analytics e sua assinatura.

Divulgue o Adopet: quanto mais pessoas conhecerem o app, mais pets encontram lar. Indique o Adopet para clientes e nas redes sociais. Compartilhe: appadopet.com.br — adoção voluntária, sem comercialização de animais.

Importante: O Adopet não incentiva nem apoia a comercialização de pets. Todas as adoções no app são voluntárias; não há compra e venda de animais.

Acessar o portal: https://appadopet.com.br/

Equipe Adopet`;
}
