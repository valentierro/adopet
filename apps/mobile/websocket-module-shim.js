/**
 * Shim para react-native/Libraries/WebSocket/WebSocket (Metro resolveRequest).
 * Exporta um construtor callable para evitar "constructor is not callable" no Hermes/Expo Go.
 */
'use strict';

function WebSocketShim(url, protocols) {
  if (!(this instanceof WebSocketShim)) return new WebSocketShim(url, protocols);
  var g = typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : this;
  var WS = g.WebSocket;
  if (typeof WS === 'function') {
    return new WS(url, protocols);
  }
  throw new Error('WebSocket is not available in this environment');
}

module.exports = WebSocketShim;
