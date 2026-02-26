# Swagger UI standalone

Documentação OpenAPI da Adopet em HTML que permite **Try it out** — executar chamadas da API direto do navegador.

## Como usar

1. **Suba a API** (`pnpm dev:api` ou `./scripts/dev-api.sh`)

2. **Abra** `docs/swagger/index.html` no navegador  
   - Por padrão, carrega o spec de `http://localhost:3000/api/docs-json`
   - Use **Authorize** para colar seu JWT
   - Clique em **Try it out** em qualquer endpoint e **Execute**

3. **Para spec estático (offline/GitHub Pages):**
   ```bash
   pnpm openapi:fetch   # gera docs/swagger/openapi.json
   ```
   Depois abra `index.html?url=./openapi.json`

4. **Para apontar à produção:**
   Abra `index.html?url=https://api.appadopet.com.br/api/docs-json`

## Alternativa: Swagger embutido

Com a API rodando, acesse diretamente: http://localhost:3000/api/docs
