const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// WebSocket polyfill no início do bundle (Expo Go + Hermes: "constructor is not callable" em createWebSocketConnection)
const websocketPolyfillPath = path.resolve(projectRoot, 'websocket-polyfill.js');
const originalGetPolyfills = config.serializer?.getPolyfills;
config.serializer = config.serializer || {};
config.serializer.getPolyfills = function (platform) {
  const base = originalGetPolyfills ? originalGetPolyfills(platform) : [];
  return [websocketPolyfillPath].concat(Array.isArray(base) ? base : []);
};

// Incluir pastas padrão do Expo e raiz do monorepo (expo doctor).
// Incluir store do pnpm para Metro resolver pacotes symlinkados (ex.: @shopify/flash-list).
const pnpmStore = path.resolve(monorepoRoot, 'node_modules', '.pnpm');
const defaultWatchFolders = config.watchFolders || [projectRoot];
config.watchFolders = [...new Set([...defaultWatchFolders, monorepoRoot, pnpmStore])];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Shim para getDevServer e para WebSocket do RN (evitar "constructor is not callable").
const websocketModuleShimPath = path.resolve(projectRoot, 'websocket-module-shim.js');
const getDevServerShimPath = path.resolve(projectRoot, 'getDevServerShim.js');
const originalResolveRequest = config.resolver.resolveRequest;
const reactNativeMapsWebShim = path.resolve(projectRoot, 'shims/react-native-maps.web.js');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const name = typeof moduleName === 'string' ? moduleName : '';
  // Resolver @expo/metro-runtime no monorepo pnpm (evita "not found" e code 1006)
  if (name === '@expo/metro-runtime' || name.startsWith('@expo/metro-runtime/')) {
    try {
      const resolved = require.resolve(name, { paths: [projectRoot, monorepoRoot] });
      if (resolved) return { filePath: resolved, type: 'sourceFile' };
    } catch (_) {}
  }
  if (platform === 'web' && (name === 'react-native-maps' || name.startsWith('react-native-maps/'))) {
    return { filePath: reactNativeMapsWebShim, type: 'sourceFile' };
  }
  const isGetDevServer =
    name === 'getDevServerShim' ||
    name === 'react-native/Libraries/Core/Devtools/getDevServer' ||
    name === 'react-native/Libraries/Core/Devtools/getDevServer.native' ||
    name.endsWith('getDevServer') ||
    name.includes('Devtools/getDevServer') ||
    name.includes('Libraries/Core/Devtools/getDevServer');
  if (isGetDevServer) {
    return { filePath: getDevServerShimPath, type: 'sourceFile' };
  }
  const isWebSocket =
    name.includes('Libraries/WebSocket') ||
    name === 'react-native/Libraries/WebSocket/WebSocket' ||
    name === 'react-native/Libraries/WebSocket/WebSocket.js';
  if (isWebSocket) {
    return { filePath: websocketModuleShimPath, type: 'sourceFile' };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
