# Imagens do e-mail de boas-vindas ao parceiro pago

Coloque aqui as duas imagens usadas no e-mail de boas-vindas (após pagamento confirmado):

| Arquivo                | Descrição |
|------------------------|-----------|
| **portal-menu.jpeg**   | Screenshot do menu do app (Perfil) com a seção "Parceiro" expandida, mostrando o item "Portal do parceiro". |
| **portal-dashboard.jpeg** | Screenshot da tela principal do portal do parceiro: nome do estabelecimento, badge "Assinatura ativa", data da parceria, botão "Ver página pública" e a lista de atalhos (Dados do estabelecimento, Cupons de desconto, Serviços prestados, Analytics, Assinatura). |

Se esses arquivos existirem, o e-mail enviado pelo webhook Stripe (`checkout.session.completed`) incluirá as imagens inline na seção "Conheça o portal do parceiro". Se não existirem, o e-mail é enviado normalmente com apenas o texto dessa seção.

**Como gerar as imagens:** faça screenshots no simulador ou dispositivo (ex.: iPhone 14 Pro Max) das duas telas e salve como `portal-menu.jpeg` e `portal-dashboard.jpeg` nesta pasta.
