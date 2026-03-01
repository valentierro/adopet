#!/bin/bash
# Atualiza TODOS os arquivos de versão do app de uma vez.
# Uso: ./scripts/bump-version.sh <version> <versionCode>
# Ex:  ./scripts/bump-version.sh 1.1.6 60
#
# Obrigatório antes de cada build para loja (Play Store / App Store).
# versionCode/buildNumber precisam ser ÚNICOS e CRESCENTES por upload.

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="${1:?Uso: ./scripts/bump-version.sh <version> <versionCode>}"
VERSION_CODE="${2:?Uso: ./scripts/bump-version.sh <version> <versionCode>}"

echo "Bump para versão $VERSION (versionCode/buildNumber $VERSION_CODE)"

SED_INPLACE() {
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' "$@"
  else
    sed -i "$@"
  fi
}

# 1. app.config.js - versão, buildNumber (iOS), versionCode (Android)
APP_CONFIG="$ROOT/apps/mobile/app.config.js"
SED_INPLACE "s/version: '[0-9.]*'/version: '$VERSION'/" "$APP_CONFIG"
SED_INPLACE "s/buildNumber: '[0-9]*'/buildNumber: '$VERSION_CODE'/" "$APP_CONFIG"
SED_INPLACE "s/versionCode: [0-9]*/versionCode: $VERSION_CODE/" "$APP_CONFIG"
SED_INPLACE "s/Último publicado na Play Store: [0-9]*/Último publicado na Play Store: $VERSION_CODE/" "$APP_CONFIG"

# 2. package.json mobile
PACKAGE_JSON="$ROOT/apps/mobile/package.json"
SED_INPLACE "s/\"version\": \"[0-9.]*\"/\"version\": \"$VERSION\"/" "$PACKAGE_JSON"

# 3. app-version.json (API - endpoint de verificação)
APP_VERSION_JSON="$ROOT/apps/api/app-version.json"
SED_INPLACE "s/\"latestVersion\":\"[0-9.]*\"/\"latestVersion\":\"$VERSION\"/" "$APP_VERSION_JSON"

# 4. android/app/build.gradle (native - usado em prebuild/bare)
ANDROID_GRADLE="$ROOT/apps/mobile/android/app/build.gradle"
SED_INPLACE "s/versionCode [0-9]*/versionCode $VERSION_CODE/" "$ANDROID_GRADLE"
SED_INPLACE "s/versionName \"[0-9.]*\"/versionName \"$VERSION\"/" "$ANDROID_GRADLE"

# 5. ios/Adopet/Info.plist (native - usado em prebuild/bare)
IOS_PLIST="$ROOT/apps/mobile/ios/Adopet/Info.plist"
# CFBundleShortVersionString (versão ex: 1.1.5)
SED_INPLACE "/<key>CFBundleShortVersionString<\\/key>/,/<\\/string>/ s/<string>[0-9.]*<\\/string>/<string>$VERSION<\\/string>/" "$IOS_PLIST"
# CFBundleVersion (build number, ex: 61)
SED_INPLACE "/<key>CFBundleVersion<\\/key>/,/<\\/string>/ s/<string>[0-9]*<\\/string>/<string>$VERSION_CODE<\\/string>/" "$IOS_PLIST"

echo "✓ app.config.js"
echo "✓ package.json"
echo "✓ app-version.json"
echo "✓ android/app/build.gradle"
echo "✓ ios/Adopet/Info.plist"
echo ""
echo "Pronto. Rode o build: ./scripts/build-mobile-android.sh ou ./scripts/build-mobile-ios.sh"
