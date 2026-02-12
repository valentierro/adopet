// Usado pelo Expo/EAS para injetar GOOGLE_MAPS_API_KEY no build Android.
// Sem essa chave, o mapa (react-native-maps) pode crashar em produção no Android.
// Defina GOOGLE_MAPS_API_KEY nas variáveis de ambiente do EAS (Production) e no Google Cloud.
const base = require('./app.json');

module.exports = {
  ...base,
  expo: {
    ...base.expo,
    android: {
      ...base.expo.android,
      // Redimensiona a janela quando o teclado abre, evitando que cubra campos (login, chat, etc.)
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
