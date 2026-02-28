# Geolocalização de parceiros no mapa

## Como funciona

Os pins de **ONGs** e **parceiros comerciais** (clínicas, lojas) no mapa vêm da API `/feed/map-partners`, que:

1. Busca parceiros com `active=true`, `approvedAt` e `activatedAt` preenchidos
2. Filtra os que têm `latitude` e `longitude` no banco
3. Calcula a distância (haversine) entre a posição do usuário e cada parceiro
4. Retorna apenas os que estão dentro do raio (ex.: 350 km)

## Onde ficam as coordenadas

- **Schema:** `Partner.latitude`, `Partner.longitude` (Float, opcional)
- **Seed:** O seed atribui coordenadas usando `CITY_COORDS` para Recife, Jaboatão dos Guararapes e Caruaru (PE)
- **Backfill:** Parceiros criados sem coordenadas podem ser preenchidos com o script de geocoding

## Se não aparecer nenhum parceiro

Possíveis causas:

1. **Nenhum parceiro na base** — rode o seed: `./scripts/seed.sh`
2. **Parceiros sem lat/lng** (ex.: ONGs não aparecem) — rode o backfill:
   ```bash
   cd apps/api && pnpm run db:backfill-partner-coordinates
   ```
3. **Usuário longe dos parceiros** — o seed coloca parceiros em PE (Recife, Jaboatão, Caruaru). Se você testa em SP, MG etc., 350 km não alcança. Soluções:
   - Aumentar o raio no mapa (até 500 km)
   - Adicionar parceiros de teste na sua região
   - Simular localização no dispositivo (Xcode: Debug → Simulate Location)
4. **Parceiros não ativados** — `activatedAt` deve estar preenchido (o seed já define)

## Adicionando coordenadas manualmente

```sql
UPDATE "Partner"
SET latitude = -23.5505, longitude = -46.6333
WHERE slug = 'seu-parceiro';
```

Ou via script de backfill, que usa geocoding da cidade informada no cadastro.
