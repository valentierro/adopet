# Links universais (Universal Links / App Links)

Estes arquivos permitem que links `https://appadopet.com.br/pet/ID` abram o app Adopet quando instalado (em vez de só a página web).

## O que fazer antes de publicar

### 1. iOS – `apple-app-site-association`

- Substitua **TEAMID** pelo seu **Apple Team ID** (10 caracteres).
- Encontre em: [Apple Developer](https://developer.apple.com/account) → Membership → Team ID.
- Exemplo: se o Team ID for `ABC12XYZ34`, o `appID` deve ser `ABC12XYZ34.br.com.adopet.app`.
- O arquivo deve ser servido em `https://appadopet.com.br/.well-known/apple-app-site-association` (sem extensão), com `Content-Type: application/json`.

### 2. Android – `assetlinks.json`

- Substitua **REPLACE_WITH_SHA256_FINGERPRINT_FROM_EAS_OR_PLAY_CONSOLE** pelo SHA256 do certificado de assinatura do app.
- Com EAS Build: após um build, use o valor em "SHA256 Fingerprint" ou rode `eas credentials -p android` e escolha o perfil para ver o fingerprint.
- Na Play Console: Release → Setup → App Signing → copie o SHA-256 do certificado de upload.
- Formato: `AA:BB:CC:...` (separado por dois pontos). Pode incluir vários fingerprints no array se usar mais de um certificado (ex.: debug + release).

### 3. Deploy

- Faça o deploy da landing com estes arquivos em `/.well-known/`.
- Confirme que estão acessíveis:  
  `https://appadopet.com.br/.well-known/apple-app-site-association`  
  `https://appadopet.com.br/.well-known/assetlinks.json`
- O app já está configurado em `apps/mobile/app.config.js` (`associatedDomains` e `intentFilters`). Gere um novo build após alterar os well-known.
