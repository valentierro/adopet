/**
 * Shim para react-native/Libraries/Core/Devtools/getDevServer.
 * No Expo Go (celular) o módulo pode exportar objeto em vez de função.
 * Em __DEV__ sem scriptURL, retorna bundleLoadedFromServer: true para evitar
 * "Cannot create devtools websocket connections in embedded environments".
 */
const { NativeModules } = require('react-native');

const FALLBACK = 'http://localhost:8081/';

function getDevServer() {
  try {
    const scriptURL =
      NativeModules.SourceCode?.scriptURL ?? NativeModules.RCTSourceCode?.scriptURL ?? '';
    const match = scriptURL.match(/^https?:\/\/[^/]+/);
    const url = match ? match[0] + '/' : null;

    // Em __DEV__ (Expo Go etc.), se não detectar URL, assumir bundle do servidor
    // para não lançar "embedded environments" e permitir o app registrar.
    const inDev = typeof __DEV__ !== 'undefined' && __DEV__;
    const bundleLoadedFromServer = url !== null || inDev;

    return {
      url: url ?? FALLBACK,
      fullBundleUrl: url ? scriptURL : null,
      bundleLoadedFromServer,
    };
  } catch {
    const inDev = typeof __DEV__ !== 'undefined' && __DEV__;
    return {
      url: FALLBACK,
      fullBundleUrl: null,
      bundleLoadedFromServer: inDev,
    };
  }
}

// ESM interop: default export as callable function
module.exports = { __esModule: true, default: getDevServer };
