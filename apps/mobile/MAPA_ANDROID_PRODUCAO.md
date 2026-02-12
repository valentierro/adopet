# Mapa no Android em produção (evitar crash / carregando infinito)

**Revisão ponto a ponto:** use o checklist em [CONFIGURACAO_MAPA_REVISAO.md](./CONFIGURACAO_MAPA_REVISAO.md) para conferir cada item da configuração.

A tela **Ver no mapa** usa `react-native-maps`. No **emulador e em desenvolvimento** o mapa costuma funcionar; no **app em produção** (build da Play Store) o Android usa o **Google Maps** com regras diferentes. Sem a configuração correta, o mapa pode crashar, ficar em branco ou carregando para sempre.

## Por que funciona no emulador e não em produção?

- **Assinatura diferente:** no emulador/debug o app usa um **SHA-1 de debug**. Na Play Store o app é assinado com outro certificado (**App signing**). A API key do Google Maps deve ter o **SHA-1 de produção** (o da Play Console), senão os tiles do mapa não carregam em dispositivos reais.
- **Faturamento:** em alguns contextos a Google só libera os tiles do mapa quando o projeto tem **conta de faturamento** vinculada (há cota gratuita).
- **Variável no build:** a `GOOGLE_MAPS_API_KEY` precisa estar definida no **ambiente de produção** do EAS e o build deve ser feito com esse profile.

## O que a tela do mapa usa

- **API:** mesmo backend do app — endpoint `GET /v1/feed/map` (lat, lng, radiusKm). Usa a variável **`EXPO_PUBLIC_API_URL`** (já usada em todo o app).
- **Variável de ambiente específica do mapa (Android):** **`GOOGLE_MAPS_API_KEY`**. Só é usada no **build** do app (EAS), não em tempo de execução.

## Passos para o mapa funcionar em produção (Android)

### 1. Google Cloud – projeto e **ativar** o Maps SDK

