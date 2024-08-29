// @ts-check
const config = require('@rm/config')
const { LocalClient } = require('../services/LocalClient')

/**
 *
 * @param {string} strategy
 * @returns
 */
module.exports = (strategy) => {
  const strategyConfig = config
    .getSafe('authentication.strategies')
    .find((s) => s.name === strategy)
  if (strategyConfig) {
    const Client = new LocalClient(strategy, strategyConfig)
    Client.initPassport()

    return Client
  }
}
