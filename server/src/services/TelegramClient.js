// @ts-check
const { default: fetch } = require('node-fetch')
const { TelegramStrategy } = require('@rainb0w-clwn/passport-telegram-official')
const passport = require('passport')

const config = require('@rm/config')

const state = require('./state')
const areaPerms = require('./functions/areaPerms')
const webhookPerms = require('./functions/webhookPerms')
const scannerPerms = require('./functions/scannerPerms')
const mergePerms = require('./functions/mergePerms')
const AuthClient = require('./AuthClient')

/**
 * @typedef {import('@rainb0w-clwn/passport-telegram-official/dist/types').PassportTelegramUser} TGUser
 */

class TelegramClient extends AuthClient {
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
          this.log.error(
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
    const trialActive = this.trialManager.active()
    let gainedAccessViaTrial = false

    const perms = Object.fromEntries(
      Object.entries(this.perms).map(([perm, info]) => [
        perm,
        info.enabled &&
          (this.alwaysEnabledPerms.includes(perm) ||
            info.roles.some((role) => {
              if (groups.includes(role)) {
                return true
              }
              if (
                trialActive &&
                info.trialPeriodEligible &&
                this.strategy.trialPeriod.roles.some((trialRole) =>
                  groups.includes(trialRole),
                )
              ) {
                gainedAccessViaTrial = true
                return true
              }
              return false
            })),
      ]),
    )
    /** @type { TGUser & { perms: import("@rm/types").Permissions }} */
    const newUserObj = {
      ...user,
      // @ts-ignore
      perms: {
        ...perms,
        trial: gainedAccessViaTrial,
        admin: false,
        areaRestrictions: areaPerms(groups),
        webhooks: webhookPerms(groups, 'telegramGroups', trialActive),
        scanner: scannerPerms(groups, 'telegramGroups', trialActive),
      },
    }
    if (newUserObj.perms.trial) {
      this.log.info(
        user.username,
        'gained access via',
        this.trialManager._forceActive ? 'manually activated' : '',
        'trial',
      )
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
      this.log.warn(user.username, 'was not given map perms')
      return done(null, false, { message: 'access_denied' })
    }
    try {
      await state.db.models.User.query()
        .findOne({ telegramId: user.id })
        .then(
          async (/** @type {import('@rm/types').FullUser} */ userExists) => {
            const selectedWebhook = Object.keys(state.event.webhookObj).find(
              (x) => user?.perms?.webhooks.includes(x),
            )
            if (req.user && userExists?.strategy === 'local') {
              await state.db.models.User.query()
                .update({
                  telegramId: user.id,
                  telegramPerms: JSON.stringify(user.perms),
                  webhookStrategy: 'telegram',
                })
                .where('id', req.user.id)
              await state.db.models.User.query()
                .where('telegramId', user.id)
                .whereNot('id', req.user.id)
                .delete()
              this.log.info(
                user.username,
                `(${user.id})`,
                'Authenticated successfully.',
              )
              return done(null, {
                selectedWebhook,
                ...user,
                ...req.user,
                username: userExists.username || user.username,
                telegramId: user.id,
                perms: mergePerms(req.user.perms, user.perms),
              })
            }
            if (!userExists) {
              userExists = await state.db.models.User.query().insertAndFetch({
                telegramId: user.id,
                strategy: user.provider,
                tutorial: !config.getSafe('map.misc.forceTutorial'),
                selectedWebhook,
              })
            }
            if (userExists.strategy !== 'telegram') {
              await state.db.models.User.query()
                .update({ strategy: 'telegram' })
                .where('id', userExists.id)
              userExists.strategy = 'telegram'
            }
            if (!userExists.selectedWebhook && selectedWebhook) {
              await state.db.models.User.query()
                .update({ selectedWebhook })
                .where('id', userExists.id)
              userExists.selectedWebhook = selectedWebhook
            }
            this.log.info(
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
      this.log.error('User has failed auth.', e)
    }
  }

  /**
   * Send a message to a Telegram Group
   *
   * @param {import('./AuthClient').MessageEmbed} embed
   * @param {keyof AuthClient['loggingChannels']} channel
   */
  async sendMessage(embed, channel) {
    if (!this.loggingChannels[channel]) return
    const text = AuthClient.getHtml(embed)
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
      this.log.info(`${channel} Log Sent`)
    } catch (e) {
      this.log.error(`Error sending ${channel} Log`, e)
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
