const { authentication } = require('../services/config')
const TelegramClient = require('../services/TelegramClient')

module.exports = (strategy) => {
  const strategyConfig = authentication.strategies.find(
    (s) => s.name === strategy,
  )
  if (strategyConfig) {
    const Client = new TelegramClient(strategyConfig, strategy)
    Client.initPassport()

    return Client
  }
}
