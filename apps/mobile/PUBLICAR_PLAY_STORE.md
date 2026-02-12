# Publicar o Adopet na Google Play (conta já aprovada)

Sua conta de desenvolvedor foi aprovada. Siga esta ordem para colocar o app na loja.

---

## 1. Criar o app na Play Console

1. Acesse [Google Play Console](https://play.google.com/console).
2. Clique em **Criar app**.
3. Preencha:
   - **Nome do app:** Adopet (ou "Adopet - Adoção de pets")
   - **Idioma padrão:** Português (Brasil)
   - **Tipo:** Aplicativo ou jogo
   - **Categoria:** Estilo de vida ou Comunidade
4. Marque que cumpre as políticas e que é responsável pelo app e confirme.

---

## 2. Política de privacidade

- O app tem tela de Política de Privacidade; ela precisa estar em uma **URL pública**.
- Na Play Console: **Política do app** → **Política de privacidade** → informe a URL (ex.: da landing do Adopet ou página estática na Vercel/GitHub Pages).
- Exemplo: se tiver site `https://adopet.com.br`, use `https://adopet.com.br/privacidade`.

---

## 3. Ficha da loja (Store listing)

No menu do app: **Presença na loja** → **Ficha da loja principal**.

### Textos

| Campo | Conteúdo (copie e cole) |
|-------|-------------------------|
| **Nome do app** (até 30 caracteres) | Adopet - Adoção de pets |
| **Descrição curta** (até 80 caracteres) | Encontre seu pet ideal. Adote com responsabilidade e apoie parceiros que cuidam de animais. |
| **Descrição completa** (até 4000 caracteres) | Use o bloco da seção 4.4 do arquivo `PASSO_A_PASSO_PUBLICACAO.md` (ou o texto completo abaixo neste arquivo). |
| **O que há de novo** (notas da versão) | Primeira versão do Adopet: feed de adoção, mapa, favoritos, chat com tutores, parceiros e cupons. Adote com responsabilidade. |

**Descrição completa (para colar):**

```
Adopet conecta quem quer adotar um pet com tutores e instituições que buscam um lar responsável. Tudo em um app pensado para adoção consciente.

O QUE VOCÊ ENCONTRA NO ADOPET

• Feed de pets disponíveis para adoção — cães e gatos de todo o Brasil
• Perfis completos dos animais: fotos, história, temperamento e necessidades
• Mapa para ver pets próximos a você
• Favoritos e buscas salvas para não perder aquele que combinou com você
• Conversa direta com o tutor ou instituição para combinar a adoção
• Selo de anúncio verificado para mais segurança
• Parceiros Adopet: clínicas, pet shops e ONGs com cupons e informações para você e seu novo amigo

PARA QUEM QUER COLOCAR UM PET PARA ADOÇÃO

• Anúncio simples e organizado com fotos e descrição
• Controle de adoções e conversas em um só lugar
• Opção de destaque para parceiros (clínicas, lojas e ONGs)

PARCEIROS ADOPET

Clínicas veterinárias, pet shops e ONGs podem fazer parte do Adopet: aparecer na página de parceiros, oferecer cupons de desconto e dar mais visibilidade aos pets em adoção.

Baixe o Adopet e dê o primeiro passo para uma adoção responsável. Seu novo melhor amigo pode estar a um toque de distância.
```

### Imagens (obrigatórias)

| Recurso | Especificação | Onde pegar |
|---------|----------------|------------|
| **Ícone do app** | 512 x 512 px, PNG, sem transparência | `apps/mobile/assets/brand/icon/app_icon_light.png` — redimensione para 512x512 se necessário |
| **Gráfico de destaque (Feature graphic)** | 1024 x 500 px | Crie um banner com logo Adopet + frase (ex.: "Adoção responsável na palma da mão") |
| **Capturas de tela** | Mín. 2 (recomendado 4–8), phone ou 7" tablet | Tire prints do feed, perfil do pet, mapa, parceiros no celular ou emulador |

---

## 4. Conteúdo do app (questionários)

No menu lateral, complete tudo que estiver **pendente**:

- **Classificação de conteúdo** — questionário sobre público, compras no app etc. O Adopet tem compras (assinatura de parceiros); responda conforme as perguntas.
- **Público-alvo e faixa etária** — defina (ex.: maior de 13 anos).
- **Política de privacidade** — mesma URL que você cadastrou.
- **Contato** — e-mail de suporte (ex.: contato@adopet.com.br).
- **Dados de segurança** (Data safety) — declare coleta de dados (email, nome, fotos etc.) conforme o app realmente usa.

---

## 5. Ter o AAB pronto

- Se ainda não tiver o arquivo **.aab** de produção:
  ```bash
  cd apps/mobile
  npx eas-cli build --platform android --profile production
  ```
- Quando o build terminar no [Expo](https://expo.dev), baixe o **.aab** pelo link que aparecer.

---

## 6. Criar a release e enviar para revisão

1. Na Play Console → seu app → no menu, abra **Produção** (ou **Teste interno** se quiser testar antes).
2. Clique em **Criar nova versão**.
3. Em **App bundles**, faça o **upload** do arquivo **.aab** (o que você baixou do EAS).
4. **Nome da versão:** ex. `1.0.0 (2)` (o número entre parênteses pode ser o `versionCode` do app).
5. **Notas da versão:** use o texto "O que há de novo" da seção 3 (em português).
6. Salve e avance até **Revisar e enviar** (ou **Iniciar implantação**).
7. Envie para revisão do Google.

O Google costuma levar de algumas horas a alguns dias para revisar. Você recebe e-mail quando for aprovado ou se pedirem alterações. Depois de aprovado, o app fica disponível na Google Play.

---

## Resumo rápido

| # | Ação |
|---|------|
| 1 | Play Console → Criar app → nome, idioma, tipo, categoria |
| 2 | Cadastrar URL da política de privacidade |
| 3 | Presença na loja → Ficha da loja: textos + ícone 512px + feature graphic 1024x500 + screenshots |
| 4 | Completar questionários (classificação, público, contato, dados de segurança) |
| 5 | Ter o .aab (build EAS production) baixado |
| 6 | Produção → Criar nova versão → upload do .aab → notas da versão → Enviar para revisão |
