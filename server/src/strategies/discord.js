/* eslint-disable no-console */
const Discord = require('discord.js')
const DiscordStrategy = require('passport-discord').Strategy
const passport = require('passport')
const path = require('path')

const { discord: strategyConfig } = require('../services/config')
const { User } = require('../models/index')
const DiscordMapClient = require('../services/DiscordClient')
const logUserAuth = require('../services/logUserAuth')

const client = new Discord.Client()

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`)
  client.user.setPresence({
    activity: {
      name: strategyConfig.presence,
      type: strategyConfig.presenceType,
    },
  })
})

client.login(strategyConfig.botToken)

const MapClient = new DiscordMapClient(client, strategyConfig)

const authHandler = async (req, accessToken, refreshToken, profile, done) => {
  if (!req.query.code) {
    throw new Error('NoCodeProvided')
  }
  try {
    MapClient.setAccessToken(accessToken)
    const user = profile
    user.username = `${profile.username}#${profile.discriminator}`
    user.perms = await MapClient.getPerms(profile)
    user.valid = user.perms.map !== false
    user.blocked = user.perms.blocked

    const embed = await logUserAuth(req, user, 'Discord')
    await MapClient.sendMessage(strategyConfig.logChannelId, { embed })

    if (user) {
      delete user.guilds
    }
    await User.query()
      .findOne({ discordId: user.id })
      .then(async (userExists) => {
        if (!userExists) {
          const newUser = await User.query()
            .insertAndFetch({ discordId: user.id, strategy: 'discord' })
          return done(null, { ...user, ...newUser })
        }
        return done(null, { ...user, ...userExists })
      })
  } catch (e) {
    console.error('User has failed Discord auth.', e)
  }
}

passport.use(path.parse(__filename).name, new DiscordStrategy({
  clientID: strategyConfig.clientId,
  clientSecret: strategyConfig.clientSecret,
  callbackURL: strategyConfig.redirectUri,
  scope: ['identify', 'guilds'],
  passReqToCallback: true,
}, authHandler))
