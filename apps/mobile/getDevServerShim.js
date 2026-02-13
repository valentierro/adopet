/**
 * Shim para react-native/Libraries/Core/Devtools/getDevServer.
 * No Expo Go (Android/iOS) o módulo pode exportar objeto em vez de função.
 * Em __DEV__ sem scriptURL, retorna bundleLoadedFromServer: true para evitar
 * "Cannot create devtools websocket connections in embedded environments".
 * iOS: scriptURL vem de SourceCode/RCTSourceCode.getConstants().scriptURL.
 */
const { NativeModules } = require('react-native');

const FALLBACK = 'http://localhost:8081/';

function getScriptURL() {
  const SourceCode = NativeModules.SourceCode || NativeModules.RCTSourceCode;
  if (!SourceCode) return '';
  if (typeof SourceCode.getConstants === 'function') {
    const c = SourceCode.getConstants();
    return (c && c.scriptURL) || '';
  }
  return SourceCode.scriptURL || '';
}

function getDevServerConfig() {
  try {
    const scriptURL = getScriptURL();
    const match = scriptURL.match(/^https?:\/\/[^/]+/);
    const url = match ? match[0] + '/' : null;

    const inDev = typeof __DEV__ !== 'undefined' && __DEV__;
    // Em Expo Go (iOS) scriptURL pode estar vazio; marcar false evita DevTools tentarem
    // new WebSocket() e o erro "constructor is not callable" no Hermes.
    const bundleLoadedFromServer = url !== null;

    return {
      url: url ?? FALLBACK,
      fullBundleUrl: url ? scriptURL : null,
      bundleLoadedFromServer,
    };
  } catch {
    return {
      url: FALLBACK,
      fullBundleUrl: null,
      bundleLoadedFromServer: false,
    };
  }
}

// Hermes no iOS exige que o export seja reconhecido como constructor quando
// o código faz new getDevServer(). Usar function com .prototype definido.
function GetDevServer() {
  return getDevServerConfig();
}
GetDevServer.prototype = {};

module.exports = GetDevServer;
module.exports.default = GetDevServer;
module.exports.getDevServer = GetDevServer;
