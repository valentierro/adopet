# Backblaze B2 — configurar upload com o bucket adopet

Seu bucket **adopet** já existe (endpoint `s3.us-east-005.backblazeb2.com`). Siga estes passos para a API aceitar uploads.

## 1. Criar Application Key (credenciais S3)

1. No painel do B2, no menu lateral abra **App Keys**.
2. Clique em **Add a New Application Key**.
3. Nome: `adopet-api` (ou outro).
4. Em **Allow access to Bucket(s)** escolha **All** ou só o bucket **adopet**.
5. Em **Type of Access** marque **Read and Write**.
6. Clique em **Create New Key**.
7. **Copie e guarde** o **keyID** e o **applicationKey** (o applicationKey só aparece uma vez).

## 2. Onde ver a URL (e deixar o bucket acessível)

### Onde a URL aparece no B2

- **Endpoint (S3):** na própria **card do bucket** na lista de buckets — na linha **Endpoint**, algo como `s3.us-east-005.backblazeb2.com`. Essa é a base da API S3.
- **URL base para fotos (S3):** com o endpoint da sua região, a base para as URLs das fotos é:
  ```text
  https://s3.us-east-005.backblazeb2.com/adopet
  ```
  (ou seja: `https://` + endpoint + `/` + nome do bucket). No `.env` isso vai em **S3_PUBLIC_BASE**.

Se a sua região for outra (ex.: `us-west-002`), troque no meio: `https://s3.us-west-002.backblazeb2.com/adopet`.

### Deixar o bucket acessível para leitura

O bucket está **Private**. O app precisa abrir a URL da foto para exibir; para isso funcionar:

- No bucket **adopet** → **Bucket Settings** (ou **Settings** na card do bucket).
- Procure por **Bucket Type** / **Access** e mude de **Private** para **Public** (ou “Allow public read”), para que qualquer um possa **ler** os arquivos pela URL.
- Não é necessário anotar outra URL: use como **S3_PUBLIC_BASE** a base S3 acima (`https://s3.<sua-região>.backblazeb2.com/adopet`).

## 3. Preencher o `.env` da API

Em `apps/api/.env`, adicione (use o **keyID** e o **applicationKey** que você copiou):

```env
S3_ENDPOINT="https://s3.us-east-005.backblazeb2.com"
S3_REGION="us-east-005"
S3_BUCKET="adopet"
S3_ACCESS_KEY="<keyID da Application Key>"
S3_SECRET_KEY="<applicationKey da Application Key>"
S3_PUBLIC_BASE="https://s3.us-east-005.backblazeb2.com/adopet"
```

- Troque `<keyID da Application Key>` e `<applicationKey da Application Key>` pelos valores reais.
- **S3_PUBLIC_BASE:** use a URL base S3 do seu bucket: `https://s3.<região>.backblazeb2.com/adopet`. A região é a mesma do **Endpoint** que aparece na card do bucket (ex.: `us-east-005`).

## 4. Reiniciar a API

Depois de salvar o `.env`, reinicie o servidor da API e teste o upload de fotos no app.

---

**Resumo:** Application Key (Read and Write) → variáveis no `.env` → bucket público para leitura (ou URL pública) em `S3_PUBLIC_BASE` → reiniciar API.
