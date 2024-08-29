// @ts-check
const { Strategy } = require('passport-local')
const passport = require('passport')
const bcrypt = require('bcrypt')

const config = require('@rm/config')

const { areaPerms } = require('../utils/areaPerms')
const { webhookPerms } = require('../utils/webhookPerms')
const { scannerPerms } = require('../utils/scannerPerms')
const { mergePerms } = require('../utils/mergePerms')
const { AuthClient } = require('./AuthClient')
const { state } = require('./state')

class LocalClient extends AuthClient {
  getPerms(trialActive = false) {
    return Object.fromEntries(
      Object.entries(this.perms).map(([perm, info]) => {
        if (info.enabled) {
          if (
            this.alwaysEnabledPerms.includes(perm) ||
            info.roles.includes('local') ||
            (trialActive &&
              info.trialPeriodEligible &&
              this.strategy.trialPeriod.roles.includes('local'))
          ) {
            return [perm, true]
          }
        }
        return [perm, false]
      }),
    )
  }

  /** @type {import('passport-local').VerifyFunctionWithRequest} */
  async authHandler(_req, username, password, done) {
    const forceTutorial = config.getSafe('map.misc.forceTutorial')
    const trialActive = this.trialManager.active()
    const localPerms = Object.keys(this.perms).filter((key) =>
      this.perms[key].roles.includes('local'),
    )
    const user = {
      perms: /** @type {import('@rm/types').Permissions} */ ({
        ...Object.fromEntries(Object.keys(this.perms).map((x) => [x, false])),
        areaRestrictions: areaPerms(localPerms),
        webhooks: [],
        scanner: [],
      }),
      rmStrategy: this.rmStrategy,
    }

    try {
      await state.db.models.User.query()
        .findOne({ username })
        .then(
          async (/** @type {import('@rm/types').FullUser} */ userExists) => {
            if (!userExists) {
              try {
                /** @type {import('@rm/types').FullUser} */
                const newUser =
                  await state.db.models.User.query().insertAndFetch({
                    username,
                    password: await bcrypt.hash(password, 10),
                    strategy: 'local',
                    tutorial: !forceTutorial,
                  })
                user.id = newUser.id
                user.username = newUser.username
                user.perms = { ...user.perms, ...this.getPerms(trialActive) }

                this.log.info(
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
                  user.perms = mergePerms(
                    user.perms,
                    typeof userExists[permSet] === 'string'
                      ? JSON.parse(userExists[permSet])
                      : userExists[permSet],
                  )
                }
              })
              if (userExists.strategy !== 'local') {
                await state.db.models.User.query()
                  .update({ strategy: 'local' })
                  .where('id', userExists.id)
                userExists.strategy = 'local'
              }
              user.id = userExists.id
              user.username = userExists.username
              user.discordId = userExists.discordId
              user.telegramId = userExists.telegramId
              user.webhookStrategy = userExists.webhookStrategy
              user.data = userExists.data
              user.status = userExists.data
                ? (typeof userExists.data === 'string'
                    ? JSON.parse(userExists.data).status
                    : userExists.data.status) || 'local'
                : 'local'

              user.perms = { ...user.perms, ...this.getPerms(trialActive) }

              webhookPerms([user.status], 'local', trialActive).forEach((x) =>
                user.perms.webhooks.push(x),
              )
              scannerPerms([user.status], 'local', trialActive).forEach((x) =>
                user.perms.scanner.push(x),
              )
              this.log.info(
                user.username,
                `(${user.id})`,
                'Authenticated successfully.',
              )
              return done(null, user)
            }
            return done(null, false, { message: 'invalid_credentials' })
          },
        )
    } catch (e) {
      this.log.error('User has failed authentication.', e)
    }
  }

  initPassport() {
    passport.use(
      this.rmStrategy,
      new Strategy(
        {
          usernameField: 'username',
          passwordField: 'password',
          passReqToCallback: true,
        },
        (...args) => this.authHandler(...args),
      ),
    )
  }
}

module.exports = { LocalClient }
