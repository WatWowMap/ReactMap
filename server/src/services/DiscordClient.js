/* eslint-disable no-console */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
const fs = require('fs')
const { resolve } = require('path')
const { Client } = require('discord.js')
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
    if (strategy instanceof Client || typeof rmStrategy !== 'string') {
      console.error(
        '[DISCORD] You are using an outdated strategy, please update your custom strategy to reflect the newest changes found in `server/src/strategies/discord.js`',
      )
      process.exit(1)
    }
    this.client = new Client({
      intents: ['GuildMessages', 'GuildMembers', 'Guilds'],
    })
    this.strategy = {
      thumbnailUrl:
        'https://user-images.githubusercontent.com/58572875/167069223-745a139d-f485-45e3-a25c-93ec4d09779c.png',
      ...strategy,
    }
    this.rmStrategy = rmStrategy
    this.loggingChannels = {
      main: strategy.logChannelId,
      event: strategy.eventLogChannelId,
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
      return member._roles
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
      this.strategy.trialPeriod &&
      date >= this.strategy.trialPeriod.start.js &&
      date <= this.strategy.trialPeriod.end.js

    const perms = Object.fromEntries(
      Object.keys(this.perms).map((x) => [x, false]),
    )
    const areaRestrictions = new Set()
    const webhookPerms = new Set()
    const scannerPerms = new Set()

    try {
      const { guildsFull } = user
      const guilds = user.guilds.map((guild) => guild.id)
      if (this.strategy.allowedUsers.includes(user.id)) {
        Object.keys(this.perms).forEach((key) => (perms[key] = true))
        webhookPerms.add(...webhooks.map((x) => x.name))
        scannerPerms.add(
          ...Object.keys(scanner).filter(
            (x) => x !== 'backendConfig' && x && scanner[x].enabled,
          ),
        )
        console.log(
          `[DISCORD] User ${user.username}#${user.discriminator} (${user.id}) in allowed users list, skipping guild and role check.`,
        )
      } else {
        for (let i = 0; i < this.strategy.blockedGuilds.length; i += 1) {
          const guildId = this.strategy.blockedGuilds[i]
          if (guilds.includes(guildId)) {
            perms.blocked = !!guildsFull.find((x) => x.id === guildId)
            return perms
          }
        }
        await Promise.all(
          this.strategy.allowedGuilds.map(async (guildId) => {
            if (guilds.includes(guildId)) {
              const userRoles = await this.getUserRoles(guildId, user.id)
              Object.entries(this.perms).forEach(([perm, info]) => {
                if (info.enabled) {
                  if (authentication.alwaysEnabledPerms.includes(perm)) {
                    perms[perm] = true
                  } else {
                    for (let j = 0; j < userRoles.length; j += 1) {
                      if (
                        info.roles.includes(userRoles[j]) ||
                        (trialActive &&
                          info.trialPeriodEligible &&
                          this.strategy.trialPeriod.roles.includes(
                            userRoles[j],
                          ))
                      ) {
                        perms[perm] = true
                        return
                      }
                    }
                  }
                }
              })
              areaRestrictions.add(
                ...Utility.areaPerms(userRoles, 'discord', trialActive),
              )
              webhookPerms.add(
                ...Utility.webhookPerms(userRoles, 'discordRoles', trialActive),
              )
              scannerPerms.add(
                ...Utility.scannerPerms(userRoles, 'discordRoles', trialActive),
              )
            }
          }),
        )
      }
    } catch (e) {
      console.warn('[DISCORD] Failed to get perms for user', user.id, e.message)
    }
    perms.areaRestrictions = [...areaRestrictions].filter(
      (x) => typeof x === 'string',
    )
    perms.webhooks = [...webhookPerms].filter((x) => typeof x === 'string')
    perms.scanner = [...scannerPerms].filter((x) => typeof x === 'string')
    return perms
  }

  getBaseEmbed() {
    return {
      author: {
        name: this.rmStrategy,
        icon_url: this.strategy.thumbnailUrl,
      },
      timestamp: new Date(),
    }
  }

  sendMessage(embed, channel = 'main') {
    const safeChannel =
      this.loggingChannels[channel] ?? this.loggingChannels.main
    if (!safeChannel || typeof embed !== 'object') {
      return
    }
    try {
      const foundChannel = this.client.channels.cache.get(safeChannel)
      if (
        foundChannel &&
        foundChannel.isTextBased() &&
        typeof embed === 'object'
      ) {
        foundChannel.send({ embeds: [{ ...this.getBaseEmbed(), ...embed }] })
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
      this.sendMessage(embed)

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
