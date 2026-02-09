# Upload de fotos de pets

Para o app aceitar upload de fotos (anunciar pet com fotos, avatar no perfil), a API precisa de um **storage S3-compatible** configurado.

## O que falta

1. **Variáveis de ambiente** no `apps/api/.env`
2. **Storage rodando** (ou conta em um serviço gratuito)

---

## Opção 1: Cloudflare R2 (gratuito, recomendado)

**Tier gratuito:** 10 GB de armazenamento, 1 milhão de operações de escrita, 10 milhões de leitura, **egress zero** (sem cobrança por download).

1. Crie uma conta em [Cloudflare](https://dash.cloudflare.com) (grátis).
2. Vá em **R2 Object Storage** → **Overview** → **Create bucket**. Nome: `adopet`.
3. Em **Manage** (API Tokens) → **Create API token** → permissão **Object Read & Write** para o bucket `adopet`.
4. Copie o **Access Key ID**, **Secret Access Key** e o **endpoint** (algo como `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`).
5. Para o app exibir as fotos, você precisa de URL pública:
   - No bucket, vá em **Settings** → **Public access** → **Allow Access** e anote a URL (ex.: `https://pub-xxxx.r2.dev`) **ou**
   - Use um **Custom Domain** (ex.: `uploads.seudominio.com`).

No `apps/api/.env`:

```env
S3_ENDPOINT="https://<SEU_ACCOUNT_ID>.r2.cloudflarestorage.com"
S3_REGION="auto"
S3_BUCKET="adopet"
S3_ACCESS_KEY="<Access Key ID do R2>"
S3_SECRET_KEY="<Secret Access Key do R2>"
S3_PUBLIC_BASE="https://pub-xxxx.r2.dev"
```

Substitua `<SEU_ACCOUNT_ID>` pelo ID da sua conta (está na URL do dashboard ou na página do token) e `S3_PUBLIC_BASE` pela URL pública do bucket (a que você habilitou em Public access ou o custom domain).

---

## Opção 2: Backblaze B2 (gratuito)

**Tier gratuito:** 10 GB de armazenamento, upload sem custo, 2.500 chamadas de API grátis/dia.

1. Crie conta em [Backblaze B2](https://www.backblaze.com/b2/sign-up.html).
2. Crie um **Bucket** (ex.: `adopet`). Se quiser que as fotos sejam acessíveis publicamente, marque **Public**.
3. Em **App Keys** → **Add a New Application Key**: nome `adopet`, acesso ao bucket `adopet`, **Read and Write**.
4. Anote **keyID**, **applicationKey** e o **endpoint** (ex.: `https://s3.us-west-002.backblazeb2.com` — a região aparece na criação do bucket).

No `apps/api/.env`:

```env
S3_ENDPOINT="https://s3.<SUA-REGIAO>.backblazeb2.com"
S3_REGION="us-west-002"
S3_BUCKET="adopet"
S3_ACCESS_KEY="<keyID>"
S3_SECRET_KEY="<applicationKey>"
S3_PUBLIC_BASE="https://f005.backblazeb2.com/file/adopet"
```

Para `S3_PUBLIC_BASE`: se o bucket for público, o formato típico é `https://f005.backblazeb2.com/file/<nome-do-bucket>`. Confirme na documentação do B2 a URL de download público do seu bucket.

---

## Opção 3: MinIO local (desenvolvimento, sem conta)

### 1. Subir o MinIO

Na raiz do projeto:

```bash
docker compose -f infra/docker-compose.yml --profile with-minio up -d
```

MinIO sobe na porta **9000** (API) e **9001** (console web).

### 2. Criar o bucket

1. Abra http://localhost:9001  
2. Login: **minioadmin** / **minioadmin**  
3. Crie um bucket chamado **adopet**

### 3. Configurar o `.env` da API

Em `apps/api/.env`, adicione:

```env
S3_ENDPOINT="http://localhost:9000"
S3_REGION="us-east-1"
S3_BUCKET="adopet"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_PUBLIC_BASE="http://localhost:9000/adopet"
```

**Se você testar no celular** (Expo Go na mesma rede): o app precisa conseguir acessar as URLs das fotos. Use o IP da sua máquina em vez de `localhost`, por exemplo:

```env
S3_PUBLIC_BASE="http://192.168.1.3:9000/adopet"
```

(Substitua pelo IP que você usa no `EXPO_PUBLIC_API_URL` do mobile.)

### 4. Reiniciar a API

Depois de salvar o `.env`, reinicie o servidor da API para carregar as variáveis.

---

## Opção 4: AWS S3 (produção, pago)

1. Crie um bucket no S3 e um usuário IAM com permissão de `PutObject` (e leitura pública se as fotos forem públicas).
2. No `apps/api/.env`:

```env
S3_BUCKET="seu-bucket"
S3_REGION="sa-east-1"
S3_ACCESS_KEY="AKIA..."
S3_SECRET_KEY="..."
S3_PUBLIC_BASE="https://seu-bucket.s3.sa-east-1.amazonaws.com"
```

Não defina `S3_ENDPOINT` para usar o S3 padrão da AWS.

---

## Resumo

| Serviço        | Custo        | Pré-requisito              |
|----------------|-------------|----------------------------|
| **Cloudflare R2** | Grátis (10 GB) | Conta Cloudflare           |
| **Backblaze B2**  | Grátis (10 GB) | Conta Backblaze            |
| **MinIO local**   | Grátis        | Docker na sua máquina      |
| **AWS S3**        | Pago          | Conta AWS                  |

Em todos os casos: preencher as variáveis S3 no `apps/api/.env` e **reiniciar a API**. Sem isso, o app responde *"Upload de fotos não configurado"* ao enviar fotos.
