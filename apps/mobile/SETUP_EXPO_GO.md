# Testar o app localmente com Expo Go

## Pré-requisitos

- **Node.js** 18+
- **pnpm** (na raiz do projeto: `pnpm install`)
- **Expo Go** instalado no celular ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- Celular e computador na **mesma rede Wi‑Fi** (para testar no aparelho físico)

## 1. Subir a API

A API precisa estar rodando para login, feed, verificações, etc.

```bash
# Na raiz do projeto
pnpm dev:api
```

- A API sobe em **http://0.0.0.0:3000** (acessível na rede).
- Confira se em `apps/api` existe `.env` com `DATABASE_URL` (e opcionalmente `PORT=3000`). Se usar banco local (Docker), rode antes: `pnpm infra:up`.

## 2. Configurar a URL da API no app (Expo Go no celular)

No **celular físico**, o app não enxerga `localhost` (ele é o próprio aparelho). Use o **IP do seu Mac** na rede.

### Descobrir o IP do Mac

```bash
# No Terminal (Mac)
ipconfig getifaddr en0
```

Se usar Wi‑Fi em outra interface (ex.: en1), tente `en1`. O resultado será algo como `192.168.1.10`.

### Criar/editar o .env do app

Na pasta **apps/mobile**:

```bash
cd apps/mobile
cp .env.example .env
```

Edite o `.env` e defina:

- **Testar no celular (Expo Go):** use o IP do passo acima, **sem** `/v1` no final:
  ```env
  EXPO_PUBLIC_API_URL=http://192.168.1.10:3000
  ```
  (troque `192.168.1.10` pelo seu IP.)

- **Só no simulador iOS:** pode deixar:
  ```env
  EXPO_PUBLIC_API_URL=http://localhost:3000
  ```

- **Só no emulador Android:** o app já troca `localhost` por `10.0.2.2` em dev; ou use:
  ```env
  EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
  ```

Salve o arquivo. Não é necessário colocar `/v1`; o client do app adiciona automaticamente.

## 3. Iniciar o projeto Expo

```bash
# Na raiz do projeto
pnpm dev:mobile
```

Ou, dentro de `apps/mobile`:

```bash
cd apps/mobile
pnpm dev
```

- Abre o **Metro** e um **QR code** no terminal.
- Se aparecer opção de **tunnel**, pode usar para acessar de outra rede (o app em si continua usando a URL do `.env` para a API).

## 4. Abrir no Expo Go

- **Celular:** abra o app **Expo Go** e escaneie o QR code (câmera no iOS ou dentro do Expo Go no Android).
- **iOS Simulator:** no terminal do Metro, pressione `i` para abrir no simulador.
- **Android Emulator:** pressione `a` (com emulador já aberto).

## Resumo rápido (celular físico)

1. `pnpm dev:api` (terminal 1).
2. Ver seu IP: `ipconfig getifaddr en0`.
3. Em `apps/mobile/.env`: `EXPO_PUBLIC_API_URL=http://SEU_IP:3000`.
4. `pnpm dev:mobile` (terminal 2).
5. Abrir Expo Go no celular e escanear o QR code.

## Problemas comuns

- **"Unable to connect" / timeout:** celular e Mac na mesma Wi‑Fi? Firewall do Mac não está bloqueando a porta 3000? Teste no navegador do celular: `http://SEU_IP:3000/v1/health` — deve retornar `{"status":"ok",...}`.
- **API 401 / não loga:** a API está no ar? O usuário que você está usando existe no banco (seed)?
- **Alterou o .env e não refletiu:** pare o Metro (Ctrl+C) e rode de novo `pnpm dev:mobile` (variáveis `EXPO_PUBLIC_*` são embutidas no build na inicialização).
