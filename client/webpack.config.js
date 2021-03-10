import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import HtmlWebpackPlugin from "html-webpack-plugin"
import MiniCssExtractPlugin from 'mini-css-extract-plugin'

import webpack from 'webpack'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let reactDomAlias = { "react-dom": "@hot-loader/react-dom" }

const initialEntryPoints = ["webpack-hot-middleware/client?reload=true"]

export default {
  entry: [...initialEntryPoints, path.join(__dirname, "./src/main.js")],
  output: {
    filename: 'bundle.js',
    path: path.join(__dirname, 'public'),
    publicPath: '/dist/'
  },
  mode: 'development',
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new HtmlWebpackPlugin({
      title: "React Map",
      template: path.join(__dirname, "public/index.template.html"),
    })
  ],
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
            plugins: ['@babel/plugin-syntax-jsx', '@babel/plugin-transform-runtime', '@babel/plugin-transform-regenerator']
          }
        }
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          "style-loader",
          "css-loader",
          "sass-loader",
        ]
      },
      {
        test: /\.jsx?$/,
        enforce: 'pre',
        use: ['source-map-loader'],
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        loader: 'file-loader',
      }
    ]
  },
  resolve: {
    mainFields: ['browser','main','module'],
    alias: {
      ...reactDomAlias,
      "@Components": path.resolve(__dirname, "src/components/"),
      "@Providers": path.resolve(__dirname, "src/providers/"),
    },
    extensions: ["*", ".js", ".jsx", ".scss"],
  },
  devServer: {
    contentBase: path.join(__dirname, "public/"),
    historyApiFallback: true,
    port: 3000,
    hotOnly: true,
    publicPath: "http://localhost:3000/",
    proxy: [
      {
        context: ["/auth", "/api"],
        target: "http://localhost:4000",
      }
    ]
  }
}