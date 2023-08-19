// @ts-check
const fs = require('fs')
const { resolve } = require('path')
const { Client } = require('discord.js')
const { Strategy: DiscordStrategy } = require('passport-discord')
const passport = require('passport')
const config = require('@rm/config')

const { log, HELPERS } = require('@rm/logger')
const { Db } = require('./initialization')
const logUserAuth = require('./logUserAuth')
const areaPerms = require('./functions/areaPerms')
const webhookPerms = require('./functions/webhookPerms')
const scannerPerms = require('./functions/scannerPerms')
const mergePerms = require('./functions/mergePerms')

class DiscordClient {
  /**
   *
   * @param {import("@rm/types").Config['authentication']['strategies'][number]} strategy
   * @param {string} rmStrategy
   */
  constructor(strategy, rmStrategy) {
    if (strategy instanceof Client || typeof rmStrategy !== 'string') {
      log.error(
        HELPERS.custom(this.rmStrategy, '#7289da'),
        'You are using an outdated strategy, please update your custom strategy to reflect the newest changes found in `server/src/strategies/discord.js`',
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
    this.rmStrategy = rmStrategy || 'custom'
    this.loggingChannels = {
      main: strategy.logChannelId,
      event: strategy.eventLogChannelId,
      scanNext: strategy.scanNextLogChannelId,
      scanZone: strategy.scanZoneLogChannelId,
    }
    this.perms = config.getSafe('authentication.perms')
    this.alwaysEnabledPerms = config.getSafe(
      'authentication.alwaysEnabledPerms',
    )

    this.discordEvents()

    this.client.on('ready', () => {
      log.info(
        HELPERS.custom(this.rmStrategy, '#7289da'),
        `Logged in as ${this.client.user.tag}!`,
      )
      this.client.user.setPresence({
        activities: [
          { name: this.strategy.presence, type: this.strategy.presenceType },
        ],
      })
    })

    this.client.login(this.strategy.botToken)
  }

  /** @param {string} guildId @param {string} userId */
  async getUserRoles(guildId, userId) {
    try {
      const members = await this.client.guilds.cache
        .get(guildId)
        .members.fetch()
      const member = members.get(userId)
      return member.roles.cache.map((role) => role.id)
    } catch (e) {
      log.error(
        HELPERS.custom(this.rmStrategy, '#7289da'),
        'Failed to get roles in guild',
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
        if (err) log.error(HELPERS.custom(this.rmStrategy, '#7289da'), err)
        files.forEach((file) => {
          const event = require(resolve(__dirname, 'events', file))
          const eventName = file.split('.')[0]
          this.client.on(eventName, event.bind(null, this.client))
        })
      })
    } catch (e) {
      log.error(
        HELPERS.custom(this.rmStrategy, '#7289da'),
        'Failed to activate an event',
        e,
      )
    }
  }

  /**
   *
   * @param {import('passport-discord').Profile} user
   * @returns {Promise<import("@rm/types").Permissions>}
   */
  async getPerms(user) {
    const date = new Date()
    const trialActive =
      this.strategy.trialPeriod &&
      date >= this.strategy.trialPeriod.start.js &&
      date <= this.strategy.trialPeriod.end.js

    /** @type {import("@rm/types").Permissions} */
    // @ts-ignore
    const perms = Object.fromEntries(
      Object.entries(this.perms).map(([k, v]) => [
        k,
        typeof v === 'boolean' ? false : [],
      ]),
    )

    const permSets = {
      areaRestrictions: new Set(),
      webhooks: new Set(),
      scanner: new Set(),
      blockedGuildNames: new Set(),
    }
    const scanner = config.get('scanner')
    try {
      const guilds = user.guilds.map((guild) => guild.id)
      if (this.strategy.allowedUsers.includes(user.id)) {
        Object.keys(this.perms).forEach((key) => (perms[key] = true))
        config.getSafe('webhooks').forEach((x) => permSets.webhooks.add(x.name))
        Object.keys(scanner).forEach(
          (x) => scanner[x]?.enabled && permSets.scanner.add(x),
        )
        log.info(
          HELPERS.custom(this.rmStrategy, '#7289da'),
          `User ${user.username} (${user.id}) in allowed users list, skipping guild and role check.`,
        )
      } else {
        const guildsFull = user.guilds
        for (let i = 0; i < this.strategy.blockedGuilds.length; i += 1) {
          const guildId = this.strategy.blockedGuilds[i]
          if (guilds.includes(guildId)) {
            perms.blocked = true
            const currentGuildName = guildsFull.find(
              (x) => x.id === guildId,
            ).name
            permSets.blockedGuildNames.add(currentGuildName)
          }
        }
        await Promise.all(
          this.strategy.allowedGuilds.map(async (guildId) => {
            if (guilds.includes(guildId)) {
              const userRoles = await this.getUserRoles(guildId, user.id)
              Object.entries(this.perms).forEach(([perm, info]) => {
                if (info.enabled) {
                  if (this.alwaysEnabledPerms.includes(perm)) {
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
              areaPerms(userRoles).forEach((x) =>
                permSets.areaRestrictions.add(x),
              )
              webhookPerms(userRoles, 'discordRoles', trialActive).forEach(
                (x) => permSets.webhooks.add(x),
              )
              scannerPerms(userRoles, 'discordRoles', trialActive).forEach(
                (x) => permSets.scanner.add(x),
              )
            }
          }),
        )
      }
    } catch (e) {
      log.warn(
        HELPERS.custom(this.rmStrategy, '#7289da'),
        'Failed to get perms for user',
        user.id,
        e,
      )
    }
    Object.entries(permSets).forEach(([key, value]) => {
      perms[key] = [...value]
    })
    log.debug(
      HELPERS.custom(this.rmStrategy, '#7289da'),
      'Perms:',
      JSON.stringify(perms),
    )
    return perms
  }

  getBaseEmbed() {
    return {
      author: {
        name: this.rmStrategy,
        icon_url: this.strategy.thumbnailUrl,
      },
      timestamp: new Date().toISOString(),
    }
  }

  /** @param {import('discord.js').APIEmbed} embed @param {string} channel */
  async sendMessage(embed, channel = 'main') {
    const safeChannel = this.loggingChannels[channel]
    if (!safeChannel || typeof embed !== 'object') {
      return
    }
    try {
      const foundChannel = this.client.channels.cache.get(safeChannel)
      if (
        foundChannel &&
        foundChannel.isTextBased() &&
        !foundChannel.isVoiceBased() &&
        typeof embed === 'object'
      ) {
        await foundChannel.send({
          embeds: [{ ...this.getBaseEmbed(), ...embed }],
        })
      }
    } catch (e) {
      log.error(
        HELPERS.custom(this.rmStrategy, '#7289da'),
        'Failed to send message to discord',
        e,
      )
    }
  }

  /**
   * @param {import('express').Request} req
   * @param {string} _accessToken
   * @param {string} _refreshToken
   * @param {import('passport-discord').Profile} profile
   * @param {(err: Error | null, user?: import("@rm/types").User, info?: { message: string }) => void} done
   */
  /** @type {import("@rm/types").DiscordVerifyFunction} */
  async authHandler(req, _accessToken, _refreshToken, profile, done) {
    if (!req.query.code) {
      throw new Error('NoCodeProvided')
    }
    try {
      const discordUser = {
        id: profile.id,
        username: profile.username,
        avatar: profile.avatar,
        locale: profile.locale,
        perms: await this.getPerms(profile),
        rmStrategy: this.rmStrategy,
        valid: false,
      }
      discordUser.valid = discordUser.perms.map !== false

      const embed = await logUserAuth(req, discordUser, 'Discord')
      await this.sendMessage(embed)

      if (discordUser.perms.blocked) {
        const guildArray = discordUser.perms.blockedGuildNames
        const lastGuild = guildArray.pop()
        const guildString =
          guildArray.length === 1
            ? `${guildArray.join(', ')} & ${lastGuild}`
            : lastGuild
        return done(null, undefined, { blockedGuilds: guildString })
      }
      if (discordUser.perms.map === false) {
        return done(null, undefined, { message: 'access_denied' })
      }
      if (discordUser) {
        delete discordUser.guilds
      }

      /** @type {import('@rm/types').FullUser} */
      const userExists = await Db.models.User.query().findOne(
        req.user ? { id: req.user.id } : { discordId: discordUser.id },
      )
      if (req.user && userExists?.strategy === 'local') {
        await Db.models.User.query()
          .update({
            discordId: discordUser.id,
            discordPerms: JSON.stringify(discordUser.perms),
            webhookStrategy: 'discord',
          })
          .where('id', req.user.id)
        /** @type {import('@rm/types').FullUser} */
        const oldUser = await Db.models.User.query()
          .where('discordId', discordUser.id)
          .whereNot('id', req.user.id)
          .first()
        if (oldUser) {
          await Db.models.Badge.query()
            // @ts-ignore
            .update({ userId: req.user.id })
            .where('userId', oldUser.id)
          await Db.models.User.query()
            .update({ data: oldUser.data })
            .where('id', req.user.id)
            .where('data', null)
        }
        await Db.models.User.query()
          .where('discordId', discordUser.id)
          .whereNot('id', req.user.id)
          .delete()
        return done(null, {
          ...discordUser,
          ...req.user,
          ...userExists,
          username: userExists.username || discordUser.username,
          discordId: discordUser.id,
          perms: mergePerms(req.user.perms, discordUser.perms),
        })
      }
      /** @type {import('@rm/types').FullUser} */
      const newUser = await Db.models.User.query().insertAndFetch({
        discordId: discordUser.id,
        strategy: 'discord',
        tutorial: !config.getSafe('map.misc.forceTutorial'),
      })
      return done(null, {
        ...discordUser,
        ...req.user,
        ...newUser,
        username: userExists.username || discordUser.username,
      })
    } catch (e) {
      log.error(
        HELPERS.custom(this.rmStrategy, '#7289da'),
        'User has failed auth.',
        e,
      )
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
          prompt: this.strategy.clientPrompt,
        },
        (...args) => this.authHandler(...args),
      ),
    )
  }
}

module.exports = DiscordClient
