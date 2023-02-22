/* eslint-disable no-console */
const fetch = require('node-fetch')
const Utility = require('./Utility')
const { Db } = require('./initialization')
const {
  map: { forceTutorial },
  authentication,
} = require('./config')

module.exports = class TelegramClient {
  constructor(strategy, rmStrategy) {
    this.strategy = strategy
    this.rmStrategy = rmStrategy
    this.perms = authentication.perms
    this.alwaysEnabledPerms = authentication.alwaysEnabledPerms
  }

  async getUserGroups(user) {
    if (!user || !user.id) return []

    const groups = [user.id]
    await Promise.all(
      this.strategy.groups.map(async (group) => {
        try {
          const response = await fetch(
            `https://api.telegram.org/bot${this.strategy.botToken}/getChatMember?chat_id=${group}&user_id=${user.id}`,
          ).then(async (res) => res.json())
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
          if (
            response.result.status !== 'left' &&
            response.result.status !== 'kicked'
          ) {
            groups.push(group)
          }
        } catch (e) {
          console.error(
            '[TELEGRAM]',
            e.message,
            `Telegram Group: ${group}`,
            `User: ${user.id} (${user.username})`,
          )
          return null
        }
      }),
    )
    return groups
  }

  getUserPerms(user, groups) {
    const date = new Date()
    const trialActive =
      authentication.trialPeriod.enabled &&
      date >= authentication.trialPeriod.start.js &&
      date <= authentication.trialPeriod.end.js

    const newUserObj = {
      ...user,
      perms: {
        ...Object.fromEntries(
          Object.entries(this.perms).map(([perm, info]) => [
            perm,
            info.enabled &&
              (this.alwaysEnabledPerms.includes(perm) ||
                info.roles.some((role) => groups.includes(role)) ||
                (trialActive && info.trialPeriodEligible)),
          ]),
        ),
        areaRestrictions: Utility.areaPerms(groups, 'telegram', trialActive),
        webhooks: Utility.webhookPerms(groups, 'telegramGroups', trialActive),
        scanner: Utility.scannerPerms(groups, 'telegramGroups', trialActive),
      },
    }
    return newUserObj
  }

  async authHandler(req, profile, done) {
    const baseUser = { ...profile, rmStrategy: this.rmStrategy }
    const groups = await this.getUserGroups(baseUser)
    const user = this.getUserPerms(baseUser, groups)

    try {
      await Db.models.User.query()
        .findOne({ telegramId: user.id })
        .then(async (userExists) => {
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
            console.log(
              '[TELEGRAM]',
              user.username,
              `(${user.id})`,
              'Authenticated successfully.',
            )
            return done(null, {
              ...user,
              ...req.user,
              username: userExists.username || user.username,
              telegramId: user.id,
              perms: Utility.mergePerms(req.user.perms, user.perms),
            })
          }
          if (!userExists) {
            userExists = await Db.models.User.query().insertAndFetch({
              telegramId: user.id,
              strategy: user.provider,
              tutorial: !forceTutorial,
            })
          }
          if (userExists.strategy !== 'telegram') {
            await Db.models.User.query()
              .update({ strategy: 'telegram' })
              .where('id', userExists.id)
            userExists.strategy = 'telegram'
          }
          console.log(
            '[TELEGRAM]',
            user.username,
            `(${user.id})`,
            'Authenticated successfully.',
          )
          return done(null, {
            ...user,
            ...userExists,
            username: userExists.username || user.username,
          })
        })
    } catch (e) {
      console.error('[TELEGRAM] User has failed Telegram auth.', e)
    }
  }
}
