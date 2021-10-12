/* eslint-disable no-console */
const { TelegramStrategy } = require('passport-telegram-official')
const passport = require('passport')
const { telegram, alwaysEnabledPerms } = require('../services/config')
const { User } = require('../models/index')
// const logUserAuth = require('../services/logUserAuth')

const authHandler = async (req, profile, done) => {
  const user = { ...profile, perms: { areaRestrictions: [] } }
  const merged = [...alwaysEnabledPerms, ...telegram.enabledPerms]
  merged.forEach(perm => {
    user.perms[perm] = true
  })
  // const embed = logUserAuth(req, user, 'telegram')

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
