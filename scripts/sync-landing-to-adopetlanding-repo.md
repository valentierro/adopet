# Sincronizar landing (pasta adopetlanding) com o repo adopetlanding

O site em produção usa o repositório **https://github.com/valentierro/adopetlanding**.  
A pasta `adopetlanding/` dentro do monorepo tem as alterações (ex.: página de exclusão de conta), mas o push para o repo separado falha por histórico diferente. Use um dos fluxos abaixo.

---

## Opção A: Copiar arquivos e dar push no repo adopetlanding (recomendado)

1. **Clone o repo da landing** (em uma pasta fora do monorepo):
   ```bash
   cd ~/Documents   # ou outro diretório
   git clone https://github.com/valentierro/adopetlanding.git adopetlanding-repo
   cd adopetlanding-repo
   ```

2. **Copie o conteúdo da pasta do monorepo** sobre o clone (substituindo arquivos):
   ```bash
   # Ajuste o caminho se o monorepo estiver em outro lugar
   rsync -av --delete /Users/erickvalentin/Documents/adopet/adopetlanding/ ./ --exclude=.git
   ```
   Se não tiver `rsync`, use o Finder/Explorador: copie tudo de dentro de `adopet/adopetlanding/` (exceto `.git` se existir) para dentro de `adopetlanding-repo/`, substituindo os arquivos.

3. **Commit e push no repo adopetlanding**:
   ```bash
   git add .
   git status
   git commit -m "feat: página para solicitar exclusão da conta (#exclusao-conta)"
   git push origin main
   ```

4. Faça o deploy na Vercel (ou o deploy será automático se já estiver conectado ao repo).

---

## Opção B: Force push do subtree (sobrescreve o histórico do repo adopetlanding)

**Atenção:** isso reescreve o histórico em https://github.com/valentierro/adopetlanding. Só use se não precisar dos commits que já estão lá.

No monorepo (adopet):

```bash
cd /Users/erickvalentin/Documents/adopet
git subtree push --prefix=adopetlanding landing main --force
```

(O remote `landing` já foi adicionado apontando para https://github.com/valentierro/adopetlanding.git.)

---

## URL da página de exclusão

Depois do deploy, a URL para colocar no Google Play é:

**https://[seu-dominio-da-landing]/#exclusao-conta**

Ex.: `https://adopet.com.br/#exclusao-conta` ou a URL que a Vercel der ao projeto adopetlanding.
