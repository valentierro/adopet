# Swagger UI standalone

Documentação OpenAPI da Adopet em HTML que permite **Try it out** — executar chamadas da API direto do navegador.

## Como usar

1. **Local (com API rodando):** Abra `docs/swagger/index.html` no navegador. Ele detecta localhost e carrega o spec de `http://localhost:3000/api/docs-json`. Use **Authorize** para colar o JWT e **Try it out** para executar chamadas.

2. **GitHub Pages:** O Swagger usa automaticamente `openapi.json` (spec estático na mesma pasta), evitando erro de mixed-content e localhost inacessível.

3. **Atualizar o spec completo:** Rode `pnpm openapi:fetch` com a API em execução para gerar `openapi.json` atualizado com todos os endpoints. Faça commit e push para atualizar a doc no GitHub Pages.

4. **URL manual:** Use `?url=URL` para carregar outro spec (ex: `?url=https://api.appadopet.com.br/api/docs-json`).

## Alternativa: Swagger embutido

Com a API rodando, acesse diretamente: http://localhost:3000/api/docs
