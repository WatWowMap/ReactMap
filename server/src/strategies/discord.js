const { Strategy: DiscordStrategy } = require('passport-discord')
const passport = require('passport')
const path = require('path')

const {
  authentication: { [path.parse(__filename).name]: strategyConfig },
} = require('../services/config')
const DiscordClient = require('../services/DiscordClient')

const Client = new DiscordClient(strategyConfig, path.parse(__filename).name)

passport.use(
  path.parse(__filename).name,
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

module.exports = Client
