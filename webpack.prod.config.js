const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const webpack = require('webpack');
const packageJson = require('./package.json');

module.exports = {
  entry: "/dist/MediaApp.js",
  mode: 'production',
  output: { path: path.resolve(__dirname, "dist"), filename: "main.js", },
  target: "web",
  module: {
    rules: [
      {
        test: /\.m?js/,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", "@babel/preset-react"],
          },
        },
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'img/',
            },
          },
        ],
      },
    ],
  },
  resolve: {
    fallback: {
      buffer: require.resolve('buffer/'),
      url: require.resolve("url/"),
      assert: require.resolve("assert/"),
    },
  },
  plugins: [
    new webpack.DefinePlugin({
      APP_VERSION: JSON.stringify(packageJson.version)
    }),
  ],
  optimization: {
    minimizer: [
      new TerserPlugin(), // Minify JavaScript
    ],
  },
  experiments: {
    asyncWebAssembly: true,
    syncWebAssembly: true
  },
};