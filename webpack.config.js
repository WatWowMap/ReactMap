const path = require('path');
const chalk = require('chalk');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const emoji = require('node-emoji');
const ProgressBarPlugin = require('progress-bar-webpack-plugin');
const resolve = require('./webpack.config.resolve.js');

module.exports = (env) => {
  const isDevelopment = env.dev;
  return {
    mode: isDevelopment ? 'development' : 'production',
    entry: './src/index.jsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].[contenthash].js',
      publicPath: '/',
    },
    devtool: false,
    devServer: {
      contentBase: path.join(__dirname, 'dist'),
      compress: true,
      port: 3000,
      historyApiFallback: true,
      open: true,
      stats: {
        colors: true,
        hash: false,
        version: false,
        timings: false,
        assets: false,
        chunks: false,
        modules: false,
        reasons: true,
        children: false,
        source: false,
        errors: true,
        errorDetails: true,
        warnings: true,
        publicPath: false,
        verbose: true,
      },
    },
    performance: {
      hints: false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          include: path.resolve(__dirname, 'src'),
          use: ['babel-loader'],
          exclude: /node_modules/,
        },
        {
          test: /\.s?css$/,
          use: [
            { loader: MiniCssExtractPlugin.loader },
            {
              loader: 'css-loader',
              options: {
                importLoaders: 1,
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  plugins: [
                    [
                      'autoprefixer',
                    ],
                  ],
                },
              },
            },
            {
              loader: 'sass-loader',
              options: {
                sassOptions: {
                  includePaths: ['node_modules'],
                },
              },
            },
          ],
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif)$/i,
          type: 'asset/resource',
        },
        {
          test: /\.svg$/,
          use: 'file-loader',
        },
      ],
    },
    resolve,
    plugins: (() => {
      const plugins = [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
          template: './public/index.template.html',
          filename: 'index.html',
          favicon: './public/favicon/favicon.ico',
        }),
        new CopyWebpackPlugin({
          patterns: [{ from: './public/images', to: 'images' }],
        }),
        new MiniCssExtractPlugin({
          filename: isDevelopment ? '[name].css' : '[name]-[contenthash:8].css',
          chunkFilename: isDevelopment ? '[id].css' : '[id].[contenthash:8].css',
        }),
        new ESLintPlugin({
          context: 'src',
          extensions: ['js', 'jsx'],
        }),
        new ProgressBarPlugin({
          format: `Bundling application... ${emoji.get(
            'package',
          )} [${chalk.yellow.bold(':bar')}] ${chalk.yellow.bold(
            ':percent',
          )} (${chalk.blue.bold(':elapsed seconds')})`,
          clear: false,
        }),
      ];
      return plugins;
    })(),
    optimization: {
      runtimeChunk: 'single',
      splitChunks: {
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
      minimize: true,
      minimizer: [
        new CssMinimizerPlugin({
          minimizerOptions: {
            preset: [
              'default',
              {
                discardComments: { removeAll: true },
              },
            ],
          },
        }),
      ],
    },
  };
};
