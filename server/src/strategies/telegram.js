const { TelegramStrategy } = require('passport-telegram-official')
const passport = require('passport')
const path = require('path')

const {
  authentication: { [path.parse(__filename).name]: strategyConfig },
} = require('../services/config')
const TelegramClient = require('../services/TelegramClient')

const Client = new TelegramClient(strategyConfig, path.parse(__filename).name)

passport.use(
  path.parse(__filename).name,
  new TelegramStrategy(
    {
      botToken: strategyConfig.botToken,
      passReqToCallback: true,
    },
    Client.authHandler,
  ),
)

module.exports = Client
