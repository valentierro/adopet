# Especificação da splash — Adopet

## Fundo transparente (obrigatório)

**A logo precisa ter fundo transparente.** Caso contrário, o fundo escuro (preto) aparece na **tela de loading**, na **splash** ao abrir o app e na **tela de login**.

Os arquivos desta pasta (`splash_light.png` e `splash_dark.png`) são usados em todos esses lugares. Para corrigir o fundo escuro:

1. **Exporte a logo com transparência:**
   - **Figma:** selecione a logo → Export → PNG → desmarque **"Include background"** (ou deixe o frame sem preenchimento antes de exportar).
   - **Photoshop / GIMP:** apague a camada de fundo ou desative-a; salve como **PNG** (o canal alpha será salvo).
   - **Canva / outros:** exporte como PNG e escolha "fundo transparente" se houver opção.

2. **Substitua os arquivos** nesta pasta:
   - `splash_light.png` → mesma logo (coração + "adopet" nas cores da marca), **fundo transparente**.
   - `splash_dark.png` → pode ser o mesmo arquivo (em tema escuro o fundo da tela já é escuro) ou uma versão em branco para contraste; **fundo transparente**.

3. Salve e recarregue o app. A logo do loading, da splash e do login passará a aparecer sem o quadrado preto.

---

Para bater com o design aprovado, os PNGs podem seguir:

## Light Mode (`splash_light.png`)
- **Uso:** fundo da splash é branco (`#FFFFFF`) no app; a imagem fica centralizada.
- **Conteúdo da imagem (fundo transparente):**
  - Coração dividido na diagonal: metade superior-esquerda **vermelho-alaranjado** (#E11D48), metade inferior-direita **verde** (#0D9488).
  - Pata branca centralizada sobre o coração.
  - Texto "adopet" em minúsculas abaixo: "ado" em verde (#0D9488), "pet" em vermelho-alaranjado (#E11D48).
- **Tamanho sugerido:** 1024×1024 px, fundo transparente.

## Dark Mode (`splash_dark.png`)
- **Uso:** fundo da splash é verde escuro (`#1B4332`) no app; a imagem fica centralizada.
- **Conteúdo da imagem (fundo transparente):**
  - Coração sólido branco com pata branca centralizada.
  - Texto "adopet" em minúsculas, todo em branco, abaixo do coração.
- **Tamanho sugerido:** 1024×1024 px, fundo transparente.

Depois de substituir os arquivos, faça um novo build (a splash nativa é gerada no build).
