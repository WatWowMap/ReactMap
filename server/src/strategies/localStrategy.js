const LocalStrategy = require('passport-local').Strategy
const passport = require('passport')
const config = require('../services/config')
const { User } = require('../models/index')
const LocalAuthClient = require('../services/localAuth')

passport.serializeUser(async (user, done) => {
  done(null, user)
})

passport.deserializeUser(async (user, done) => {
  if (user.perms.map) {
    done(null, user)
  } else {
    done(null, false)
  }
})

const authHandler = async (username, password, done) => {
  try {
    if (config.localAuth.settings.usernameToLowerCase) username = username.toLowerCase()
    const user = {}
    const validUser = await LocalAuthClient.authenticate(username, password)
    user.id = validUser.authentication ? validUser.userData[config.localAuth.settings.discordIdDbField] : username
    user.email = validUser.authentication ? validUser.userData[config.localAuth.settings.emailDbField] : ''
    user.username = username
    user.perms = validUser.authentication ? await LocalAuthClient.getPerms(validUser.userData) : {}
    user.valid = validUser.authentication && user.perms.map !== false
    user.blocked = user.perms.blocked

    if (user.valid) {
      console.log(user.username, '- Authenticated successfully.')
    } else if (user.blocked) {
      console.warn(user.username, '- Blocked due to', user.blocked)
    } else if (!validUser.authentication) {
      console.warn(user.username, '- Authentication failed:', validUser.message)
    } else {
      console.warn(user.username, '- Not authorized to access map')
    }

    await User.query()
      .findOne({ id: user.id })
      .then(async (userExists) => {
        if (!userExists) {
          await User.query()
              .insert({ id: user.id })
          return done(null, user)
        }
        return done(null, user)
      })
  } catch (e) {
    console.error('User has failed auth.')
  }
}

passport.use(new LocalStrategy({
  usernameField: config.localAuth.settings.usernameField,
  passwordField: config.localAuth.settings.passwordField,
}, authHandler))
