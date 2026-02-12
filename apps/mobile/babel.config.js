module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [require.resolve('./babel-plugin-getDevServer-shim.js')],
  };
};
