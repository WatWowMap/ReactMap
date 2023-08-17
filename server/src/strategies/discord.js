// @ts-check
const config = require('config')
const DiscordClient = require('../services/DiscordClient')

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
    const Client = new DiscordClient(strategyConfig, strategy)
    Client.initPassport()

    return Client
  }
}
