/* eslint-disable no-console */
const { TelegramStrategy } = require('passport-telegram-official')
const passport = require('passport')
const path = require('path')

// if writing a custom strategy, rename 'telegram' below to your strategy name
// this will automatically grab all of its unique values in the config
const { telegram: strategyConfig, alwaysEnabledPerms } = require('../services/config')
const { User } = require('../models/index')
const Fetch = require('../services/Fetch')
const Utility = require('../services/Utility')

const authHandler = async (req, profile, done) => {
  const user = {
    ...profile,
    perms: {
      ...Object.fromEntries(Object.keys(strategyConfig.perms).map(x => [x, false])),
      areaRestrictions: [],
      webhooks: [],
    },
  }

  const groupInfo = await Promise.all(strategyConfig.groups.filter(async group => {
    try {
      const response = await Fetch.fetchJson(`https://api.telegram.org/bot${strategyConfig.botToken}/getChatMember?chat_id=${group}&user_id=${user.id}`)
      if (!response) {
        throw new Error('Unable to query TG API or User is not in the group')
      }
      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.status} ${response.statusText}`)
      }
      return response.result.status !== 'left' && response.result.status !== 'kicked'
    } catch (e) {
      console.error(e.message, `Telegram Group: ${group}`, `User: ${user.id} (${user.username})`)
      return null
    }
  }))

  Object.entries(strategyConfig.perms).forEach(([perm, info]) => {
    if (info.enabled && (alwaysEnabledPerms.includes(perm)
      || info.roles.some(role => groupInfo.includes(role)))) {
      user.perms[perm] = true
    }
  })

  user.perms.areaRestrictions = Utility.areaPerms(groupInfo, 'telegram')
  user.perms.webhooks = Utility.webhookPerms(groupInfo, 'telegramGroups')

  try {
    await User.query()
      .findOne({ telegramId: user.id })
      .then(async (userExists) => {
        if (req.user) {
          await User.query()
            .update({ telegramId: user.id })
            .where('id', req.user.id)
          return done(null, {
            ...user,
            ...req.user,
            telegramId: user.id,
            perms: Utility.mergePerms(req.user.perms, user.perms),
          })
        }
        if (!userExists) {
          const newUser = await User.query()
            .insertAndFetch({ telegramId: user.id, strategy: user.provider })
          return done(null, { ...user, ...newUser })
        }
        return done(null, { ...user, ...userExists })
      })
  } catch (e) {
    console.error('User has failed Telegram auth.', e)
  }
}

passport.use(path.parse(__filename).name, new TelegramStrategy({
  botToken: strategyConfig.botToken,
  passReqToCallback: true,
}, authHandler))
