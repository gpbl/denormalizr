/* eslint-env node */

module.exports = {
  entry: './lib/index.js',
  devtool: 'source-map',
  output: {
    path: `${__dirname}/dist`,
    filename: 'denormalizr.min.js',
    library: 'denormalizr',
    libraryTarget: 'umd',
  },
  externals: {
    react: {
      root: 'normalizr',
      commonjs2: 'normalizr',
      commonjs: 'normalizr',
      amd: 'normalizr',
    },
  },
};
