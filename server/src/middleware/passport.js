// @ts-check

const passport = require('passport')

/**
 *
 * @param {import('express').Application} app
 */
function initPassport(app) {
  app.use(passport.initialize())
  app.use(passport.session())
}

passport.serializeUser(async (user, done) => {
  done(null, user)
})

passport.deserializeUser(async (user, done) => {
  if (user.perms.map) {
    done(null, user)
  } else {
    done('User does not have map permissions', null)
  }
})

module.exports = { initPassport }
