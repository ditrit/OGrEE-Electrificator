const path = require('path');

module.exports = {
  mode: 'development',
  entry: path.resolve(__dirname, 'src/index.js'),
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: 'electrificatorPlugin.js',
    libraryTarget: 'commonjs',
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, 'src/'),
      'package.json': path.resolve(__dirname, 'package.json'),
    },
    extensions: ['.js'],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
};
