/* eslint-disable no-console */
const Discord = require('discord.js')
const DiscordStrategy = require('passport-discord').Strategy
const passport = require('passport')
const path = require('path')

const {
  map: { forceTutorial },
  authentication: { [path.parse(__filename).name]: strategyConfig, perms },
} = require('../services/config')
const { User } = require('../models/index')
const DiscordMapClient = require('../services/DiscordClient')
const logUserAuth = require('../services/logUserAuth')
const Utility = require('../services/Utility')

const client = new Discord.Client()

client.on('ready', () => {
  console.log(`[DISCORD] Logged in as ${client.user.tag}!`)
  client.user.setPresence({
    activity: {
      name: strategyConfig.presence,
      type: strategyConfig.presenceType,
    },
  })
})

client.login(strategyConfig.botToken)

const MapClient = new DiscordMapClient(
  client,
  { ...strategyConfig, perms },
  strategyConfig.logChannelId,
  strategyConfig.scanNextLogChannelId,
  strategyConfig.scanZoneLogChannelId,
)

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
    user.rmStrategy = path.parse(__filename).name

    const embed = await logUserAuth(req, user, 'Discord')
    await MapClient.sendMessage({ embed })

    if (user) {
      delete user.guilds
    }

    await User.query()
      .findOne(req.user ? { id: req.user.id } : { discordId: user.id })
      .then(async (userExists) => {
        if (req.user && userExists?.strategy === 'local') {
          await User.query()
            .update({
              discordId: user.id,
              discordPerms: JSON.stringify(user.perms),
              webhookStrategy: 'discord',
            })
            .where('id', req.user.id)
          await User.query()
            .where('discordId', user.id)
            .whereNot('id', req.user.id)
            .delete()
          return done(null, {
            ...user,
            ...req.user,
            username: userExists.username || user.username,
            discordId: user.id,
            perms: Utility.mergePerms(req.user.perms, user.perms),
          })
        }
        if (!userExists) {
          userExists = await User.query().insertAndFetch({
            discordId: user.id,
            strategy: 'discord',
            tutorial: !forceTutorial,
          })
        }
        if (userExists.strategy !== 'discord') {
          await User.query()
            .update({ strategy: 'discord' })
            .where('id', userExists.id)
          userExists.strategy = 'discord'
        }
        if (userExists.id >= 25000) {
          console.warn(
            '[USER] User ID is higher than 25,000! This may indicate that a Discord ID was saved as the User ID\nYou should rerun the migrations with "yarn migrate:rollback && yarn migrate:latest"',
          )
        }
        return done(null, {
          ...user,
          ...userExists,
          username: userExists.username || user.username,
        })
      })
  } catch (e) {
    console.error('[AUTH] User has failed Discord auth.', e)
  }
}

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
    authHandler,
  ),
)

module.exports = MapClient
