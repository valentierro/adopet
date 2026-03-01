# Bump de versão (build para loja)

**Sempre rode antes de fazer build para Play Store ou App Store.**

## Comando único

```bash
./scripts/bump-version.sh <versão> <versionCode>
```

Exemplo para v1.1.6 com versionCode 60:

```bash
./scripts/bump-version.sh 1.1.6 60
```

## Arquivos atualizados automaticamente

| Arquivo | Campos |
|---------|--------|
| `apps/mobile/app.config.js` | `version`, `buildNumber` (iOS), `versionCode` (Android) |
| `apps/mobile/package.json` | `version` |
| `apps/api/app-version.json` | `latestVersion` |
| `apps/mobile/android/app/build.gradle` | `versionCode`, `versionName` |
| `apps/mobile/ios/Adopet/Info.plist` | `CFBundleVersion`, `CFBundleShortVersionString` |

## Regras

- **versionCode** (Android) e **buildNumber** (iOS) devem ser **únicos e crescentes** a cada upload.
- Se errar (ex.: "version code 57 already used"), incremente o versionCode e rode o script novamente.
- A versão exibida no app vem de `app.config.js` → `Constants.expoConfig?.version`.
