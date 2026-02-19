# Cupons Stripe (20%, 50%, 100% de desconto)

O checkout de assinatura de parceiros já aceita **códigos promocionais** (`allow_promotion_codes: true`). Você pode criar 3 cupons no Stripe: **20%**, **50%** e **100%** de desconto.

---

## Opção 1: Script (recomendado)

Na pasta `apps/api`, com `STRIPE_SECRET_KEY` no `.env`:

```bash
cd apps/api
pnpm run stripe:create-coupons
```

Isso cria:

| Desconto | Nome que aparece no checkout (para o usuário) | Código que o parceiro digita |
|----------|-----------------------------------------------|------------------------------|
| 20%      | 20% de desconto na parceria Adopet            | **ADOPET20**                 |
| 50%      | 50% de desconto na parceria Adopet            | **ADOPET50**                 |
| 100%     | Parceria cortesia Adopet (100% de desconto)   | **ADOPET100**                |

- **Duração:** `once` — o desconto vale **só na primeira cobrança** (primeiro mês). A partir do segundo mês a assinatura é cobrada integralmente. (No script você pode trocar para `forever` se quiser desconto em todo mês.)
- Use primeiro em **modo teste** (`sk_test_...` no `.env`); depois rode de novo em produção (`sk_live_...`) se quiser os mesmos códigos em live.

---

## Opção 2: Stripe Dashboard (manual)

### 1. Criar os cupons

1. Acesse [Stripe Dashboard → Produtos → Cupons](https://dashboard.stripe.com/coupons) (ou **Coupons** no menu).
2. Clique em **Criar cupom** (Create coupon) para cada um:

| Nome (aparece para o usuário no checkout) | Desconto | Duração |
|-------------------------------------------|----------|---------|
| 20% de desconto na parceria Adopet        | 20%      | Uma vez |
| 50% de desconto na parceria Adopet        | 50%      | Uma vez |
| Parceria cortesia Adopet (100% de desconto) | 100%  | Uma vez |

- Em **Tipo de desconto**, escolha **Porcentagem** e informe 20, 50 ou 100.
- Em **Duração**, escolha **Uma vez** (Once) — o desconto vale só na primeira cobrança (primeiro mês); a partir do segundo mês a assinatura é cobrada integralmente.
3. Salve cada cupom. Anote o **ID do cupom** (ex.: `cu_xxx`) se for criar códigos depois.

### 2. Criar códigos de promoção

Para o parceiro poder digitar um código no checkout:

1. Vá em [Códigos promocionais](https://dashboard.stripe.com/promotion_codes) (Promotion codes).
2. **Criar código** para cada cupom:
   - **Cupom:** selecione o cupom criado (ex.: Adopet 20% off).
   - **Código:** `ADOPET20`, `ADOPET50` ou `ADOPET100` (o que o usuário vai digitar).
3. Salve. Repita para os outros dois cupons.

---

## O que o usuário vê

No **checkout do Stripe**, ao aplicar o código, o nome do cupom aparece na linha do desconto, por exemplo:
- *"20% de desconto na parceria Adopet"*
- *"50% de desconto na parceria Adopet"*
- *"Parceria cortesia Adopet (100% de desconto)"*

---

## Texto para enviar ao parceiro (e-mail / mensagem)

Você pode usar algo assim ao passar o código:

- **20%:**  
  *"Use o código **ADOPET20** no pagamento da parceria para 20% de desconto no primeiro mês."*

- **50%:**  
  *"Use o código **ADOPET50** no pagamento da parceria para 50% de desconto no primeiro mês."*

- **100% (cortesia):**  
  *"Use o código **ADOPET100** no pagamento da parceria para o primeiro mês cortesia (100% de desconto)."*

---

## Uso no app

No fluxo de **Assinatura / Pagamento** do parceiro, na tela de checkout do Stripe aparece o campo **“Código promocional”**. O parceiro digita o código (ex.: ADOPET20) e o Stripe aplica o desconto e exibe o nome do cupom. Nenhuma alteração de código no app é necessária.
