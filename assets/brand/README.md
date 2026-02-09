# Brand assets — Adopet

Assets oficiais de identidade visual do Adopet. **Não criar nem modificar visualmente.**

## Estrutura

- **logo/** — Logo horizontal (light e dark)
- **icon/** — Ícone do app (light e dark) para app icon e adaptive icon
- **splash/** — Splash screen (light e dark)

## Uso no app mobile

O app em `apps/mobile` referencia estes arquivos em `app.json` (caminhos relativos à pasta do app, ex.: `../../assets/brand/...`).

Se algum asset não estiver no tamanho ideal para a store (ex.: ícone 1024x1024 para iOS), **não recriar o arte**. Documentar no README do mobile como redimensionar ou substituir o arquivo no futuro.
