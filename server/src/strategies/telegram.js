/* eslint-disable no-console */
const { TelegramStrategy } = require('passport-telegram-official')
const passport = require('passport')
const { telegram, alwaysEnabledPerms } = require('../services/config')
const { User } = require('../models/index')
const Fetch = require('../services/Fetch')
const Utility = require('../services/Utility')

const authHandler = async (req, profile, done) => {
  const user = {
    ...profile,
    perms: {
      ...Object.fromEntries(Object.keys(telegram.perms).map(x => [x, false])),
      areaRestrictions: [],
      webhooks: [],
    },
  }

  const groupInfo = await Promise.all(telegram.groups.filter(async group => {
    try {
      const response = await Fetch.fetchJson(`https://api.telegram.org/bot${telegram.botToken}/getChatMember?chat_id=${group}&user_id=${user.id}`)
      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.status} ${response.statusText}`)
      }
      const { result } = await response.json()
      return result.status !== 'left' && result.status !== 'kicked'
    } catch (e) {
      console.error(e.message, `Telegram Group: ${group}`, `User: ${user.id} (${user.username})`)
      return null
    }
  }))

  Object.entries(telegram.perms).forEach(([perm, info]) => {
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
        if (!userExists) {
          await User.query()
            .insert({ telegramId: user.id, strategy: user.provider })
          return done(null, user)
        }
        return done(null, user)
      })
  } catch (e) {
    console.error('User has failed Telegram auth.', e)
  }
}

passport.use(new TelegramStrategy({
  botToken: telegram.botToken,
  passReqToCallback: true,
}, authHandler))
