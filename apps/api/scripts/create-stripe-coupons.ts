/**
 * Cria no Stripe 3 cupons de desconto (20%, 50%, 100%) e seus códigos de promoção,
 * para uso no checkout de assinatura de parceiros (campo "Código promocional").
 *
 * Uso (a partir de apps/api, com STRIPE_SECRET_KEY no .env ou no ambiente):
 *   pnpm run stripe:create-coupons
 *
 * Ou:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/create-stripe-coupons.ts
 *
 * Requer: STRIPE_SECRET_KEY no .env (ou export no shell).
 * Modo: usa a chave que estiver configurada (test ou live). Rode em teste primeiro.
 */
import * as fs from 'fs';
import * as path from 'path';
import Stripe from 'stripe';

function loadEnv(): void {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) {
      const val = m[2].replace(/^["']|["']$/g, '').trim();
      process.env[m[1]] = val;
    }
  }
}

loadEnv();

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error('Defina STRIPE_SECRET_KEY no .env (em apps/api) ou no ambiente.');
  process.exit(1);
}

const stripe = new Stripe(secretKey, { apiVersion: '2026-01-28.clover' });

/** Nome é o que aparece para o usuário no checkout do Stripe ao aplicar o código.
 *  duration: 'once' = desconto só na primeira cobrança (1 mês); 'forever' = em toda cobrança. */
const COUPONS = [
  { percent_off: 20, name: '20% de desconto na parceria Adopet', code: 'ADOPET20' },
  { percent_off: 50, name: '50% de desconto na parceria Adopet', code: 'ADOPET50' },
  { percent_off: 100, name: 'Parceria cortesia Adopet (100% de desconto)', code: 'ADOPET100' },
] as const;

const DURATION: 'once' | 'forever' = 'once'; // uma vez = só no primeiro mês

async function main() {
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY required');
  console.log('Criando cupons e códigos de promoção no Stripe...\n');
  const isTest = secretKey.startsWith('sk_test_');
  console.log(`Modo: ${isTest ? 'TESTE' : 'PRODUÇÃO'}\n`);

  for (const { percent_off, name, code } of COUPONS) {
    const coupon = await stripe.coupons.create({
      percent_off,
      duration: DURATION,
      name,
    });
    console.log(`Cupom: ${name} (${percent_off}% off) — id: ${coupon.id}`);

    const promotionCode = await stripe.promotionCodes.create({
      promotion: { type: 'coupon', coupon: coupon.id },
      code,
    });
    console.log(`  Código promocional: ${code} — id: ${promotionCode.id}\n`);
  }

  console.log('Pronto. Os parceiros podem usar ADOPET20, ADOPET50 ou ADOPET100 no checkout.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
