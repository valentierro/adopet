/**
 * Substitui qualquer require/import de getDevServer pelo shim.
 * Metro resolve "getDevServerShim" para apps/mobile/getDevServerShim.js.
 */
module.exports = function (babel) {
  const t = babel.types;
  return {
    name: 'getDevServer-shim',
    visitor: {
      CallExpression(callPath) {
        const args = callPath.node.arguments;
        if (args.length === 0) return;
        const first = args[0];
        if (!t.isStringLiteral(first)) return;
        const spec = first.value;
        if (spec.includes('getDevServer') && (spec.includes('Devtools') || spec.includes('react-native'))) {
          first.value = 'getDevServerShim';
        }
      },
      ImportDeclaration(importPath) {
        const source = importPath.node.source?.value || '';
        if (source.includes('getDevServer') && (source.includes('Devtools') || source.includes('react-native'))) {
          importPath.node.source = t.stringLiteral('getDevServerShim');
        }
      },
    },
  };
};
