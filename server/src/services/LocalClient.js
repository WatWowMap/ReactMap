// @ts-check
const { Strategy } = require('passport-local')
const passport = require('passport')
const bcrypt = require('bcrypt')

const config = require('@rm/config')

const { areaPerms } = require('../utils/areaPerms')
const { webhookPerms } = require('../utils/webhookPerms')
const { scannerPerms, scannerCooldownBypass } = require('../utils/scannerPerms')
const { mergePerms } = require('../utils/mergePerms')
const { AuthClient } = require('./AuthClient')
const { state } = require('./state')

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

  /**
   * @param {import('@rm/types').Permissions} userPerms
   * @param {import('@rm/types').FullUser} userExists
   * @param {import('express').Request} req
   * @returns {Promise<Record<string, string>>}
   */
  async mergeLinkedPerms(userPerms, userExists, req) {
    const authClients = Object.values(state.event.authClients || {})
    const linkedProviders = [
      {
        field: 'discordPerms',
        type: 'discord',
        id: userExists.discordId,
        storedPerms: userExists.discordPerms,
      },
      {
        field: 'telegramPerms',
        type: 'telegram',
        id: userExists.telegramId,
        storedPerms: userExists.telegramPerms,
      },
    ]
    const providerPerms = await Promise.all(
      linkedProviders.map(async ({ field, type, id, storedPerms }) => {
        const parsedStoredPerms = storedPerms
          ? typeof storedPerms === 'string'
            ? JSON.parse(storedPerms)
            : storedPerms
          : null
        const matchingClients = authClients.filter(
          (client) =>
            client?.strategy?.type === type &&
            typeof client.getLinkedPerms === 'function',
        )

        if (id && matchingClients.length === 1) {
          try {
            const livePermResult = await matchingClients[0].getLinkedPerms(
              id,
              req,
              userExists.username,
            )
            if (!livePermResult?.degraded && livePermResult?.perms) {
              return {
                field,
                perms: livePermResult.perms,
                persisted: JSON.stringify(livePermResult.perms),
              }
            }
          } catch (error) {
            this.log.warn(`Failed to refresh linked ${type} perms`, error)
          }
        }

        return { field, perms: parsedStoredPerms, persisted: null }
      }),
    )
    const refreshedLinkedPerms = {}

    providerPerms
      .filter(({ perms }) => !!perms)
      .forEach(({ field, perms, persisted }) => {
        if (persisted) {
          refreshedLinkedPerms[field] = persisted
        }
        Object.assign(userPerms, mergePerms(userPerms, perms))
      })

    return refreshedLinkedPerms
  }

  /** @type {import('passport-local').VerifyFunctionWithRequest} */
  async authHandler(req, username, password, done) {
    const forceTutorial = config.getSafe('map.misc.forceTutorial')
    const trialActive = this.trialManager.active()
    const localPerms = Object.keys(this.perms).filter((key) =>
      this.perms[key].roles.includes('local'),
    )
    const user = {
      perms: /** @type {import('@rm/types').Permissions} */ ({
        ...Object.fromEntries(Object.keys(this.perms).map((x) => [x, false])),
        areaRestrictions: areaPerms(localPerms, req, true),
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
              const linkedPermUpdates = await this.mergeLinkedPerms(
                user.perms,
                userExists,
                req,
              )
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

              if (user.perms.blocked || user.perms.map === false) {
                if (Object.keys(linkedPermUpdates).length) {
                  await state.db.models.User.query()
                    .update(linkedPermUpdates)
                    .where('id', userExists.id)
                }

                if (user.perms.blocked) {
                  return done(null, false, {
                    blockedGuilds: (user.perms.blockedGuildNames || []).join(
                      ',',
                    ),
                  })
                }

                return done(null, false, { message: 'access_denied' })
              }

              const userUpdates = {
                ...linkedPermUpdates,
                ...(userExists.strategy !== 'local'
                  ? { strategy: 'local' }
                  : {}),
              }
              if (Object.keys(userUpdates).length) {
                await state.db.models.User.query()
                  .update(userUpdates)
                  .where('id', userExists.id)
              }
              if (userExists.strategy !== 'local') {
                userExists.strategy = 'local'
              }
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
