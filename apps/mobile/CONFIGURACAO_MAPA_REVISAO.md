# Revisão ponto a ponto – Mapa em produção

Use este checklist para conferir **cada item** da configuração do mapa. Marque conforme for verificando.

**Documentação oficial:** [Maps SDK for Android](https://developers.google.com/maps/documentation/android-sdk?hl=pt_BR) · [Como usar chaves de API](https://developers.google.com/maps/documentation/android-sdk/get-api-key?hl=pt_BR) · [Configurar no console do Cloud](https://developers.google.com/maps/documentation/android-sdk/cloud-setup?hl=pt_BR)

---

## 1. Google Cloud Console

### 1.1 Projeto
- [ ] Acesse [Google Cloud Console](https://console.cloud.google.com/).
- [ ] Confirme que está no **projeto correto** (o mesmo usado pelo app).
- [ ] Se não tiver projeto, crie um e anote o ID/nome.

### 1.2 Maps SDK for Android
- [ ] Menu **APIs & Services** → **Library** (Biblioteca).
- [ ] Busque por **"Maps SDK for Android"**.
- [ ] Clique na API e confirme que está **Ativada** (botão "Enable" / "Ativar" se ainda não estiver).
- [ ] Sem essa API ativada, os tiles do mapa **não carregam** em produção.

### 1.3 Maps SDK for iOS (se tiver app iOS)
- [ ] Na mesma Library, busque **"Maps SDK for iOS"**.
- [ ] Ative se o app for publicado na App Store.

### 1.4 Faturamento (Billing)
- [ ] Menu **Billing** (Faturamento) no Cloud Console.
- [ ] Confirme que o projeto tem uma **conta de faturamento vinculada**.
- [ ] Sem conta vinculada, a Google pode **não liberar os tiles** em produção (mapa em branco), mesmo com API key correta.
- [ ] Há cota gratuita; o uso típico do Maps SDK costuma ficar dentro dela.

---

## 2. SHA-1 de produção (obrigatório para Android)

O app na **Play Store** é assinado com um certificado diferente do emulador/debug. A API key precisa do SHA-1 **desse** certificado.

- [ ] Acesse [Play Console](https://play.google.com/console) → seu app Adopet.
- [ ] **Release** → **Setup** → **App integrity** → **App signing**.
- [ ] Em **App signing key certificate**, copie o **SHA-1 certificate fingerprint**.
- [ ] Guarde esse valor: ele será usado no próximo passo no Google Cloud.
- [ ] **Não use** só o SHA-1 do keystore de upload ou do debug; use o da **App signing** (produção).

---

## 3. API key no Google Cloud

### 3.1 Criar ou editar a chave
- [ ] Google Cloud → **APIs & Services** → **Credentials** (Credenciais).
- [ ] Se já existir uma API key para o app, **edite**. Senão: **Create credentials** → **API key**.
- [ ] A documentação do Google recomenda **restringir a chave antes de usar em produção** (próximos passos).

### 3.2 Restrições de aplicativo (Android)
- [ ] Em **Application restrictions** → selecione **Android apps**.
- [ ] **Add an item** e preencha:
  - **Package name:** `br.com.adopet.app` (igual ao `android.package` do `app.json`).
  - **SHA-1 certificate fingerprint:** o valor copiado no passo 2 (App signing da Play Console).
- [ ] Salve.

### 3.3 Restrições de API (recomendado)
- [ ] Em **API restrictions** → **Restrict key**.
- [ ] Selecione **Maps SDK for Android** (e **Maps SDK for iOS** se tiver app iOS).
- [ ] Salve e **copie o valor da API Key** para o próximo passo.

---

## 4. Variáveis de ambiente no EAS (expo.dev)

As variáveis são injetadas no **build**; não vêm do `.env` do seu computador em produção.

- [ ] Acesse [expo.dev](https://expo.dev) → projeto **Adopet**.
- [ ] **Project settings** → **Secrets** (ou **Environment variables**).

### 4.1 GOOGLE_MAPS_API_KEY
- [ ] Existe um secret com **Name** = `GOOGLE_MAPS_API_KEY`?
- [ ] O **Value** é exatamente a API key copiada do Google Cloud (sem espaços no início/fim)?
- [ ] O ambiente **Production** está marcado (e Preview se quiser testar builds de preview)?
- [ ] Se alterou o valor, é necessário **gerar um novo build** para o app passar a usar a chave nova.

### 4.2 EXPO_PUBLIC_API_URL (para o backend e pins do mapa)
- [ ] Existe um secret com **Name** = `EXPO_PUBLIC_API_URL`?
- [ ] O **Value** é a URL base da API em produção **sem** `/v1` no final (ex.: `https://adopet-api-six.vercel.app` ou `https://sua-api.vercel.app`).
- [ ] O ambiente **Production** está marcado.
- [ ] O app adiciona `/v1` internamente; o endpoint dos pins é `GET /v1/feed/map`.

---

## 5. Código do app (já configurado no projeto)

Só para conferência; não precisa mudar se estiver assim.

### 5.1 app.config.js
- [ ] O arquivo `apps/mobile/app.config.js` usa `process.env.GOOGLE_MAPS_API_KEY` dentro de `expo.android.config.googleMaps.apiKey`.
- [ ] A chave só é injetada quando a variável existe no momento do build (EAS passa os Secrets como env).

### 5.2 app.json / package name
- [ ] Em `apps/mobile/app.json` → `expo.android.package` está **`br.com.adopet.app`**.
- [ ] Esse valor deve ser **idêntico** ao package name configurado na restrição da API key no Google Cloud.

### 5.3 Backend – endpoint do mapa
- [ ] A API expõe `GET /v1/feed/map?lat=...&lng=...&radiusKm=...`.
- [ ] Em produção, a API está acessível pela internet (não só localhost) e a URL usada pelo app é a mesma de `EXPO_PUBLIC_API_URL`.

---

## 6. Build e publicação

- [ ] Depois de alterar **qualquer** Secret no EAS (em especial `GOOGLE_MAPS_API_KEY` ou `EXPO_PUBLIC_API_URL`), é necessário **gerar um novo build** de produção.
- [ ] Comando típico: `cd apps/mobile && npx eas-cli build --platform android --profile production`.
- [ ] Após o build, envie o novo AAB para a Play Console e publique a versão para o mapa passar a usar a configuração atualizada.

---

## Resumo rápido

| Onde | O que conferir |
|------|-----------------|
| **Google Cloud** | Projeto ativo; **Maps SDK for Android** ativado; **Billing** vinculado; API key com **SHA-1 de produção** (Play Console → App signing) e **package** `br.com.adopet.app`. |
| **EAS (expo.dev)** | Secrets **GOOGLE_MAPS_API_KEY** e **EXPO_PUBLIC_API_URL** definidos para **Production**. |
| **Build** | Novo build após qualquer mudança em Secret; publicar nova versão na Play Store. |

Se o mapa ainda ficar em branco ou carregando após revisar tudo, confira de novo: **SHA-1 de produção** (não o de debug) e **conta de faturamento** no Google Cloud — são as causas mais comuns.

---

## Referência oficial (Google)

- **Certificado SHA-1:** para app na Play Store com *Assinatura de apps do Google Play*, use o SHA-1 do **certificado da chave de assinatura do app** (App signing key), não o da chave de upload. Ver [Trabalhar com provedores de API](https://developer.android.com/studio/publish/app-signing?hl=pt-br#api-providers).
- **Restrições:** nome do pacote + impressão digital SHA-1 em *Restrições de aplicativo* (Apps Android); em *Restrições de API*, selecione **SDK do Maps para Android**. Se a API não aparecer na lista, ative-a em [Configurar no console do Cloud](https://developers.google.com/maps/documentation/android-sdk/cloud-setup?hl=pt-br#enabling-apis).
- **Práticas recomendadas:** [Restringir chaves de API](https://developers.google.com/maps/api-security-best-practices?hl=pt-br#restricting-api-keys).
