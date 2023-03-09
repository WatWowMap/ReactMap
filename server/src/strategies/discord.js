const { authentication } = require('../services/config')
const DiscordClient = require('../services/DiscordClient')

module.exports = (strategy) => {
  const strategyConfig = authentication.strategies.find(
    (s) => s.name === strategy,
  )
  if (strategyConfig) {
    const Client = new DiscordClient(strategyConfig, strategy)
    Client.initPassport()

    return Client
  }
}
