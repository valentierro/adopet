/**
 * WebSocket polyfill carregado no início do bundle (Expo Go + Hermes).
 * Só define global.WebSocket quando estiver ausente; o shim usa esse valor ao ser required.
 */
'use strict';

(function () {
  var g = typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : this;
  if (typeof g.WebSocket === 'function') return;
  g.WebSocket = function WebSocketUnavailable() {
    throw new Error('WebSocket is not available in this environment');
  };
})();
