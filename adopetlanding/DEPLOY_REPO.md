# Enviar este projeto para o repositório adopetlanding

Este diretório é uma cópia standalone da landing. Para publicar no [github.com/valentierro/adopetlanding](https://github.com/valentierro/adopetlanding):

## Opção 1: Este diretório vira o repositório (a partir do projeto adopet)

```bash
cd adopetlanding
git init
git add .
git commit -m "Initial commit: landing Adopet"
git remote add origin https://github.com/valentierro/adopetlanding.git
git branch -M main
git push -u origin main
```

Depois, se quiser que o diretório `adopetlanding` não seja commitado no repo principal **adopet**, adicione ao `.gitignore` do adopet a linha: `adopetlanding/`.

## Opção 2: Copiar para um clone do adopetlanding

1. Clone o repositório vazio:
   ```bash
   git clone https://github.com/valentierro/adopetlanding.git adopetlanding-repo
   cd adopetlanding-repo
   ```

2. Copie todo o conteúdo de `adopetlanding/` (deste projeto) para dentro de `adopetlanding-repo/` (substituindo qualquer arquivo existente). No macOS/Linux, a partir da raiz do projeto adopet:
   ```bash
   cp -R adopetlanding/* adopetlanding-repo/
   ```

3. No clone:
   ```bash
   cd adopetlanding-repo
   pnpm install
   git add .
   git commit -m "Initial commit: landing Adopet"
   git push -u origin main
   ```

Depois é só conectar o repo na Vercel e fazer o deploy.
