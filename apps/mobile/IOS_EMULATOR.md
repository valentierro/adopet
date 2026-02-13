# Testar o app no simulador iOS (Expo)

## Pré-requisitos (só no Mac)

1. **Xcode** – instale pela App Store.
2. **Xcode Command Line Tools** (se ainda não tiver):
   ```bash
   xcode-select --install
   ```
3. **Simulador iOS** – vem com o Xcode. Abra Xcode → **Window → Devices and Simulators** e confira se há algum simulador (ex.: iPhone 15).

## Passos para rodar no simulador

### 1. Instalar dependências (na raiz do monorepo)

```bash
cd /Users/erickvalentin/Documents/adopet
pnpm install
```

O `postinstall` do app mobile aplica o patch do getDevServer (necessário para o simulador).

### 2. API rodando (opcional, para login/feed)

Em outro terminal:

```bash
cd /Users/erickvalentin/Documents/adopet
pnpm dev:api
```

No `.env` do mobile, `EXPO_PUBLIC_API_URL` deve apontar para onde a API está (ex.: `http://localhost:3000`). No simulador iOS, **localhost** é a própria máquina, então `http://localhost:3000` funciona.

### 3. Subir o Metro e abrir no iOS

Na pasta do app mobile:

```bash
cd apps/mobile
pnpm dev
```

Quando o Metro abrir, no terminal:

- Pressione **`i`** para abrir no **simulador iOS** (Expo Go será aberto no simulador e carregará o bundle).

Se o simulador não abrir sozinho:

- Abra o **Simulador** pelo Xcode (**Xcode → Open Developer Tool → Simulator**) e escolha um iPhone.
- No terminal do Metro, pressione **`i`** de novo.

### 4. Alternativa: script direto

```bash
cd apps/mobile
pnpm ios
```

Isso roda `expo start --ios`: inicia o Metro e tenta abrir no simulador iOS.

## Se der erro no simulador

- **“Could not connect to Metro”**  
  Confira se o Metro está rodando no mesmo Mac e se a porta é 8081. No simulador, localhost = sua máquina.

- **Erro de getDevServer / “embedded environments”**  
  Rode o patch e limpe o cache:
  ```bash
  cd apps/mobile
  node scripts/patch-expo-router-getDevServer.js
  pnpm reset-cache
  ```
  Depois `pnpm dev` e **`i`** de novo.

- **Expo Go não está instalado no simulador**  
  Na primeira vez que pressionar **`i`**, o Expo pode instalar o Expo Go no simulador. Se não instalar, abra o Simulador, vá na App Store (no simulador) e instale “Expo Go”, ou use `npx expo start --ios` para o CLI tentar instalar.

- **Build nativo (sem Expo Go)**  
  Se um dia você usar development build no iOS:
  ```bash
  cd apps/mobile
  npx expo run:ios
  ```
  Isso gera o projeto nativo em `ios/` e abre no simulador (exige CocoaPods e mais tempo na primeira vez).

## Se Expo Go der "constructor is not callable" no simulador

O Expo Go no iOS (Hermes) pode falhar com esse erro. Use uma das alternativas abaixo.

### Alternativa 1: Development build local (recomendado)

Gera o app nativo e roda no simulador **sem Expo Go**. O JS continua vindo do Metro.

**Requisitos:** Xcode e CocoaPods instalados no Mac.

```bash
cd apps/mobile
npx expo run:ios
```

Na primeira vez o Expo faz prebuild (cria a pasta `ios/`), instala pods e compila. Depois abre o simulador com o app. O Metro sobe junto; para rodar de novo, use o mesmo comando ou `pnpm dev` e abra o app já instalado no simulador.

### Alternativa 2: Build de desenvolvimento no EAS (simulador)

Gera um .app para simulador na nuvem. Depois você instala no simulador e aponta para o Metro na sua máquina.

```bash
cd apps/mobile
npx eas-cli build --platform ios --profile development_simulator
```

Quando terminar, baixe o artefato, extraia o .app e arraste para o Simulador (ou use `xcrun simctl install booted caminho/do.app`). Rode o Metro com `pnpm dev` e abra o app no simulador.

### Alternativa 3: Testar no iPhone físico com Expo Go

Às vezes o erro só acontece no simulador. No mesmo Mac:

1. Conecte o iPhone por USB (ou use a mesma rede Wi‑Fi).
2. Rode `cd apps/mobile && pnpm dev`.
3. Escaneie o QR code com a câmera do iPhone e abra no Expo Go.

No `.env` do mobile use o IP do Mac em vez de localhost, ex.: `EXPO_PUBLIC_API_URL=http://192.168.1.X:3000`.

---

## Resumo rápido (Expo Go)

```bash
# Terminal 1 – API (opcional)
pnpm dev:api

# Terminal 2 – app no iOS
cd apps/mobile && pnpm dev
# No Metro: pressione "i"
```
