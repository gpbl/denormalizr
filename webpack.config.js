/* eslint-env node */

var isProduction = process.env.NODE_ENV === 'production';
var filename = `denormalizr${isProduction ? '.min' : ''}.js`;

module.exports = {
  entry: './dist/src/index.js',
  output: {
    path: `${__dirname}/dist`,
    filename: filename,
    library: 'denormalizr',
    libraryTarget: 'umd',
  },
  externals: {
    normalizr: {
      root: 'normalizr',
      commonjs2: 'normalizr',
      commonjs: 'normalizr',
      amd: 'normalizr',
    },
  },
};
