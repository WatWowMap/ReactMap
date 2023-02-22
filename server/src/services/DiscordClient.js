/* eslint-disable no-console */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* global BigInt */
const fs = require('fs')
const { resolve } = require('path')
const Discord = require('discord.js')
const { Strategy: DiscordStrategy } = require('passport-discord')
const passport = require('passport')

const { Db } = require('./initialization')
const logUserAuth = require('./logUserAuth')

const {
  authentication,
  scanner,
  webhooks,
  map: { forceTutorial },
} = require('./config')
const Utility = require('./Utility')

module.exports = class DiscordClient {
  constructor(strategy, rmStrategy) {
    if (strategy instanceof Discord.Client || typeof rmStrategy !== 'string') {
      console.error(
        '[DISCORD] You are using an outdated strategy, please update your custom strategy to reflect the newest changes found in `server/src/strategies/discord.js`',
      )
      process.exit(1)
    }
    this.client = new Discord.Client()
    this.strategy = strategy
    this.rmStrategy = rmStrategy
    this.loggingChannels = {
      main: strategy.logChannelId,
      scanNext: strategy.scanNextChannel,
      scanZone: strategy.scanZoneChannel,
    }
    this.perms = authentication.perms
    this.alwaysEnabledPerms = authentication.alwaysEnabledPerms

    this.discordEvents()

    this.client.on('ready', () => {
      console.log(`[DISCORD] Logged in as ${this.client.user.tag}!`)
      this.client.user.setPresence({
        activity: {
          name: this.strategy.presence,
          type: this.strategy.presenceType,
        },
      })
    })

    this.client.login(this.strategy.botToken)
  }

  async getUserRoles(guildId, userId) {
    try {
      const members = await this.client.guilds.cache
        .get(guildId)
        .members.fetch()
      const member = members.get(userId)
      const roles = member.roles.cache
        .filter((x) => BigInt(x.id).toString())
        .keyArray()
      return roles
    } catch (e) {
      console.error(
        '[DISCORD] Failed to get roles in guild',
        guildId,
        'for user',
        userId,
      )
    }
    return []
  }

  discordEvents() {
    this.client.config = this.strategy
    try {
      fs.readdir(resolve(__dirname, 'events'), (err, files) => {
        if (err) console.error('[DISCORD]', err)
        files.forEach((file) => {
          const event = require(resolve(__dirname, 'events', file))
          const eventName = file.split('.')[0]
          this.client.on(eventName, event.bind(null, this.client))
        })
      })
    } catch (e) {
      console.error('[DISCORD] Failed to activate an event', e.message)
    }
  }

  async getPerms(user) {
    const date = new Date()
    const trialActive =
      authentication.trialPeriod.enabled &&
      date >= authentication.trialPeriod.start.js &&
      date <= authentication.trialPeriod.end.js

    const perms = {
      ...Object.fromEntries(Object.keys(this.perms).map((x) => [x, false])),
      areaRestrictions: [],
      webhooks: [],
      scanner: [],
    }
    try {
      const { guildsFull } = user
      const guilds = user.guilds.map((guild) => guild.id)
      if (this.strategy.allowedUsers.includes(user.id)) {
        Object.keys(perms).forEach((key) => (perms[key] = true))
        perms.areaRestrictions = []
        perms.webhooks = webhooks.map((x) => x.name)
        perms.scanner = Object.keys(scanner).filter(
          (x) => x !== 'backendConfig' && x && scanner[x].enabled,
        )
        console.log(
          `[DISCORD] User ${user.username}#${user.discriminator} (${user.id}) in allowed users list, skipping guild and role check.`,
        )
        return perms
      }
      for (let i = 0; i < this.strategy.blockedGuilds.length; i += 1) {
        const guildId = this.strategy.blockedGuilds[i]
        if (guilds.includes(guildId)) {
          perms.blocked = !!guildsFull.find((x) => x.id === guildId)
          return perms
        }
      }
      for (let i = 0; i < this.strategy.allowedGuilds.length; i += 1) {
        const guildId = this.strategy.allowedGuilds[i]
        if (guilds.includes(guildId)) {
          const keys = Object.keys(this.perms)
          const userRoles = await this.getUserRoles(guildId, user.id)
          // Roles & Perms
          for (let j = 0; j < keys.length; j += 1) {
            const key = keys[j]
            const configItem = this.perms[key]
            const permIsPartOfTrial =
              configItem.trialPeriodEligible && trialActive
            if (configItem.enabled) {
              if (authentication.alwaysEnabledPerms.includes(key)) {
                perms[key] = true
              } else {
                for (let k = 0; k < userRoles.length; k += 1) {
                  if (
                    configItem.roles.includes(userRoles[k]) ||
                    (permIsPartOfTrial &&
                      authentication.trialPeriod.roles.includes(userRoles[k]))
                  ) {
                    perms[key] = true
                  }
                }
              }
            }
          }
          perms.areaRestrictions.push(
            ...Utility.areaPerms(userRoles, 'discord', trialActive),
          )
          perms.webhooks.push(
            ...Utility.webhookPerms(userRoles, 'discordRoles', trialActive),
          )
          perms.scanner.push(
            ...Utility.scannerPerms(userRoles, 'discordRoles', trialActive),
          )
        }
      }
      if (perms.areaRestrictions.length) {
        perms.areaRestrictions = [...new Set(perms.areaRestrictions)]
      }
      if (perms.webhooks.length) {
        perms.webhooks = [...new Set(perms.webhooks)]
      }
      if (perms.scanner.length) {
        perms.scanner = [...new Set(perms.scanner)]
      }
    } catch (e) {
      console.warn('[DISCORD] Failed to get perms for user', user.id, e.message)
    }
    return perms
  }

  async sendMessage(message, channel = 'main') {
    const safeChannel =
      this.loggingChannels[channel] ?? this.loggingChannels.main
    if (!safeChannel || typeof message !== 'object') {
      return
    }
    try {
      const foundChannel = await this.client.channels.cache
        .get(safeChannel)
        .fetch()
      if (foundChannel && message) {
        foundChannel.send(message)
      }
    } catch (e) {
      console.error('[DISCORD] Failed to send message to discord', e.message)
    }
  }

  async authHandler(req, _accessToken, _refreshToken, profile, done) {
    if (!req.query.code) {
      throw new Error('NoCodeProvided')
    }
    try {
      const user = {
        ...profile,
        username: `${profile.username}#${profile.discriminator}`,
        perms: await this.getPerms(profile),
        rmStrategy: this.rmStrategy,
      }
      user.valid = user.perms.map !== false

      const embed = await logUserAuth(req, user, 'Discord')
      await this.sendMessage({ embed })

      if (user.perms.blocked) {
        return done(null, false)
      }
      if (user) {
        delete user.guilds
      }

      await Db.models.User.query()
        .findOne(req.user ? { id: req.user.id } : { discordId: user.id })
        .then(async (userExists) => {
          if (req.user && userExists?.strategy === 'local') {
            await Db.models.User.query()
              .update({
                discordId: user.id,
                discordPerms: JSON.stringify(user.perms),
                webhookStrategy: 'discord',
              })
              .where('id', req.user.id)
            await Db.models.User.query()
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
            userExists = await Db.models.User.query().insertAndFetch({
              discordId: user.id,
              strategy: 'discord',
              tutorial: !forceTutorial,
            })
          }
          if (userExists.strategy !== 'discord') {
            await Db.models.User.query()
              .update({ strategy: 'discord' })
              .where('id', userExists.id)
            userExists.strategy = 'discord'
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

  initPassport() {
    passport.use(
      this.rmStrategy,
      new DiscordStrategy(
        {
          clientID: this.strategy.clientId,
          clientSecret: this.strategy.clientSecret,
          callbackURL: this.strategy.redirectUri,
          scope: ['identify', 'guilds'],
          passReqToCallback: true,
        },
        (...args) => this.authHandler(...args),
      ),
    )
  }
}
