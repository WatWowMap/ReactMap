/* eslint-disable no-console */
const passport = require('passport')
const Strategy = require('passport-local')
const bcrypt = require('bcrypt')
const path = require('path')

const { local: strategyConfig, discord, alwaysEnabledPerms } = require('../services/config')
const { User } = require('../models/index')
const Utility = require('../services/Utility')

const authHandler = (req, username, password, done) => {
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
    User.query()
      .findOne({ username })
      .then(async (userExists) => {
        if (!userExists) {
          const newUser = await User.query()
            .insertAndFetch({
              username,
              password: await bcrypt.hash(password, 10),
              strategy: 'local',
            })
          user.id = newUser.id
          return done(null, user, { message: 'User created' })
        }
        if (bcrypt.compareSync(password, userExists.password)) {
          user.id = userExists.id
          return done(null, user, { message: 'Logged in successfully' })
        }
        return done(null, false, { message: 'Invalid credentials' })
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
