// @ts-check
const config = require('config')
const TelegramClient = require('../services/TelegramClient')

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
    const Client = new TelegramClient(strategyConfig, strategy)
    Client.initPassport()

    return Client
  }
}
