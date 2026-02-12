/**
 * Entry point que reexporta expo-router/entry.
 * Evita bug do Expo/Metro com paths do pnpm (.pnpm/...@expo+metro...) onde + vira espaço.
 */
module.exports = require('expo-router/entry');
