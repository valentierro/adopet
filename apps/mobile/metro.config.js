const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Shim para getDevServer: no Expo Go o módulo do RN pode exportar objeto em vez de função.
// Interceptar qualquer resolução do módulo getDevServer do RN (incl. .native).
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isGetDevServer =
    typeof moduleName === 'string' &&
    (moduleName === 'react-native/Libraries/Core/Devtools/getDevServer' ||
      moduleName === 'react-native/Libraries/Core/Devtools/getDevServer.native' ||
      moduleName.includes('Libraries/Core/Devtools/getDevServer'));
  if (isGetDevServer) {
    return {
      filePath: path.resolve(projectRoot, 'getDevServerShim.js'),
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
