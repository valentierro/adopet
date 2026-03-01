// Configuração dinâmica do Expo (fonte única; ex-expo doctor).
// GOOGLE_MAPS_API_KEY = Android. GOOGLE_MAPS_API_KEY_IOS = iOS (opcional; se não existir, usa GOOGLE_MAPS_API_KEY).
const baseExpo = {
  name: 'Adopet',
  slug: 'adopet',
  version: '1.1.5',
  orientation: 'portrait',
  icon: './assets/brand/icon/app_icon_light.png',
  userInterfaceStyle: 'automatic',
  scheme: 'adopet',
  splash: {
    image: './assets/brand/logo/logo_splash.png',
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF',
  },
  ios: {
    supportsTablet: true,
    buildNumber: '61',
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
    adaptiveIcon: {
      foregroundImage: './assets/brand/icon/app_icon_light.png',
      backgroundColor: '#FFFFFF',
    },
    package: 'br.com.adopet.app',
    // Último publicado na Play Store: 61. Cada novo upload precisa de versionCode maior.
    versionCode: 61,
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
        backgroundColor: '#FFFFFF',
        image: './assets/brand/logo/logo_splash.png',
        resizeMode: 'contain',
        dark: {
          backgroundColor: '#1B4332',
          image: './assets/brand/logo/logo_splash.png',
          resizeMode: 'contain',
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
