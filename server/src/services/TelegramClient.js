// @ts-check
const { default: fetch } = require('node-fetch')
const { TelegramStrategy } = require('@rainb0w-clwn/passport-telegram-official')
const { createRemoteJWKSet, jwtVerify } = require('jose')
const passport = require('passport')
const OAuth2Strategy = require('passport-oauth2')

const config = require('@rm/config')

const { state } = require('./state')
const { areaPerms } = require('../utils/areaPerms')
const { webhookPerms } = require('../utils/webhookPerms')
const { scannerPerms, scannerCooldownBypass } = require('../utils/scannerPerms')
const { mergePerms } = require('../utils/mergePerms')
const { getUserDisplayName } = require('../utils/getUserDisplayName')
const { AuthClient } = require('./AuthClient')

/**
 * @typedef {import('@rainb0w-clwn/passport-telegram-official/dist/types').PassportTelegramUser} TGUser
 * @typedef {Parameters<import('@rainb0w-clwn/passport-telegram-official/dist/types').CallbackWithRequest>[0]} AuthRequest
 */

const TG_ISSUER = 'https://oauth.telegram.org'
const TG_AUTHORIZATION_URL = `${TG_ISSUER}/auth`
const TG_TOKEN_URL = `${TG_ISSUER}/token`
const TG_JWKS_URL = `${TG_ISSUER}/.well-known/jwks.json`

/**
 * Telegram rotates its signing keys, so the set is fetched lazily and cached
 * by `jose` rather than pinned at boot. Shared across every telegram strategy
 * since the keys are not client specific.
 */
const getJwks = (() => {
  /** @type {ReturnType<typeof createRemoteJWKSet>} */
  let jwks
  return () => {
    if (!jwks) jwks = createRemoteJWKSet(new URL(TG_JWKS_URL))
    return jwks
  }
})()

/**
 * JWT claims are `unknown` until narrowed, and the optional ones are simply
 * absent when the user has not set them on their Telegram account.
 *
 * @param {unknown} claim
 * @returns {string | undefined}
 */
const claimToString = (claim) =>
  claim === undefined || claim === null ? undefined : String(claim)

class TelegramClient extends AuthClient {
  /** @param {TGUser} user */
  async getUserGroups(user) {
    if (!user || !user.id) return []

    const groups = [user.id]
    await Promise.all(
      this.strategy.groups.map(async (group) => {
        try {
          const response = await fetch(
            `https://api.telegram.org/bot${this.strategy.botToken}/getChatMember?chat_id=${group}&user_id=${user.id}`,
          )
          if (!response) {
            throw new Error(
              'Unable to query TG API or User is not in the group',
            )
          }
          if (!response.ok) {
            throw new Error(
              `Telegram API error: ${response.status} ${response.statusText}`,
            )
          }
          const json = await response.json()
          if (
            json.result.status !== 'left' &&
            json.result.status !== 'kicked'
          ) {
            groups.push(group)
          }
        } catch (e) {
          this.log.error(
            e,
            `Telegram Group: ${group}`,
            `User: ${user.id} (${user.username})`,
          )
          return null
        }
      }),
    )
    return groups
  }

  /**
   *
   * @param {TGUser} user
   * @param {string[]} groups
   * @returns {TGUser & { perms: import("@rm/types").Permissions }}
   */
  getUserPerms(user, groups) {
    const trialActive = this.trialManager.active()
    let gainedAccessViaTrial = false

    const perms = Object.fromEntries(
      Object.entries(this.perms).map(([perm, info]) => [
        perm,
        info.enabled &&
          (this.alwaysEnabledPerms.includes(perm) ||
            info.roles.some((role) => {
              if (groups.includes(role)) {
                return true
              }
              if (
                trialActive &&
                info.trialPeriodEligible &&
                this.strategy.trialPeriod.roles.some((trialRole) =>
                  groups.includes(trialRole),
                )
              ) {
                gainedAccessViaTrial = true
                return true
              }
              return false
            })),
      ]),
    )
    /** @type { TGUser & { perms: import("@rm/types").Permissions }} */
    const newUserObj = {
      ...user,
      // @ts-ignore
      perms: {
        ...perms,
        trial: gainedAccessViaTrial,
        admin: false,
        areaRestrictions: areaPerms(groups),
        webhooks: webhookPerms(groups, 'telegramGroups', trialActive),
        scanner: scannerPerms(groups, 'telegramGroups', trialActive),
        scannerCooldownBypass: scannerCooldownBypass(groups, 'telegramGroups'),
      },
    }
    if (newUserObj.perms.trial) {
      this.log.info(
        user.username,
        'gained access via',
        this.trialManager._forceActive ? 'manually activated' : '',
        'trial',
      )
    }

    if (this.strategy.allowedUsers?.includes(newUserObj.id)) {
      newUserObj.perms.admin = true
    }
    return newUserObj
  }

