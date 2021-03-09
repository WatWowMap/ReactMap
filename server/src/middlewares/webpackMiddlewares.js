import webpack from "webpack"
import devMiddleware from "webpack-dev-middleware"
import hotMiddleware from "webpack-hot-middleware"
import webpackConfig from "../../../client/webpack.config.js"
const compiler = webpack(webpackConfig)

export default () => {
  return [
    devMiddleware(compiler, {
      publicPath: webpackConfig.output.publicPath,
    }),
    hotMiddleware(compiler),
  ]
}