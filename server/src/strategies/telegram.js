const { TelegramStrategy } = require('passport-telegram-official')
const passport = require('passport')

const { authentication } = require('../services/config')
const TelegramClient = require('../services/TelegramClient')

module.exports = (strategy) => {
  const strategyConfig = authentication.strategies.find(
    (s) => s.name === strategy,
  )
  if (strategyConfig) {
    const Client = new TelegramClient(strategyConfig, strategy)

    passport.use(
      strategy,
      new TelegramStrategy(
        {
          botToken: strategyConfig.botToken,
          passReqToCallback: true,
        },
        Client.authHandler,
      ),
    )
    return Client
  }
}
