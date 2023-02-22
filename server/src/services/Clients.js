/* eslint-disable no-console */
const { resolve } = require('path')
const fs = require('fs')

const config = require('./config')

module.exports = Object.fromEntries(
  config.authentication.strategies
    .filter(({ name, enabled }) => {
      console.log(
        `[AUTH] Strategy ${name} ${enabled ? '' : 'was not '}initialized`,
      )
      return !!enabled
    })
    .map(({ name, type }) => {
      try {
        const buildStrategy = fs.existsSync(
          resolve(__dirname, `../strategies/${name}.js`),
        )
          ? require(resolve(__dirname, `../strategies/${name}.js`))
          : require(resolve(__dirname, `../strategies/${type}.js`))
        return [
          name,
          typeof buildStrategy === 'function'
            ? buildStrategy(name)
            : buildStrategy,
        ]
      } catch (e) {
        console.error(
          `\nFailed to load ${name} to log scanner requests, this likely means that you are using a non-updated custom strategy, please view the newly updated module.exports found at the bottom of the base strategy file:\n /server/src/strategies/${type}.js.\nRelevant Changes: https://github.com/WatWowMap/ReactMap/pull/590/files#diff-394ccb49bcfb0f1a2579a922821e914aeb25904dace1658cd251d70f63c5d529`,
          e.message,
        )
        return [name, null]
      }
    }),
)
