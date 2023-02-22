/* eslint-disable no-console */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* global BigInt */
const fs = require('fs')
const Discord = require('discord.js')
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
    this.config = strategy
    this.rmStrategy = rmStrategy
    this.loggingChannels = {
      main: strategy.logChannelId,
      scanNext: strategy.scanNextChannel,
      scanZone: strategy.scanZoneChannel,
    }
    this.discordEvents()

    this.client.on('ready', () => {
      console.log(`[DISCORD] Logged in as ${this.client.user.tag}!`)
      this.client.user.setPresence({
        activity: {
          name: this.config.presence,
          type: this.config.presenceType,
        },
      })
    })

    this.client.login(this.config.botToken)
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

  async discordEvents() {
    this.client.config = this.config
    try {
      fs.readdir(`${__dirname}/events/`, (err, files) => {
        if (err) return this.log.error(err)
        files.forEach((file) => {
          const event = require(`${__dirname}/events/${file}`)
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
      ...Object.fromEntries(
        Object.keys(this.config.perms).map((x) => [x, false]),
      ),
      areaRestrictions: [],
      webhooks: [],
      scanner: [],
    }
    try {
      const { guildsFull } = user
      const guilds = user.guilds.map((guild) => guild.id)
      if (this.config.allowedUsers.includes(user.id)) {
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
      for (let i = 0; i < this.config.blockedGuilds.length; i += 1) {
        const guildId = this.config.blockedGuilds[i]
        if (guilds.includes(guildId)) {
          perms.blocked = guildsFull.find((x) => x.id === guildId).name
          return perms
        }
      }
      for (let i = 0; i < this.config.allowedGuilds.length; i += 1) {
        const guildId = this.config.allowedGuilds[i]
        if (guilds.includes(guildId)) {
          const keys = Object.keys(this.config.perms)
          const userRoles = await this.getUserRoles(guildId, user.id)
          // Roles & Perms
          for (let j = 0; j < keys.length; j += 1) {
            const key = keys[j]
            const configItem = this.config.perms[key]
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
      const user = profile
      user.username = `${profile.username}#${profile.discriminator}`
      user.perms = await this.getPerms(profile)
      user.valid = user.perms.map !== false
      user.blocked = user.perms.blocked
      user.rmStrategy = this.rmStrategy

      const embed = await logUserAuth(req, user, 'Discord')
      await this.sendMessage({ embed })

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
}
