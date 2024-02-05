// @ts-check
const { default: fetch } = require('node-fetch')
const { TelegramStrategy } = require('@rainb0w-clwn/passport-telegram-official')
const passport = require('passport')
const config = require('@rm/config')

const { log, HELPERS } = require('@rm/logger')
const { Db } = require('./initialization')
const areaPerms = require('./functions/areaPerms')
const webhookPerms = require('./functions/webhookPerms')
const scannerPerms = require('./functions/scannerPerms')
const mergePerms = require('./functions/mergePerms')

/**
 * @typedef {import('@rainb0w-clwn/passport-telegram-official/dist/types').PassportTelegramUser} TGUser
 */
class TelegramClient {
  /**
   *
   * @param {import("@rm/types").Config['authentication']['strategies'][number]} strategy
   * @param {string} rmStrategy
   */
  constructor(strategy, rmStrategy) {
    this.strategy = strategy
    this.rmStrategy = rmStrategy
    this.perms = config.getSafe('authentication.perms')
    this.alwaysEnabledPerms = config.getSafe(
      'authentication.alwaysEnabledPerms',
    )
    this.loggingChannels = {
      main: strategy.logGroupId,
      event: strategy.eventLogGroupId,
      scanNext: strategy.scanNextLogGroupId,
      scanZone: strategy.scanZoneLogGroupId,
    }
  }

  /** @param {TGUser} user */
  async getUserGroups(user) {
    if (!user || !user.id) return []

    const groups = [user.id]
    await Promise.all(
      this.strategy.groups.map(async (group) => {
        try {
          const response = await fetch(
            `https://api.telegram.org/bot${this.strategy.botToken}/getChatMember?chat_id=${group}&user_id=${user.id}`,
          )
          if (!response) {
            throw new Error(
              'Unable to query TG API or User is not in the group',
            )
          }
          if (!response.ok) {
            throw new Error(
              `Telegram API error: ${response.status} ${response.statusText}`,
            )
          }
          const json = await response.json()
          if (
            json.result.status !== 'left' &&
            json.result.status !== 'kicked'
          ) {
            groups.push(group)
          }
        } catch (e) {
          log.error(
            HELPERS.custom(this.rmStrategy, '#26A8EA'),
            e,
            `Telegram Group: ${group}`,
            `User: ${user.id} (${user.username})`,
          )
          return null
        }
      }),
    )
    return groups
  }

  /**
   *
   * @param {TGUser} user
   * @param {string[]} groups
   * @returns {TGUser & { perms: import("@rm/types").Permissions }}
   */
  getUserPerms(user, groups) {
    const date = new Date()
    const trialActive =
      this.strategy.trialPeriod &&
      date >= this.strategy.trialPeriod.start.js &&
      date <= this.strategy.trialPeriod.end.js

    /** @type { TGUser & { perms: import("@rm/types").Permissions }} */
    const newUserObj = {
      ...user,
      // @ts-ignore
      perms: {
        ...Object.fromEntries(
          Object.entries(this.perms).map(([perm, info]) => [
            perm,
            info.enabled &&
              (this.alwaysEnabledPerms.includes(perm) ||
                info.roles.some((role) => groups.includes(role)) ||
                (trialActive &&
                  info.trialPeriodEligible &&
                  this.strategy.trialPeriod.roles.some((role) =>
                    groups.includes(role),
                  ))),
          ]),
        ),
        admin: false,
        areaRestrictions: areaPerms(groups),
        webhooks: webhookPerms(groups, 'telegramGroups', trialActive),
        scanner: scannerPerms(groups, 'telegramGroups', trialActive),
      },
    }
    if (this.strategy.allowedUsers?.includes(newUserObj.id)) {
      newUserObj.perms.admin = true
    }
    return newUserObj
  }

  /** @type {import('@rainb0w-clwn/passport-telegram-official/dist/types').CallbackWithRequest} */
  async authHandler(req, profile, done) {
    const baseUser = { ...profile, rmStrategy: this.rmStrategy }
    const groups = await this.getUserGroups(baseUser)
    const user = this.getUserPerms(baseUser, groups)

    if (!user.perms.map) {
      log.warn(
        HELPERS.custom(this.rmStrategy, '#26A8EA'),
        user.username,
        'was not given map perms',
      )
      return done(null, false, { message: 'access_denied' })
    }
    try {
      await Db.models.User.query()
        .findOne({ telegramId: user.id })
        .then(
          async (/** @type {import('@rm/types').FullUser} */ userExists) => {
            if (req.user && userExists?.strategy === 'local') {
              await Db.models.User.query()
                .update({
                  telegramId: user.id,
                  telegramPerms: JSON.stringify(user.perms),
                  webhookStrategy: 'telegram',
                })
                .where('id', req.user.id)
              await Db.models.User.query()
                .where('telegramId', user.id)
                .whereNot('id', req.user.id)
                .delete()
              log.info(
                HELPERS.custom(this.rmStrategy, '#26A8EA'),
                user.username,
                `(${user.id})`,
                'Authenticated successfully.',
              )
              return done(null, {
                ...user,
                ...req.user,
                username: userExists.username || user.username,
                telegramId: user.id,
                perms: mergePerms(req.user.perms, user.perms),
              })
            }
            if (!userExists) {
              userExists = await Db.models.User.query().insertAndFetch({
                telegramId: user.id,
                strategy: user.provider,
                tutorial: !config.getSafe('map.misc.forceTutorial'),
              })
            }
            if (userExists.strategy !== 'telegram') {
              await Db.models.User.query()
                .update({ strategy: 'telegram' })
                .where('id', userExists.id)
              userExists.strategy = 'telegram'
            }
            log.info(
              HELPERS.custom(this.rmStrategy, '#26A8EA'),
              user.username,
              `(${user.id})`,
              'Authenticated successfully.',
            )
            return done(null, {
              ...user,
              ...userExists,
              username: userExists.username || user.username,
            })
          },
        )
    } catch (e) {
      log.error(
        HELPERS.custom(this.rmStrategy, '#26A8EA'),
        'User has failed auth.',
        e,
      )
    }
  }

  /**
   *
   * @param {string} text
   * @param {keyof TelegramClient['loggingChannels']} channel
   */
  async sendMessage(text, channel = 'main') {
    if (!this.loggingChannels[channel]) return
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.strategy.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.loggingChannels[channel],
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            text,
          }),
        },
      )
      if (!response.ok) {
        throw new Error(
          `Telegram API error: ${response.status} ${response.statusText}`,
        )
      }
      log.info(
        HELPERS.custom(this.rmStrategy, '#26A8EA'),
        `${channel} Log Sent`,
      )
    } catch (e) {
      log.error(
        HELPERS.custom(this.rmStrategy, '#26A8EA'),
        `Error sending ${channel} Log`,
        e,
      )
    }
  }

  initPassport() {
    passport.use(
      this.rmStrategy,
      new TelegramStrategy(
        {
          botToken: this.strategy.botToken,
          passReqToCallback: true,
        },
        (req, profile, done) => this.authHandler(req, profile, done),
      ),
    )
  }
}

module.exports = TelegramClient
