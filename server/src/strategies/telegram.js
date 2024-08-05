// @ts-check
const config = require('@rm/config')
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
    const Client = new TelegramClient(strategy, strategyConfig)
    Client.initPassport()

    return Client
  }
}
