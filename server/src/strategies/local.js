/* eslint-disable no-console */
const passport = require('passport')
const Strategy = require('passport-local')
const bcrypt = require('bcrypt')
const path = require('path')

// if writing a custom strategy, rename 'local' below to your strategy name
// this will automatically grab all of its unique values in the config
const { local: strategyConfig, discord, alwaysEnabledPerms } = require('../services/config')
const { User } = require('../models/index')
const Utility = require('../services/Utility')

const authHandler = async (req, username, password, done) => {
  const user = {
    perms: {
      ...Object.fromEntries(
        Object.keys(discord.perms)
          .map(x => [x, strategyConfig.perms.includes(x) || alwaysEnabledPerms.includes(x)]),
      ),
      areaRestrictions: Utility.areaPerms(strategyConfig.perms, 'local'),
      webhooks: [],
    },
  }

  try {
    await User.query()
      .findOne({ username })
      .then(async (userExists) => {
        if (!userExists) {
          try {
            const newUser = await User.query()
              .insertAndFetch({
                username,
                password: await bcrypt.hash(password, 10),
                strategy: 'local',
              })
            user.id = newUser.id
            return done(null, user)
          } catch (e) {
            return done(null, user, { message: 'error_creating_user' })
          }
        }
        if (bcrypt.compareSync(password, userExists.password)) {
          ['discordPerms', 'telegramPerms'].forEach((perms) => {
            if (userExists[perms]) {
              user.perms = Utility.mergePerms(user.perms, JSON.parse(userExists[perms]))
            }
          })
          user.id = userExists.id
          return done(null, user)
        }
        return done(null, false, { message: 'invalid_credentials' })
      })
  } catch (e) {
    console.error('User has failed Local authentication.', e.message)
  }
}

passport.use(path.parse(__filename).name, new Strategy({
  usernameField: 'username',
  passwordField: 'password',
  passReqToCallback: true,
}, authHandler))
