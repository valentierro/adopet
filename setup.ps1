# Setup do repositório Adopet — Windows
# Execute na raiz do projeto: .\setup.ps1
# Para ambiente cloud (Neon, Vercel, sem Docker): .\setup.ps1 -Cloud

param([switch]$Cloud)

$ErrorActionPreference = "Stop"
$ROOT = $PSScriptRoot
if (-not $ROOT) { $ROOT = Get-Location.Path }
Set-Location $ROOT

$CLOUD_MODE = $Cloud -or ($env:SETUP_CLOUD -eq "1")

Write-Host "=== Adopet Setup ===" -ForegroundColor Cyan
if ($CLOUD_MODE) {
  Write-Host "(modo cloud: Neon, API Vercel — sem Docker)" -ForegroundColor Yellow
}
Write-Host ""

# 1. Node.js >= 18
try {
  $nodeVersion = node -v 2>$null
  if (-not $nodeVersion) { throw "Node não encontrado" }
  $major = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
  if ($major -lt 18) {
    throw "Node.js >= 18 necessário. Atual: $nodeVersion"
  }
  Write-Host "✓ Node.js $nodeVersion" -ForegroundColor Green
} catch {
  Write-Host "Erro: $_" -ForegroundColor Red
  Write-Host "Instale Node.js >= 18 em https://nodejs.org" -ForegroundColor Yellow
  exit 1
}

# 2. Docker (opcional no modo cloud)
if (-not $CLOUD_MODE) {
  try {
    $null = docker info 2>&1
    Write-Host "✓ Docker OK" -ForegroundColor Green
  } catch {
    Write-Host "Erro: Docker não encontrado ou não está rodando." -ForegroundColor Red
    Write-Host "Instale Docker Desktop ou use: .\setup.ps1 -Cloud" -ForegroundColor Yellow
    exit 1
  }
}

# 3. pnpm (via Corepack)
$env:COREPACK_HOME = if ($env:COREPACK_HOME) { $env:COREPACK_HOME } else { Join-Path $ROOT ".cache\corepack" }
corepack enable 2>$null
corepack prepare pnpm@9.0.0 --activate 2>$null
try {
  $pnpmVersion = pnpm -v 2>$null
  if (-not $pnpmVersion) { throw "pnpm não encontrado" }
  Write-Host "✓ pnpm $pnpmVersion" -ForegroundColor Green
} catch {
  Write-Host "Erro: pnpm não encontrado. Rode: corepack enable" -ForegroundColor Red
  exit 1
}

# 4. Instalar dependências
Write-Host ""
Write-Host "Instalando dependências..." -ForegroundColor Cyan
pnpm install

# 5. Build do shared
Write-Host ""
Write-Host "Buildando @adopet/shared..." -ForegroundColor Cyan
pnpm --filter @adopet/shared build

# 6. Arquivos .env
@("api", "mobile", "admin-web") | ForEach-Object {
  $app = $_
  $envFile = "apps\$app\.env"
  $example = "apps\$app\.env.example"
  if ((-not (Test-Path $envFile)) -and (Test-Path $example)) {
    Copy-Item $example $envFile
    Write-Host "✓ Criado $envFile" -ForegroundColor Green
  }
}

# 7-10. Docker + migrations (apenas em modo local)
if (-not $CLOUD_MODE) {
  # 7. DATABASE_URL local na API
  $apiEnv = "apps\api\.env"
  if (Test-Path $apiEnv) {
    $content = Get-Content $apiEnv -Raw
    if ($content -notmatch "postgresql://adopet:adopet@localhost:5432/adopet") {
      $content = $content -replace 'DATABASE_URL=.*', 'DATABASE_URL="postgresql://adopet:adopet@localhost:5432/adopet"'
      $content | Set-Content $apiEnv
      Write-Host "✓ DATABASE_URL configurado para PostgreSQL local" -ForegroundColor Green
    }
  }

  # 8. Subir PostgreSQL
  Write-Host ""
  Write-Host "Subindo PostgreSQL (Docker)..." -ForegroundColor Cyan
  pnpm infra:up

  # 9. Aguardar Postgres
  Write-Host ""
  Write-Host "Aguardando PostgreSQL ficar pronto..." -ForegroundColor Cyan
  $maxAttempts = 30
  $attempt = 0
  $ready = $false
  while ($attempt -lt $maxAttempts) {
    try {
      $null = docker exec adopet-postgres pg_isready -U adopet -d adopet 2>&1
      if ($LASTEXITCODE -eq 0) {
        $ready = $true
        break
      }
    } catch { }
    Start-Sleep -Seconds 1
    $attempt++
  }
  if (-not $ready) {
    Write-Host "Erro: PostgreSQL não ficou pronto em 30s" -ForegroundColor Red
    exit 1
  }
  Write-Host "✓ PostgreSQL pronto" -ForegroundColor Green

  # 10. Migrations e seed
  Write-Host ""
  Write-Host "Aplicando migrations e seed do banco..." -ForegroundColor Cyan
  Push-Location apps\api
  pnpm exec prisma migrate deploy
  pnpm prisma:seed
  Pop-Location
}

Write-Host ""
Write-Host "=== Setup concluído ===" -ForegroundColor Green
Write-Host ""
if ($CLOUD_MODE) {
  Write-Host "Modo cloud: configure os .env com suas credenciais:" -ForegroundColor Yellow
  Write-Host "  - apps\api\.env   -> DATABASE_URL (Neon), JWT_SECRET, etc."
  Write-Host "  - apps\mobile\.env -> EXPO_PUBLIC_API_URL (URL da API na Vercel)"
  Write-Host ""
}
Write-Host "Próximos passos:"
Write-Host "  Mobile: pnpm dev:mobile"
Write-Host "  API:    pnpm dev:api  (se rodar localmente)"
Write-Host "  Ou:     pnpm dev"
Write-Host ""
