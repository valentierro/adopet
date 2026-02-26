# Manutenção e troubleshooting

Guia para tarefas comuns e resolução de problemas.

## Tarefas comuns

### Rodar migrations em produção

```bash
# Com DATABASE_URL apontando para o banco de produção
cd apps/api
pnpm exec prisma migrate deploy
```

### Limpar cache do mobile

```bash
cd apps/mobile
pnpm reset-cache
# ou
expo start --clear
```

### Resetar banco (desenvolvimento)

```bash
cd apps/api
pnpm prisma migrate reset
# Aplica migrations do zero e roda o seed
```

### Criar nova migration

Depois de alterar `prisma/schema.prisma`:

```bash
./scripts/migrate-new.sh "descricao_da_mudanca"
```

### Atualizar versão do app

1. `apps/mobile/app.config.js` — `version`, `versionCode` (Android)
2. `apps/mobile/package.json` — `version`
3. `apps/api/app-version.json` — `latestVersion`, `minSupportedVersion`

## Problemas comuns

### "getDevServer is not a function" (Expo Go)

O patch do `postinstall` pode não ter sido aplicado. Rode:

```bash
cd apps/mobile
node scripts/patch-expo-router-getDevServer.js
```

Ou use o **simulador** em vez do Expo Go no celular.

### API retorna 401

- Token expirado: o client tenta refresh automaticamente
- Se persistir: usuário precisa fazer login de novo
- Verifique se `JWT_SECRET` é o mesmo na API e em qualquer outro serviço

### App não conecta na API no celular

- **Expo Go:** use o IP da sua máquina, não `localhost`
- Exemplo: `EXPO_PUBLIC_API_URL=http://192.168.1.10:3000/v1`
- Celular e computador devem estar na mesma rede

### Banco "Can't reach database server"

- Docker: `./scripts/infra-up.sh` e aguarde o Postgres subir
- Neon: verifique a connection string e se o IP está liberado (Neon permite todos por padrão)

### Crash no iOS ao fazer logout

Versão 1.1.1+ corrige: tokens e cache são limpos com try/catch; state é limpo antes de chamadas assíncronas.

### Build EAS falha

- Verifique variáveis no EAS (`eas secret:list`)
- Confirme que `eas.json` está correto
- Veja os logs no [expo.dev](https://expo.dev)
