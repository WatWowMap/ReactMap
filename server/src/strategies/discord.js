const { Strategy: DiscordStrategy } = require('passport-discord')
const passport = require('passport')

const { authentication } = require('../services/config')
const DiscordClient = require('../services/DiscordClient')

module.exports = (strategy) => {
  const strategyConfig = authentication.strategies.find(
    (s) => s.name === strategy,
  )
  if (strategyConfig) {
    const Client = new DiscordClient(strategyConfig, strategy)

    passport.use(
      strategy,
      new DiscordStrategy(
        {
          clientID: strategyConfig.clientId,
          clientSecret: strategyConfig.clientSecret,
          callbackURL: strategyConfig.redirectUri,
          scope: ['identify', 'guilds'],
          passReqToCallback: true,
        },
        Client.authHandler,
      ),
    )
    return Client
  }
}
