# Android 15/16 e requisitos do Google Play

Este documento descreve ajustes feitos para atender a feedbacks do Play Console (APIs descontinuadas, edge-to-edge, orientação e telas grandes).

## Orientação e telas grandes (Android 16+)

A partir do Android 16, o sistema **ignora** restrições de orientação em dispositivos de tela grande (tablets, dobráveis). Para evitar problemas de layout:

- **Removido** `android:screenOrientation="portrait"` do `AndroidManifest.xml` (MainActivity).
- **app.config.js:** `orientation` alterado de `'portrait'` para `'default'`, permitindo rotação e alinhado à recomendação do Play.

Recomenda-se testar o app em landscape e em tablet/dobrável para garantir que os layouts funcionem bem em vários tamanhos e orientações.

---

## APIs descontinuadas (edge-to-edge, Android 15)

## O que foi feito no projeto

1. **app.config.js**
   - `android.edgeToEdgeEnabled: true` — ativa edge-to-edge no Android.
   - `androidNavigationBar.enforceContrast: true` — mantém contraste na barra de navegação.

2. **android/gradle.properties**
   - Já existia `edgeToEdgeEnabled=true` (compatível com React Native / Expo).

3. **Tema Android para API 35+**
   - Criado `android/app/src/main/res/values-v35/styles.xml` com o mesmo `AppTheme` **sem** `android:statusBarColor`. No Android 15 (API 35+), definir cor da status bar é descontinuado; com edge-to-edge as barras são transparentes.

Com isso, o app deixa de usar essas APIs descontinuadas **no código e no tema próprios** do Adopet.

## De onde vêm o restante dos avisos

O relatório do Play também aponta chamadas vindas de **dependências** (não do nosso código):

- `com.facebook.react.modules.statusbar.StatusBarModule` (React Native)
- `com.swmansion.rnscreens.ScreenWindowTraits` (react-native-screens)
- `expo.modules.imagepicker.ExpoCropImageUtils` (expo-image-picker)
- `com.google.android.material.bottomsheet.BottomSheetDialog` / `EdgeToEdgeUtils` (Material)
- `androidx.activity.EdgeToEdgeApi28` (AndroidX)

Essas bibliotecas ainda usam, internamente, APIs como:

- `Window.getStatusBarColor` / `setStatusBarColor`
- `Window.getNavigationBarColor` / `setNavigationBarColor`
- `LAYOUT_IN_DISPLAY_CUTOUT_MODE_*`

Até que as versões do **Expo**, **React Native**, **react-native-screens** e **expo-image-picker** (e, por sua vez, Material/AndroidX) migrem para as novas APIs (WindowInsets, etc.), o aviso pode continuar aparecendo no Play Console. Isso é esperado e não impede a publicação.

## O que fazer daqui pra frente

- Manter **Expo**, **react-native**, **react-native-screens** e **expo-image-picker** atualizados (por exemplo com `npx expo install --fix` e acompanhando changelogs).
- Ao atualizar o SDK (ex.: para Expo 55+), rodar `npx expo prebuild --clean` se necessário e conferir se as opções de edge-to-edge continuam aplicadas.
- Referências úteis:
  - [Expo – Edge-to-edge no Android](https://expo.dev/blog/edge-to-edge-display-now-streamlined-for-android)
  - [Android 15 – Edge-to-edge](https://developer.android.com/about/versions/15/behavior-changes-15#edge-to-edge)
