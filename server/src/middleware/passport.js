// @ts-check

const passport = require('passport')
const { normalizeAreaRestrictions } = require('../utils/areaPerms')

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
  if (Array.isArray(user?.perms?.areaRestrictions)) {
    user.perms.areaRestrictions = normalizeAreaRestrictions(
      user.perms.areaRestrictions,
    )
  }

  if (user.perms.map) {
    done(null, user)
  } else {
    done('User does not have map permissions', null)
  }
})

module.exports = { initPassport }