1. Acesse [Google Cloud Console](https://console.cloud.google.com/) e crie um projeto (ou use um existente).
2. Vá em **APIs & Services** → **Library** (Biblioteca).
3. Procure por **Maps SDK for Android** e clique na API.
4. **Clique no botão "Ativar" (ou "Enable")** no topo da página.  
   **Sim, é obrigatório ativar.** Sem isso a API key não consegue carregar os tiles do mapa e o mapa fica em branco ou carregando em produção.
5. Se você tiver app iOS no futuro, ative também **Maps SDK for iOS** no mesmo projeto.

### 2. SHA-1 do app em produção (obrigatório)

Use o SHA-1 do **app que está na Play Store** (assinatura de produção), **não** o do seu keystore local:

1. [Play Console](https://play.google.com/console) → seu app → **Release** → **Setup** → **App integrity** → **App signing**.
2. Em **App signing key certificate**, copie o **SHA-1 certificate fingerprint**.
3. Esse é o SHA-1 que deve estar na restrição da API key no Google Cloud. Se você colocou só o SHA-1 do seu keystore de upload, o mapa pode funcionar no emulador mas não para usuários que baixaram da Play Store.

### 3. Criar a API key

1. No Google Cloud: **APIs & Services** → **Credentials** → **Create credentials** → **API key**.
2. Edite a chave criada:
   - Em **Application restrictions** → **Android apps**.
   - **Add an item**: package name = `br.com.adopet.app` (o mesmo do `app.json`).
   - Adicione o **SHA-1** copiado no passo 2.
3. Em **API restrictions** (opcional mas recomendado): restrinja só a **Maps SDK for Android**.
4. Salve e copie o valor da **API Key**.

### 4. Colocar a chave no EAS (build de produção)

1. Acesse [expo.dev](https://expo.dev) → projeto **Adopet**.
2. **Project settings** → **Secrets** (ou **Environment variables**).
3. Crie uma variável:
   - **Name:** `GOOGLE_MAPS_API_KEY`
   - **Value:** a API key copiada do Google Cloud.
   - **Environment:** marque **Production** (e Preview se quiser testar builds de preview).
4. Salve.

### 5. Novo build

Gere um novo build de produção para Android para que a chave seja incluída no app:

```bash
cd apps/mobile
npx eas-cli build --platform android --profile production
```

Depois de publicar essa nova versão na Play Store, o mapa deve parar de fechar em produção.

## Resumo

| Onde              | Variável / Configuração |
|-------------------|--------------------------|
| **Backend (API)** | Nenhuma específica do mapa; o app usa `EXPO_PUBLIC_API_URL` para `/v1/feed/map`. |
| **Build Android** | `GOOGLE_MAPS_API_KEY` no EAS (Secrets) + Maps SDK for Android ativado e API key restrita no Google Cloud. |

Sem `GOOGLE_MAPS_API_KEY` no build de produção, o Android não consegue inicializar o mapa e o app pode crashar ao abrir a tela do mapa.

---

## Mapa abre mas fica carregando infinitamente (telas em branco / spinner)

Se o app **não fecha** mais, mas o mapa **não aparece** e fica só o loading:

1. **Conta de faturamento no Google Cloud (muito comum)**  
   A Google exige uma **conta de faturamento** vinculada ao projeto (mesmo no free tier). Sem isso, os tiles do mapa podem **não carregar em produção** (e o mapa fica em branco ou carregando), mesmo com API key e SHA-1 corretos.
   - No [Google Cloud Console](https://console.cloud.google.com/) → **Billing** (menu lateral) → clique em **Ativar** / **Link a billing account** e vincule uma conta (há créditos gratuitos e o uso do Maps SDK costuma ficar dentro da cota gratuita).

2. **Maps SDK for Android**  
   Confirme que a API **Maps SDK for Android** está **ativada** no projeto (APIs & Services → Library → Maps SDK for Android → Enable).

3. **Restrições da API key**  
   Se a chave estiver restrita por app (package + SHA-1), confira se o **package** é `br.com.adopet.app` e o **SHA-1** é o da assinatura de produção (Play Console → App integrity → App signing).  
   Se estiver restrita por API, inclua **Maps SDK for Android**.

4. **Pins (pets) não aparecem**  
   Os pins vêm da **API do app** (`/v1/feed/map`). Se o mapa aparecer mas não houver pins, verifique rede e URL da API (`EXPO_PUBLIC_API_URL` no build de produção). Na tela do mapa, toque em **Atualizar** para tentar de novo.

---

## Ajustes no app para produção (resiliência)

O app foi ajustado para reduzir falhas do mapa em produção:

- **Uma única requisição de pins**: a requisição aos pins só é feita depois que a localização está pronta (permissão + coordenadas), evitando requisições duplicadas e timeouts.
- **Mais tentativas**: a requisição `/feed/map` é refeita até 5 vezes (4 retentativas) com 2 s de intervalo.
- **Timeout maior**: a requisição do mapa usa timeout de 35 s (em vez dos 20 s padrão), para redes ou API mais lentas.
- **Mensagem em caso de timeout**: se der timeout, é exibido "Demorou para carregar. Toque em Atualizar para tentar de novo."

Se mesmo assim o mapa falhar em produção, confira: `EXPO_PUBLIC_API_URL` no build, assinatura do app (SHA-1) na API key do Google, e se o backend está acessível pela rede do dispositivo (não só localhost).

---

## Checklist rápido: mapa não carrega só em produção

| Item | Onde verificar |
|------|----------------|
| **SHA-1 de produção** | Play Console → App integrity → **App signing** → SHA-1. Esse valor deve estar na API key no Google Cloud (não use só o SHA-1 de debug). |
| **Faturamento** | Google Cloud → Billing → conta vinculada ao projeto (obrigatório para tiles em produção). |
| **Maps SDK for Android** | Google Cloud → APIs & Services → Library → ativado. |
| **GOOGLE_MAPS_API_KEY** | EAS → Project settings → Secrets → Production. Build novo após adicionar. |
| **Package name** | Na restrição da API key: `br.com.adopet.app` (ou o do seu `app.json`). |
