/**
 * Entry point que reexporta expo-router/entry.
 * Evita bug do Expo/Metro com paths do pnpm (.pnpm/...@expo+metro...) onde + vira espaço.
 */

// Primeira coisa a rodar: stub de WebSocket para evitar "constructor is not callable" em createWebSocketConnection
// (Expo Go e development build no Android/iOS).
(function () {
  function WebSocketStub() {
    if (!(this instanceof WebSocketStub)) return new WebSocketStub();
    this.readyState = 3;
    this.close = function () {};
    this.send = function () {};
    this.addEventListener = function () {};
    this.removeEventListener = function () {};
  }
  var g = typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : {};
  g.WebSocket = WebSocketStub;
  if (typeof globalThis !== 'undefined') globalThis.WebSocket = WebSocketStub;
  if (typeof global !== 'undefined') global.WebSocket = WebSocketStub;
  if (typeof self !== 'undefined') self.WebSocket = WebSocketStub;
  if (typeof window !== 'undefined') window.WebSocket = WebSocketStub;
})();

module.exports = require('expo-router/entry');
