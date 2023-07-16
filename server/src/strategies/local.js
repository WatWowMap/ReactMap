const passport = require('passport')
const Strategy = require('passport-local')
const bcrypt = require('bcrypt')
const path = require('path')

const { name } = path.parse(__filename)

const {
  map: { forceTutorial },
  authentication: { [name]: strategyConfig, alwaysEnabledPerms, perms },
} = require('../services/config')
const { Db } = require('../services/initialization')
const Utility = require('../services/Utility')
const { log, HELPERS } = require('../services/logger')

if (strategyConfig.doNothing) {
  // This is for nothing other than demonstrating a custom property you can add if you need it
}

const authHandler = async (_req, username, password, done) => {
  const date = new Date()
  const trialActive =
    strategyConfig.trialPeriod &&
    date >= strategyConfig.trialPeriod.start.js &&
    date <= strategyConfig.trialPeriod.end.js
  const localPerms = Object.keys(perms).filter((key) =>
    perms[key].roles.includes('local'),
  )
  const user = {
    perms: {
      ...Object.fromEntries(Object.keys(perms).map((x) => [x, false])),
      areaRestrictions: Utility.areaPerms(localPerms, 'local'),
      webhooks: [],
      scanner: [],
    },
    rmStrategy: path.parse(__filename).name,
  }

  try {
    await Db.models.User.query()
      .findOne({ username })
      .then(async (userExists) => {
        if (!userExists) {
          try {
            const newUser = await Db.models.User.query().insertAndFetch({
              username,
              password: await bcrypt.hash(password, 10),
              strategy: 'local',
              tutorial: !forceTutorial,
            })
            user.id = newUser.id
            user.username = newUser.username
            Object.entries(perms).forEach(([perm, info]) => {
              if (info.enabled) {
                if (
                  alwaysEnabledPerms.includes(perm) ||
                  info.roles.includes('local') ||
                  (trialActive &&
                    info.trialPeriodEligible &&
                    strategyConfig.trialPeriod.roles.includes('local'))
                ) {
                  user.perms[perm] = true
                }
              }
            })
            log.info(
              HELPERS.custom(name),
              user.username,
              `(${user.id})`,
              'Authenticated successfully.',
            )
            return done(null, user)
          } catch (e) {
            return done(null, user, { message: 'error_creating_user' })
          }
        }
        if (bcrypt.compareSync(password, userExists.password)) {
          ;['discordPerms', 'telegramPerms'].forEach((permSet) => {
            if (userExists[permSet]) {
              user.perms = Utility.mergePerms(
                user.perms,
                typeof userExists[permSet] === 'string'
                  ? JSON.parse(userExists[permSet])
                  : userExists[permSet],
              )
            }
          })
          if (userExists.strategy !== 'local') {
            await Db.models.User.query()
              .update({ strategy: 'local' })
              .where('id', userExists.id)
            userExists.strategy = 'local'
          }
          user.id = userExists.id
          user.username = userExists.username
          user.status = userExists.data
            ? (typeof userExists.data === 'string'
                ? JSON.parse(userExists.data).status
                : userExists.data.status) || 'local'
            : 'local'
          Object.entries(perms).forEach(([perm, info]) => {
            if (info.enabled) {
              if (
                alwaysEnabledPerms.includes(perm) ||
                info.roles.includes(user.status) ||
                (trialActive &&
                  info.trialPeriodEligible &&
                  strategyConfig.trialPeriod.roles.includes(user.status))
              ) {
                user.perms[perm] = true
              }
            }
          })
          Utility.webhookPerms(
            [user.status],
            'localStatus',
            trialActive,
          ).forEach((x) => user.perms.webhooks.push(x))
          Utility.scannerPerms(
            [user.status],
            'localStatus',
            trialActive,
          ).forEach((x) => user.perms.scanner.push(x))
          log.info(
            HELPERS.custom(name),
            user.username,
            `(${user.id})`,
            'Authenticated successfully.',
          )
          return done(null, user)
        }
        return done(null, false, { message: 'invalid_credentials' })
      })
  } catch (e) {
    log.error(HELPERS.custom(name), 'User has failed authentication.', e)
  }
}

passport.use(
  path.parse(__filename).name,
  new Strategy(
    {
      usernameField: 'username',
      passwordField: 'password',
      passReqToCallback: true,
    },
    authHandler,
  ),
)

module.exports = null
