# Testar o app no iPhone (Xcode / dispositivo local)

Para rodar o Adopet no seu iPhone via Expo/Xcode, siga estes passos no **Mac**.

## 1. Pré-requisitos

- **Xcode** instalado (App Store) e **Command Line Tools**:  
  `xcode-select --install` (se ainda não tiver).
- **CocoaPods**:  
  `sudo gem install cocoapods` ou `brew install cocoapods`.
- **Node** e **pnpm** (ou npm) no monorepo já configurados.
- **iPhone** conectado por cabo USB e com **Modo Desenvolvedor** ativado (Ajustes > Privacidade e segurança).

## 2. Instalar dependências iOS (pods)

No terminal, na **raiz do monorepo** (onde está `package.json` com workspaces):

```bash
cd apps/mobile
cd ios
pod install
cd ..
```

Se der erro em algum script (`find: Operation not permitted` etc.), rode o `pod install` **fora do sandbox** (terminal normal). Se o CocoaPods reclamar do Node, use o mesmo Node que você usa no dia a dia (nvm, fnm, etc.).

## 3. Abrir no Xcode

```bash
cd apps/mobile
open ios/Adopet.xcworkspace
```

**Importante:** abra o **`.xcworkspace`** (não o `.xcodeproj`), para que os Pods entrem no build.

## 4. Configurar assinatura (Signing)

1. No Xcode, no painel esquerdo, clique no projeto **Adopet** (ícone azul).
2. Selecione o target **Adopet**.
3. Aba **Signing & Capabilities**:
   - Marque **Automatically manage signing**.
   - Em **Team**, escolha sua conta Apple (Apple ID ou conta de desenvolvedor).  
     Se não aparecer nenhuma: **Xcode > Settings > Accounts** e adicione seu Apple ID.
   - O **Bundle Identifier** deve ser `br.com.adopet.app`. Se você usar outra conta pessoal, pode criar um App ID compatível ou alterar temporariamente (ex.: `br.com.adopet.app.dev`) para não conflitar com a conta de produção.

## 5. Escolher o dispositivo

No topo do Xcode, no seletor de destino (ao lado do botão Run):

- Escolha seu **iPhone** (nome do aparelho) em vez de um simulador.

Se o iPhone não aparecer:

- Desbloqueie o aparelho e confie no computador se o iPhone pedir.
- No iPhone: **Ajustes > Geral > Gerenciamento de dispositivo** (ou **Perfil e gerenciamento do dispositivo**) e confie no certificado do seu Mac/Apple ID.

## 6. Rodar o app

- Clique em **Run** (▶) no Xcode, ou use **Cmd + R**.

Na primeira vez no dispositivo, pode ser necessário:

- No iPhone: **Ajustes > Geral > VPN e gerenciamento de dispositivo** e autorizar o app “Adopet” para desenvolvimento.

O Xcode vai compilar, instalar no iPhone e abrir o app. O **Metro bundler** (servidor do JavaScript) pode ser iniciado automaticamente pelo Xcode; se não for, veja a seção abaixo.

## 7. Metro (JavaScript) em desenvolvimento

Se o app abrir no iPhone mas ficar em tela de carregamento ou “Could not connect to development server”:

1. No Mac, em **outro terminal**:

   ```bash
   cd apps/mobile
   pnpm dev
   # ou: npx expo start
   ```

2. Deixe esse terminal aberto (Metro rodando).
3. No iPhone, se o app pedir a URL do servidor:
   - Use o **IP do seu Mac** na rede local (ex.: `192.168.1.10`) e a porta **8081** (ex.: `192.168.1.10:8081`).
   - No Expo, você pode sacudir o dispositivo e em “Configure Bundler” informar o IP do Mac.

Para o iPhone e o Mac estarem na mesma rede Wi‑Fi, o Metro costuma ser descoberto automaticamente.

## 8. Alternativa: linha de comando (Expo)

Sem abrir o Xcode, você pode buildar e rodar direto no dispositivo conectado:

```bash
cd apps/mobile
npx expo run:ios --device
```

O comando lista os dispositivos disponíveis; escolha o iPhone. O Expo vai compilar e instalar no aparelho. Mantenha o Metro rodando (`pnpm dev` em outro terminal) para desenvolvimento.

---

## Resumo rápido

1. `cd apps/mobile/ios && pod install && cd ..`
2. `open ios/Adopet.xcworkspace`
3. No Xcode: **Signing & Capabilities** → Team → escolher sua conta.
4. Selecionar o **iPhone** como destino e dar **Run** (▶).
5. Se precisar: em outro terminal, `pnpm dev` em `apps/mobile` para o Metro.

Se aparecer algum erro específico (assinatura, provisioning, pod, etc.), anote a mensagem e o passo em que parou para ajustar o próximo passo.
