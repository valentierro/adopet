// Configuração dinâmica do Expo (fonte única; ex-expo doctor).
// GOOGLE_MAPS_API_KEY = Android. GOOGLE_MAPS_API_KEY_IOS = iOS (opcional; se não existir, usa GOOGLE_MAPS_API_KEY).
const baseExpo = {
  name: 'Adopet',
  slug: 'adopet',
  version: '1.1.13',
  // default = permite rotação (recomendado pelo Play para Android 16+ e telas grandes).
  orientation: 'default',
  icon: './assets/brand/icon/app_icon_light.png',
  userInterfaceStyle: 'automatic',
  scheme: 'adopet',
  splash: {
    image: './assets/brand/splash/splash_full.png',
    resizeMode: 'cover',
    backgroundColor: '#7CB342',
  },
  ios: {
    supportsTablet: true,
    buildNumber: '69',
    bundleIdentifier: 'br.com.adopet.app',
    associatedDomains: ['applinks:appadopet.com.br'],
    infoPlist: { UIBackgroundModes: [] },
    ...((process.env.GOOGLE_MAPS_API_KEY_IOS || process.env.GOOGLE_MAPS_API_KEY) && {
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY_IOS || process.env.GOOGLE_MAPS_API_KEY,
      },
    }),
  },
  android: {
    supportsTablet: true,
    // Edge-to-edge no Android 15+ (reduz uso de APIs descontinuadas: statusBarColor/navigationBarColor).
    edgeToEdgeEnabled: true,
    androidNavigationBar: { enforceContrast: true },
    adaptiveIcon: {
      foregroundImage: './assets/brand/icon/app_icon_light.png',
      backgroundColor: '#FFFFFF',
    },
    package: 'br.com.adopet.app',
    // Último publicado na Play Store: 69. Cada novo upload precisa de versionCode maior.
    versionCode: 69,
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          { scheme: 'https', host: 'appadopet.com.br', pathPrefix: '/pet' },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  plugins: [
    'expo-router',
    'expo-font',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#7CB342',
        image: './assets/brand/splash/splash_full.png',
        resizeMode: 'cover',
        dark: {
          backgroundColor: '#5A8F2E',
          image: './assets/brand/splash/splash_full.png',
          resizeMode: 'cover',
        },
      },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: { router: {}, eas: { projectId: 'b2679852-ff5c-4a6c-b4c4-054cd6446f7b' } },
};

module.exports = {
  expo: {
    ...baseExpo,
    android: {
      ...baseExpo.android,
      softwareKeyboardLayoutMode: 'resize',
      ...(process.env.GOOGLE_MAPS_API_KEY && {
        config: {
          googleMaps: {
            apiKey: process.env.GOOGLE_MAPS_API_KEY,
          },
        },
      }),
    },
  },
};
