// @ts-check
const { Strategy } = require('passport-local')
const passport = require('passport')

const config = require('@rm/config')

const { areaPerms } = require('../utils/areaPerms')
const { webhookPerms } = require('../utils/webhookPerms')
const { scannerPerms, scannerCooldownBypass } = require('../utils/scannerPerms')
const { mergePerms } = require('../utils/mergePerms')
const { AuthClient } = require('./AuthClient')
const { state } = require('./state')

const BCRYPT_COST = 10

/** The input length bcrypt has always silently truncated at, in bytes. */
const BCRYPT_MAX_BYTES = 72

/**
 * @param {string} password
 * @returns {Promise<string>}
 */
async function hashPassword(password) {
  return Bun.password.hash(password, { algorithm: 'bcrypt', cost: BCRYPT_COST })
}

/**
 * Bun.password.verify throws on a value it cannot parse, where the bcrypt
 * library it replaced returned false. Rows holding null or garbage in the
 * password column are ordinary here: every Discord and Telegram account has
 * one. That throw would reach the auth handler's outer catch, which logs and
 * returns without calling passport's done, so the request hangs instead of
 * coming back as invalid credentials. Anything unparseable is simply not a
 * match.
 *
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function matchesHash(password, hash) {
  try {
    return await Bun.password.verify(password, hash)
  } catch {
    return false
  }
}

/**
 * bcrypt truncated its input at 72 bytes, so hashes written before the move to
 * Bun.password encode only that prefix. Bun pre-hashes the whole input instead,
 * so a longer password no longer matches its own stored hash. On a failed
 * verify, retry against the bytes bcrypt would have seen.
 *
 * The bytes past 72 are ignored on purpose. Nothing in the stored hash covers
 * them, so there is no way to tell a correct tail from a mistyped one. Re-hashing
 * the submitted string here would freeze whatever tail was typed as the account's
 * real password and lock the owner out, with no reset flow to recover through.
 * Accepting the prefix and leaving the row alone is what bcrypt did for years,
 * which is the behaviour this migration is meant to preserve.
 *
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function verifyPassword(password, hash) {
  if (await matchesHash(password, hash)) return true

  if (Buffer.byteLength(password, 'utf8') <= BCRYPT_MAX_BYTES) return false

  // Slice the bytes, not the characters. The two disagree for any non-ASCII
  // password, and a character-boundary slice would not reproduce what bcrypt
  // hashed. The cut may land inside a multi-byte character, which is fine and
  // is why this stays a Buffer: re-encoding a split character changes it.
  const truncated = Buffer.from(password, 'utf8').subarray(0, BCRYPT_MAX_BYTES)
  return matchesHash(truncated, hash)
}

class LocalClient extends AuthClient {
  getPerms(trialActive = false, status = 'local') {
    return Object.fromEntries(
      Object.entries(this.perms).map(([perm, info]) => {
        if (info.enabled) {
          if (
            this.alwaysEnabledPerms.includes(perm) ||
            info.roles.includes('local') ||
            info.roles.includes(status) ||
            (trialActive &&
              info.trialPeriodEligible &&
              (this.strategy.trialPeriod.roles.includes('local') ||
                this.strategy.trialPeriod.roles.includes(status)))
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
        scannerCooldownBypass: [],
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
                    password: await hashPassword(password),
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
              } catch (_e) {
                return done(null, user, { message: 'error_creating_user' })
              }
            }
            if (await verifyPassword(password, userExists.password)) {
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
              // Discord and Telegram spread the whole row onto the session
              // user, so they pick this up for free. Local auth copies fields
              // one at a time, so an omission here is invisible until someone
              // notices that flagging a local account onto the 2.0 shell
              // silently does nothing.
              user.useAppShell = userExists.useAppShell
              user.data = userExists.data
              user.status = userExists.data
                ? (typeof userExists.data === 'string'
                    ? JSON.parse(userExists.data).status
                    : userExists.data.status) || 'local'
                : 'local'

              user.perms = {
                ...user.perms,
                ...this.getPerms(trialActive, user.status),
              }

              webhookPerms([user.status], 'local', trialActive).forEach((x) =>
                user.perms.webhooks.push(x),
              )
              scannerPerms([user.status], 'local', trialActive).forEach((x) =>
                user.perms.scanner.push(x),
              )
              scannerCooldownBypass([user.status], 'local').forEach((x) =>
                user.perms.scannerCooldownBypass.push(x),
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

module.exports = { LocalClient, hashPassword, verifyPassword }
