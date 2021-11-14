/* eslint-disable no-console */
const DiscordStrategy = require('passport-discord').Strategy
const passport = require('passport')
const config = require('../services/config')
const { User } = require('../models/index')
const DiscordClient = require('../services/discord')
const logUserAuth = require('../services/logUserAuth')

const authHandler = async (req, accessToken, refreshToken, profile, done) => {
  if (!req.query.code) {
    throw new Error('NoCodeProvided')
  }
  try {
    DiscordClient.setAccessToken(accessToken)
    const user = profile
    user.username = `${profile.username}#${profile.discriminator}`
    user.perms = await DiscordClient.getPerms(profile)
    user.valid = user.perms.map !== false
    user.blocked = user.perms.blocked

    const embed = await logUserAuth(req, user, 'Discord')
    await DiscordClient.sendMessage(config.discord.logChannelId, { embed })

    if (user) {
      delete user.guilds
    }
    await User.query()
      .findOne({ discordId: user.id })
      .then(async (userExists) => {
        if (!userExists) {
          await User.query()
            .insert({ discordId: user.id, strategy: 'discord' })
          return done(null, user)
        }
        return done(null, user)
      })
  } catch (e) {
    console.error('User has failed Discord auth.', e)
  }
}

passport.use(new DiscordStrategy({
  clientID: config.discord.clientId,
  clientSecret: config.discord.clientSecret,
  callbackURL: config.discord.redirectUri,
  scope: ['identify', 'guilds'],
  passReqToCallback: true,
}, authHandler))
