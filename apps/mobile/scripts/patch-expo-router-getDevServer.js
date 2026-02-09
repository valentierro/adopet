/**
 * Aplica patch no getDevServer do expo-router para Expo Go (SDK 54):
 * quando React Native exporta objeto em vez de função, usamos fallback.
 * Rode após pnpm install (postinstall).
 */
const fs = require('fs');
const path = require('path');

const content = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDevServer = void 0;
var rn = require('react-native/Libraries/Core/Devtools/getDevServer');
var g = rn.default;
exports.getDevServer = typeof g === 'function' ? g : function () { return (g && typeof g === 'object' ? g : { url: 'http://localhost:8081/', fullBundleUrl: null, bundleLoadedFromServer: true }); };
//# sourceMappingURL=index.native.js.map
`;

const mobileRoot = path.resolve(__dirname, '..');
const nodeModules = path.join(mobileRoot, 'node_modules');
const pnpmStore = path.join(mobileRoot, '../..', 'node_modules', '.pnpm');

function patchFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content);
      console.log('[patch-expo-router] Applied:', path.relative(mobileRoot, filePath));
    }
  } catch (e) {
    console.warn('[patch-expo-router] Skip', filePath, e.message);
  }
}

// Patch em node_modules/expo-router (symlink no pnpm)
const directPath = path.join(nodeModules, 'expo-router', 'build', 'getDevServer', 'index.native.js');
patchFile(directPath);

// Patch em .pnpm (todas as cópias do expo-router@6.x)
if (fs.existsSync(pnpmStore)) {
  const dirs = fs.readdirSync(pnpmStore);
  for (const d of dirs) {
    if (d.startsWith('expo-router@6')) {
      const target = path.join(pnpmStore, d, 'node_modules', 'expo-router', 'build', 'getDevServer', 'index.native.js');
      patchFile(target);
    }
  }
}
