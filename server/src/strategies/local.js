/* eslint-disable no-console */
const passport = require('passport')
const Strategy = require('passport-local')
const bcrypt = require('bcrypt')
const path = require('path')

// if writing a custom strategy, rename 'local' below to your strategy name
// this will automatically grab all of its unique values in the config
const {
  map: { forceTutorial },
  authentication: { local: strategyConfig, alwaysEnabledPerms, perms },
} = require('../services/config')
const { User } = require('../models/index')
const Utility = require('../services/Utility')

if (strategyConfig.doNothing) {
  // This is for nothing other than demonstrating how to implement a custom local strategy with the above instructions
}

const authHandler = async (req, username, password, done) => {
  const localPerms = Object.keys(perms).filter(key => perms[key].roles.includes('local'))
  const user = {
    perms: {
      ...Object.fromEntries(
        Object.keys(perms)
          .map(perm => [perm, localPerms.includes(perm) || alwaysEnabledPerms.includes(perm)]),
      ),
      areaRestrictions: Utility.areaPerms(localPerms, 'local'),
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
                tutorial: !forceTutorial,
              })
            user.id = newUser.id
            return done(null, user)
          } catch (e) {
            return done(null, user, { message: 'error_creating_user' })
          }
        }
        if (bcrypt.compareSync(password, userExists.password)) {
          ['discordPerms', 'telegramPerms'].forEach((permSet) => {
            if (userExists[permSet]) {
              user.perms = Utility.mergePerms(user.perms, JSON.parse(userExists[permSet]))
            }
          })
          if (userExists.strategy !== 'local') {
            await User.query()
              .update({ strategy: 'local' })
              .where('id', userExists.id)
            userExists.strategy = 'local'
          }
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
