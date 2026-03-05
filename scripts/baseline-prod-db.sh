#!/usr/bin/env bash
# Baseline da base de produção: cria o schema completo (db push) e marca todas
# as migrations como já aplicadas. Use quando a base é nova e não tem o
# histórico de migrations (ex.: nova base Neon para prod).
# Requer: DATABASE_URL apontando para a base de prod.
# Uso: DATABASE_URL="postgresql://..." ./scripts/baseline-prod-db.sh

set -e
cd "$(dirname "$0")/.."

if [ -z "$DATABASE_URL" ]; then
  echo "Erro: defina DATABASE_URL (base de produção)."
  exit 1
fi

echo ">>> Criando schema completo na base (prisma db push)..."
pnpm --filter api exec -- npx prisma db push

echo ">>> Marcando todas as migrations como aplicadas (baseline)..."
MIGRATIONS=(
  "20260216150000_partner_rejection_reason"
  "20260216160000_partnership_request_table"
  "20260227120000_add_mission_columns"
  "20260227120000_add_user_birth_date"
  "20260227130000_add_partner_lat_lng"
  "20260227140000_kyc_extraction_fields"
  "20260227180000_add_match_score_to_adoption_forms"
  "20260228140000_add_adoption_forms_and_requests"
  "20260228200000_add_partner_subscription_cancellation_fields"
  "20260303000000_add_neutered_pref_to_user_preferences"
  "20260303100000_add_kyc_document_verso_key"
  "20260304100000_add_rg_and_kyc_extracted_fields"
  "20260305100000_add_kyc_fraud_signal"
  "20260305120000_add_kyc_cancelled_fields"
)

for name in "${MIGRATIONS[@]}"; do
  pnpm --filter api exec -- npx prisma migrate resolve --applied "$name"
done

echo ">>> Baseline concluído. A base está pronta para produção."
echo ">>> Daqui pra frente use: DATABASE_URL=... npx prisma migrate deploy"
