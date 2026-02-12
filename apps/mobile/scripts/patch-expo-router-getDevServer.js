/**
 * Aplica patch no getDevServer do expo-router para Expo Go (SDK 54):
 * quando React Native exporta objeto em vez de função, usamos fallback.
 * Rode após pnpm install (postinstall).
 */
const fs = require('fs');
const path = require('path');

const content = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDevServer = exports.default = void 0;
var rn = require('react-native/Libraries/Core/Devtools/getDevServer');
var g = rn && (rn.default !== undefined ? rn.default : rn.getDevServer || rn);
var fn = typeof g === 'function' ? g : function () { return (g && typeof g === 'object' ? g : { url: 'http://localhost:8081/', fullBundleUrl: null, bundleLoadedFromServer: true }); };
exports.getDevServer = fn;
exports.default = fn;
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

const rnGetDevServerContent = `"use strict";
var NativeModules = require('react-native').NativeModules;
var FALLBACK = 'http://localhost:8081/';
function getDevServer() {
  try {
    var scriptURL = (NativeModules.SourceCode && NativeModules.SourceCode.getConstants && NativeModules.SourceCode.getConstants().scriptURL)
      || (NativeModules.RCTSourceCode && NativeModules.RCTSourceCode.getConstants && NativeModules.RCTSourceCode.getConstants().scriptURL)
      || '';
    var match = scriptURL.match(/^https?:\\/\\/[^/]+/);
    var url = match ? match[0] + '/' : null;
    var inDev = typeof __DEV__ !== 'undefined' && __DEV__;
    var bundleLoadedFromServer = url !== null || inDev;
    return { url: url || FALLBACK, fullBundleUrl: url ? scriptURL : null, bundleLoadedFromServer: bundleLoadedFromServer };
  } catch (e) {
    var inDev = typeof __DEV__ !== 'undefined' && __DEV__;
    return { url: FALLBACK, fullBundleUrl: null, bundleLoadedFromServer: inDev };
  }
}
module.exports = getDevServer;
module.exports.default = getDevServer;
`;

function patchRnGetDevServer(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, rnGetDevServerContent);
      console.log('[patch-expo-router] Applied RN getDevServer:', path.relative(mobileRoot, filePath));
    }
  } catch (e) {
    console.warn('[patch-expo-router] Skip', filePath, e.message);
  }
}

// Patch em node_modules/expo-router (local ou symlink)
const directPath = path.join(nodeModules, 'expo-router', 'build', 'getDevServer', 'index.native.js');
patchFile(directPath);

// Patch em .pnpm (cópias do expo-router@6.x e do react-native getDevServer)
if (fs.existsSync(pnpmStore)) {
  const dirs = fs.readdirSync(pnpmStore);
  for (const d of dirs) {
    if (d.startsWith('expo-router@6')) {
      const target = path.join(pnpmStore, d, 'node_modules', 'expo-router', 'build', 'getDevServer', 'index.native.js');
      patchFile(target);
    }
    if (d.startsWith('react-native@')) {
      const rnGetDevServer = path.join(pnpmStore, d, 'node_modules', 'react-native', 'Libraries', 'Core', 'Devtools', 'getDevServer.js');
      patchRnGetDevServer(rnGetDevServer);
    }
  }
}

// Patch getDevServer do React Native na raiz (se existir)
const rootRnGetDevServer = path.join(mobileRoot, '..', '..', 'node_modules', 'react-native', 'Libraries', 'Core', 'Devtools', 'getDevServer.js');
patchRnGetDevServer(rootRnGetDevServer);
