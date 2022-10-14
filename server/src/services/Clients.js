/* eslint-disable no-console */
const { resolve } = require('path')

const config = require('./config')

module.exports = Object.fromEntries(
  config.authentication.strategies
    .filter(({ name, enabled }) => {
      if (enabled) {
        console.log(`[AUTH] Strategy ${name} initialized`)
      } else {
        console.log(`[AUTH] Strategy ${name} was not initialized`)
      }
      return !!enabled
    })
    .map(({ name }) => {
      try {
        return [name, require(resolve(__dirname, `../strategies/${name}.js`))]
      } catch (e) {
        console.error(
          `\nFailed to load ${name} to log scanner requests, this likely means that you are using a non-updated custom strategy, please view the newly updated module.exports found at the bottom of the base strategy file:\n /server/src/strategies/${name}.js.\n`,
          e.message,
        )
        return [name, null]
      }
    }),
)
