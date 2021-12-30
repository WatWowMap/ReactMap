/* eslint-disable no-console */
const Discord = require('discord.js')
const DiscordStrategy = require('passport-discord').Strategy
const passport = require('passport')
const path = require('path')

// if writing a custom strategy, rename 'discord' below to your strategy name
// this will automatically grab all of its unique values in the config
const { discord: strategyConfig } = require('../services/config')
const { User } = require('../models/index')
const DiscordMapClient = require('../services/DiscordClient')
const logUserAuth = require('../services/logUserAuth')
const Utility = require('../services/Utility')

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
      .findOne(req.user ? { id: req.user.id } : { discordId: user.id })
      .then(async (userExists) => {
        if (req.user) {
          await User.query()
            .update({ discordId: user.id, discordPerms: JSON.stringify(user.perms), webhookStrategy: 'discord' })
            .where('id', req.user.id)
          await User.query()
            .where('discordId', user.id)
            .whereNot('id', req.user.id)
            .delete()
          return done(null, {
            ...user,
            ...req.user,
            discordId: user.id,
            perms: Utility.mergePerms(req.user.perms, user.perms),
          })
        }
        if (!userExists) {
          userExists = await User.query()
            .insertAndFetch({ discordId: user.id, strategy: 'discord' })
        }
        if (userExists.strategy !== 'discord') {
          await User.query()
            .update({ strategy: 'discord' })
            .where('id', userExists.id)
          userExists.strategy = 'discord'
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
