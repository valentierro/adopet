# Testar o app no celular

## “Diz que não tenho internet” ao logar

O app no celular não consegue acessar a API se ela estiver em `localhost`: no celular, “localhost” é o próprio aparelho, não o seu computador.

**Faça o seguinte:**

1. **Descubra o IP do seu computador na rede Wi‑Fi**
   - Mac: Ajustes de Sistema → Rede → Wi‑Fi → Detalhes (ou no Terminal: `ipconfig getifaddr en0`).
   - Windows: `ipconfig` e veja o “Endereço IPv4” do adaptador Wi‑Fi (ex.: 192.168.1.10).

2. **No projeto, crie ou edite o arquivo `apps/mobile/.env`** e defina a URL da API com esse IP (sem `/v1` no final; o app adiciona):
   ```bash
   EXPO_PUBLIC_API_URL=http://192.168.1.10:3000
   ```
   Troque `192.168.1.10` pelo IP que você anotou.

3. **Reinicie o Expo** (pare com Ctrl+C e rode de novo):
   ```bash
   cd apps/mobile && pnpm dev
   ```
   Depois escaneie o QR code de novo no celular.

4. **Celular e computador na mesma rede Wi‑Fi** e a **API rodando** no computador (`pnpm dev` na API ou `pnpm dev:api` na raiz).

Se ainda der erro, confira se o firewall do Mac/Windows não está bloqueando a porta 3000 para a rede local.

---

## Opção 1: Rápido com Expo Go (desenvolvimento)

Funciona sem conta Apple/Google. Ótimo para testar no dia a dia.

### Pré-requisitos
- Celular e computador na **mesma rede Wi‑Fi**
- No **iPhone**: instale o app **Expo Go** na App Store  
- No **Android**: instale o **Expo Go** na Play Store

### Passos

1. Na pasta do app mobile, suba o servidor:
   ```bash
   cd apps/mobile
   pnpm dev
   ```
2. No terminal aparecerá um **QR code**.
3. **iPhone**: abra o app **Câmera**, aponte para o QR code e toque na notificação que aparecer (abre no Expo Go).  
   **Android**: abra o **Expo Go** e use “Scan QR code”.
4. O app carregará no celular. Se a API rodar em `localhost`, o celular não vai alcançá-la. Duas opções:
   - **Túnel**: rode `pnpm dev -- --tunnel` e use o QR code do túnel (mais lento, mas a API pode ficar em localhost se for acessível por URL).
   - **Mesma rede**: configure a API com o IP da sua máquina (ex.: `EXPO_PUBLIC_API_URL=http://192.168.1.X:3000`) e use esse IP no `.env` do mobile. Assim o celular acessa a API na sua rede.

---

## Opção 2: TestFlight (iOS) ou build instalável (Android)

Para instalar como app “de verdade” e compartilhar com testadores. **iOS**: precisa de conta **Apple Developer** (paga, ~US$ 99/ano).

### Configurar o EAS (uma vez)

1. Instale o EAS CLI:
   ```bash
   npm install -g eas-cli
   ```
2. Login na Expo:
   ```bash
   eas login
   ```
3. Na pasta do app mobile, configure o EAS (já existe `eas.json` neste projeto):
   ```bash
   cd apps/mobile
   eas build:configure
   ```
   Se pedir para criar `eas.json`, confirme. Depois você pode ajustar perfis em `eas.json`.

### iOS (TestFlight)

1. Gere o build:
   ```bash
   eas build --platform ios --profile preview
   ```
   Na primeira vez o EAS pode pedir para configurar credenciais (Apple ID, etc.).  
   Use o perfil `preview` para testes; para loja use `production`.

2. Quando o build terminar, envie para o TestFlight:
   ```bash
   eas submit --platform ios --latest
   ```
   Escolha “TestFlight” e siga o assistente (App Store Connect, etc.).

3. No **App Store Connect** (appstoreconnect.apple.com), na aba **TestFlight**, adicione você mesmo (e outros testadores) e instale pelo link que a Apple envia.

### Android (build instalável)

1. Build de desenvolvimento (APK para instalar direto):
   ```bash
   eas build --platform android --profile preview
   ```
2. No painel da Expo (expo.dev) aparecerá o link para **baixar o APK**. Abra no celular e instale (pode ser preciso permitir “Instalar de fontes desconhecidas”).
3. Para testadores internos na Play Store, use um perfil que gera **AAB** e faça o upload na Play Console (internal testing).

---

## Resumo

| Objetivo              | Use              | Comando / ação                          |
|-----------------------|------------------|-----------------------------------------|
| Testar rápido no cel  | Expo Go          | `pnpm dev` + QR code + mesma rede/túnel |
| Instalar no iPhone    | TestFlight       | `eas build --platform ios` + `eas submit` |
| Instalar no Android   | APK do EAS       | `eas build --platform android` + link   |

Se a API estiver em um servidor acessível pela internet, configure `EXPO_PUBLIC_API_URL` no `.env` do mobile com essa URL antes de gerar o build para TestFlight/APK.

---

## Verificação: Parceria e cache de login

### 1. Welcome → formulário de parceria (sem abrir as tabs)

- Abra o app **sem estar logado** (ou toque em **Perfil** → **Sair**).
- Na tela de boas-vindas, toque em **"Clínicas, veterinários, lojas"**.
- **Esperado:** abre a tela **Solicitar parceria** com o formulário comercial (campos de cadastro + plano + botão "Criar conta e ir para pagamento"). **Não** deve aparecer a barra de abas (Início, Favoritos, etc.).
- Toque em **Voltar** e depois em **"Sou ONG ou instituição"**.
- **Esperado:** abre o mesmo formulário no modo ONG (campos de instituição, CEP, etc. e botão "Enviar solicitação").

### 2. Token em cache (reabrir app com sessão expirada)

- Faça login no app e use normalmente.
- **Simule token expirado:** desligue a API ou espere o access token expirar (~15 min), ou no código altere temporariamente o `JWT_SECRET` da API e reinicie-a (o token antigo deixa de ser válido).
- Feche o app por completo (remova do multitarefa) e abra de novo.
- **Esperado:** o app pode mostrar uma tela em branco por 1–2 segundos (validação), depois redireciona para a **tela de boas-vindas** (Welcome), como se não estivesse logado. Não deve entrar direto nas tabs com sessão “fantasma”.

### Teste automatizado (Maestro)

Com o app instalado e o [Maestro CLI](https://maestro.mobile.dev/) instalado:

```bash
cd apps/mobile
maestro test .maestro/flows/04-parceria-welcome-to-form.yaml
```

O fluxo abre o app, toca nos CTAs de parceria e verifica se o formulário correto aparece.