  /** @type {import('@rainb0w-clwn/passport-telegram-official/dist/types').CallbackWithRequest} */
  async authHandler(req, profile, done) {
    const baseUser = {
      ...profile,
      username: getUserDisplayName(profile),
      rmStrategy: this.rmStrategy,
    }
    const groups = await this.getUserGroups(baseUser)
    const user = this.getUserPerms(baseUser, groups)

    if (!user.perms.map) {
      this.log.warn(user.username, 'was not given map perms')
      return done(null, false, { message: 'access_denied' })
    }
    try {
      await state.db.models.User.query()
        .findOne({ telegramId: user.id })
        .then(
          async (/** @type {import('@rm/types').FullUser} */ userExists) => {
            const selectedWebhook = Object.keys(state.event.webhookObj).find(
              (x) => user?.perms?.webhooks.includes(x),
            )
            if (req.user && userExists?.strategy === 'local') {
              await state.db.models.User.query()
                .update({
                  telegramId: user.id,
                  telegramPerms: JSON.stringify(user.perms),
                  webhookStrategy: 'telegram',
                })
                .where('id', req.user.id)
              await state.db.models.User.query()
                .where('telegramId', user.id)
                .whereNot('id', req.user.id)
                .delete()
              this.log.info(
                user.username,
                `(${user.id})`,
                'Authenticated successfully.',
              )
              return done(null, {
                selectedWebhook,
                ...user,
                ...req.user,
                username: userExists.username || user.username,
                telegramId: user.id,
                perms: mergePerms(req.user.perms, user.perms),
              })
            }
            if (!userExists) {
              userExists = await state.db.models.User.query().insertAndFetch({
                telegramId: user.id,
                strategy: user.provider,
                tutorial: !config.getSafe('map.misc.forceTutorial'),
                selectedWebhook,
              })
            }
            if (userExists.strategy !== 'telegram') {
              await state.db.models.User.query()
                .update({ strategy: 'telegram' })
                .where('id', userExists.id)
              userExists.strategy = 'telegram'
            }
            if (!userExists.selectedWebhook && selectedWebhook) {
              await state.db.models.User.query()
                .update({ selectedWebhook })
                .where('id', userExists.id)
              userExists.selectedWebhook = selectedWebhook
            }
            this.log.info(
              user.username,
              `(${user.id})`,
              'Authenticated successfully.',
            )
            return done(null, {
              ...user,
              ...userExists,
              username: userExists.username || user.username,
            })
          },
        )
    } catch (e) {
      this.log.error('User has failed auth.', e)
    }
  }

  /**
   * Send a message to a Telegram Group
   *
   * @param {import('./AuthClient').MessageEmbed} embed
   * @param {keyof AuthClient['loggingChannels']} channel
   */
  async sendMessage(embed, channel) {
    if (!this.loggingChannels[channel]) return
    const text = AuthClient.getHtml(
      typeof embed === 'string' ? embed : { ...this.getBaseEmbed(), ...embed },
    )
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.strategy.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.loggingChannels[channel],
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            text,
          }),
        },
      )
      if (!response.ok) {
        throw new Error(
          `Telegram API error: ${response.status} ${response.statusText}`,
        )
      }
      this.log.info(`${channel} Log Sent`)
    } catch (e) {
      this.log.error(`Error sending ${channel} Log`, e)
    }
  }

  /**
   * Telegram's OpenID Connect provider has no UserInfo endpoint - the profile
   * is carried by the `id_token` returned from the token exchange, so it has to
   * be verified against the JWKS before anything in it is trusted.
   *
   * The `sub` claim is an opaque, client specific identifier. The actual
   * Telegram user id only arrives as the `id` claim under the `profile` scope,
   * and that is what the rest of ReactMap keys off of (`users.telegramId`,
   * `strategy.groups`, `strategy.allowedUsers`, the `getChatMember` lookup), so
   * `sub` is deliberately ignored.
   *
   * @param {AuthRequest} req
   * @param {Record<string, any>} params token endpoint response
   * @param {(err: any, user?: any, info?: any) => void} done
   */
  async oidcHandler(req, params, done) {
    try {
      if (!params?.id_token) {
        throw new Error('No id_token was returned by Telegram')
      }
      const { payload } = await jwtVerify(params.id_token, getJwks(), {
        issuer: TG_ISSUER,
        audience: String(this.strategy.clientId),
      })
      if (!payload.id) {
        throw new Error(
          'The id_token has no `id` claim, the `profile` scope was not granted',
        )
      }
      const firstName = claimToString(payload.given_name)
      const lastName = claimToString(payload.family_name)

      return this.authHandler(
        req,
        // The OIDC flow has no `hash` or `auth_date` - those belong to the
        // legacy widget - so this is not a complete PassportTelegramUser
        // @ts-ignore
        {
          // String, to match both the `telegramId` varchar column and the
          // string role ids that `groups` / `allowedUsers` are compared against
          id: String(payload.id),
          username: claimToString(payload.preferred_username),
          first_name: firstName,
          last_name: lastName,
          name: { givenName: firstName, familyName: lastName },
          photo_url: claimToString(payload.picture),
          provider: 'telegram',
        },
        done,
      )
    } catch (e) {
      this.log.error('Unable to validate the Telegram id_token', e)
      return done(null, false, { message: 'access_denied' })
    }
  }

  initPassport() {
    const { clientId, clientSecret } = this.strategy

    if (!clientId || !clientSecret) {
      // Legacy hash signed Login Widget, still supported by Telegram
      passport.use(
        this.rmStrategy,
        new TelegramStrategy(
          {
            botToken: this.strategy.botToken,
            passReqToCallback: true,
          },
          (req, profile, done) => this.authHandler(req, profile, done),
        ),
      )
      return
    }

    passport.use(
      this.rmStrategy,
      new OAuth2Strategy(
        {
          authorizationURL: TG_AUTHORIZATION_URL,
          tokenURL: TG_TOKEN_URL,
          clientID: clientId,
          clientSecret,
          callbackURL: this.strategy.redirectUri,
          // `profile` is required, it is the only source of the Telegram user id
          scope: ['openid', 'profile'],
          state: true,
          pkce: 'S256',
          passReqToCallback: true,
        },
        // The 6 argument arity is what makes passport-oauth2 hand us `params`,
        // which is where the id_token lives
        (req, _accessToken, _refreshToken, params, _profile, done) =>
          this.oidcHandler(req, params, done),
      ),
    )
  }
}

module.exports = { TelegramClient }
