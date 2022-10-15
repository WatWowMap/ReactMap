/* eslint-disable no-console */
const { TelegramStrategy } = require('passport-telegram-official')
const passport = require('passport')
const path = require('path')
const fetch = require('node-fetch')

const {
  map: { forceTutorial },
  authentication: {
    [path.parse(__filename).name]: strategyConfig,
    perms,
    alwaysEnabledPerms,
  },
} = require('../services/config')
const { User } = require('../models/index')
const Utility = require('../services/Utility')

const authHandler = async (req, profile, done) => {
  const user = {
    ...profile,
    perms: {
      ...Object.fromEntries(Object.keys(perms).map((x) => [x, false])),
      areaRestrictions: [],
      webhooks: [],
    },
    rmStrategy: path.parse(__filename).name,
  }

  const chatInfo = [user.id]
  await Promise.all(
    strategyConfig.groups.map(async (group) => {
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${strategyConfig.botToken}/getChatMember?chat_id=${group}&user_id=${user.id}`,
        )
        if (!response) {
          throw new Error('Unable to query TG API or User is not in the group')
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
          chatInfo.push(group)
        }
      } catch (e) {
        console.error(
          e.message,
          `Telegram Group: ${group}`,
          `User: ${user.id} (${user.username})`,
        )
        return null
      }
    }),
  )

  Object.entries(perms).forEach(([perm, info]) => {
    if (
      info.enabled &&
      (alwaysEnabledPerms.includes(perm) ||
        info.roles.some((role) => chatInfo.includes(role)))
    ) {
      user.perms[perm] = true
    }
  })

  user.perms.areaRestrictions = Utility.areaPerms(chatInfo, 'telegram')
  user.perms.webhooks = Utility.webhookPerms(chatInfo, 'telegramGroups')
  user.perms.scanner = Utility.scannerPerms(chatInfo, 'telegramGroups')

  try {
    await User.query()
      .findOne({ telegramId: user.id })
      .then(async (userExists) => {
        if (req.user && userExists?.strategy === 'local') {
          await User.query()
            .update({
              telegramId: user.id,
              telegramPerms: JSON.stringify(user.perms),
              webhookStrategy: 'telegram',
            })
            .where('id', req.user.id)
          await User.query()
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
          userExists = await User.query().insertAndFetch({
            telegramId: user.id,
            strategy: user.provider,
            tutorial: !forceTutorial,
          })
        }
        if (userExists.strategy !== 'telegram') {
          await User.query()
            .update({ strategy: 'telegram' })
            .where('id', userExists.id)
          userExists.strategy = 'telegram'
        }
        if (userExists.id >= 25000) {
          console.warn(
            '[USER] User ID is higher than 25,000! This may indicate that a Telegram ID was saved as the User ID\nYou should rerun the migrations with "yarn migrate:rollback && yarn migrate:latest"',
          )
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

passport.use(
  path.parse(__filename).name,
  new TelegramStrategy(
    {
      botToken: strategyConfig.botToken,
      passReqToCallback: true,
    },
    authHandler,
  ),
)

module.exports = null
