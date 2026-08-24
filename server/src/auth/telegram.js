// server/src/auth/telegram.js
// @ts-check
const crypto = require('crypto')

/** Telegram login payloads older than this are refused. */
const DEFAULT_MAX_AGE_SECONDS = 300

/**
 * Verifies a Telegram Login Widget payload.
 *
 * Telegram does not use OAuth2 here. The widget posts the profile fields plus
 * an HMAC keyed on SHA256(botToken), so verification is entirely local and no
 * network call is involved.
 *
 * @param {Record<string, string>} payload
 * @param {string} botToken
 * @param {{ maxAgeSeconds?: number, nowSeconds?: number }} [opts]
 */
function verifyTelegramLogin(payload, botToken, opts = {}) {
  const maxAge = opts.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS
  const now = opts.nowSeconds ?? Math.floor(Date.now() / 1000)

  const { hash } = payload
  if (typeof hash !== 'string' || hash.length === 0) {
    return { ok: /** @type {const} */ (false), reason: 'bad-signature' }
  }

  const checkString = Object.keys(payload)
    .filter((key) => key !== 'hash')
    .sort()
    .map((key) => `${key}=${payload[key]}`)
    .join('\n')

  const secret = crypto.createHash('sha256').update(botToken).digest()
  const expected = crypto
    .createHmac('sha256', secret)
    .update(checkString)
    .digest('hex')

  const given = Buffer.from(hash, 'hex')
  const want = Buffer.from(expected, 'hex')
  // timingSafeEqual throws on a length mismatch, so guard before comparing.
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) {
    return { ok: /** @type {const} */ (false), reason: 'bad-signature' }
  }

  // Signature checks out, so the payload is authentic. It may still be a
  // replay of an old one, which is what auth_date is for.
  const authDate = Number(payload.auth_date)
  if (!Number.isFinite(authDate) || now - authDate > maxAge) {
    return { ok: /** @type {const} */ (false), reason: 'expired' }
  }

  return {
    ok: /** @type {const} */ (true),
    user: {
      id: payload.id,
      username: payload.username,
      firstName: payload.first_name,
      lastName: payload.last_name,
      photoUrl: payload.photo_url,
    },
  }
}

// The installed better-auth (1.7.1) does not export `createAuthEndpoint`
// from `better-auth/plugins` as the plan's brief assumed; that entry point
// only re-exports plugin factories (username, admin, siwe, ...). The real
// home is `better-auth/api`, confirmed by reading
// `node_modules/better-auth/dist/plugins/siwe/index.mjs`, which is the
// closest shipped analogue to Telegram: a non-OAuth2, signature-verified
// login that finds-or-refuses a local account and issues a session by hand.
const { createAuthEndpoint, APIError } = require('better-auth/api')
const { setSessionCookie } = require('better-auth/cookies')
const { createLocalAccountIssuer } = require('better-auth/db')

/**
 * Exposes POST /api/auth/telegram. On a valid, fresh, correctly signed
 * payload it looks up the account row already linked to this Telegram id
 * (`issuer: createLocalAccountIssuer('telegram')`, `accountId: <telegram id>`)
 * and issues a session for its owner.
 *
 * There is deliberately no user-creation path here. Task 6 back-fills the
 * `telegram` account row for every person who already has one from the 1.x
 * passport strategy; an endpoint that minted a new account for an unlinked
 * Telegram id would let a login attempt bypass that linking step entirely.
 *
 * @param {{ botToken: string }} options
 */
function telegramPlugin(options) {
  // An empty bot token makes the HMAC key sha256(""), a publicly computable
  // constant, so anyone can self-sign a payload carrying any back-filled
  // user's Telegram id and be handed a session. Throwing here, at
  // construction, refuses to start the instance instead of accepting forged
  // logins request after request until an operator notices.
  if (!options.botToken) {
    throw new Error(
      'telegramPlugin requires a non-empty botToken; an empty token makes ' +
        'the HMAC key a publicly computable constant, sha256(""), and lets ' +
        'anyone self-sign a login for any linked Telegram account.',
    )
  }
  return {
    id: 'telegram',
    endpoints: {
      telegramCallback: createAuthEndpoint(
        '/telegram',
        { method: 'POST' },
        async (ctx) => {
          const result = verifyTelegramLogin(ctx.body, options.botToken)
          if (!result.ok) {
            throw APIError.fromStatus('UNAUTHORIZED', {
              message: result.reason,
            })
          }

          const account = await ctx.context.internalAdapter.findAccountByKey({
            issuer: createLocalAccountIssuer('telegram'),
            accountId: result.user.id,
          })
          if (!account) {
            throw APIError.fromStatus('FORBIDDEN', {
              message: 'no-linked-account',
            })
          }

          const user = await ctx.context.internalAdapter.findUserById(
            account.userId,
          )
          if (!user) {
            throw APIError.fromStatus('FORBIDDEN', {
              message: 'no-linked-account',
            })
          }

          const session = await ctx.context.internalAdapter.createSession(
            user.id,
          )
          await setSessionCookie(ctx, { session, user })

          return ctx.json({ user, session })
        },
      ),
    },
  }
}

module.exports = {
  verifyTelegramLogin,
  telegramPlugin,
  DEFAULT_MAX_AGE_SECONDS,
}
