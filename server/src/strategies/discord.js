// @ts-check
const config = require('@rm/config')
const { DiscordClient } = require('../services/DiscordClient')

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
    const Client = new DiscordClient(strategy, strategyConfig)
    Client.initPassport()

    return Client
  }
}
