// server/src/auth/backfill.js
// @ts-check
const crypto = require('crypto')

// Import the issuer helpers rather than reimplementing them. A row this
// back-fill writes has to look exactly like one Better Auth would have written,
// and getting it wrong does not fail loudly: the row inserts fine and the person
// simply cannot sign in. Reconstructing the format by hand is how that happens,
// so the library stays the single source of truth.
//
// Which helper applies is per provider, and it is not guessable from the name.
// Telegram is a local provider, not OAuth, because its login widget is an
// HMAC-signed payload rather than an OAuth2 flow. So it gets `local:telegram`
// while Discord gets `local:oauth:discord`. The Telegram plugin in
// `server/src/auth/telegram.js` looks up `createLocalAccountIssuer('telegram')`,
// and a row written under any other issuer is invisible to it.
const {
  createLocalAccountIssuer,
  createOAuthAccountIssuer,
} = require('better-auth/db')

/**
 * Derives a stable auth_user id from the legacy numeric id, so the back-fill
 * is idempotent: running it twice produces the same ids and the second run is
 * an upsert rather than a duplicate.
 *
 * @param {string | number} legacyId
 */
function authIdForLegacy(legacyId) {
  return crypto
    .createHash('sha256')
    .update(`reactmap-user:${legacyId}`)
    .digest('hex')
    .slice(0, 36)
}

/**
 * Fans one legacy users row out into the rows the auth tables expect.
 * Pure: it decides what to write, it does not write anything.
 *
 * @param {Record<string, any>} row
 */
function planBackfill(row) {
  const id = authIdForLegacy(row.id)

  const user = {
    id,
    legacyId: row.id,
    name: row.username || String(row.id),
    username: row.username || null,
    displayUsername: row.username || null,
    // No email exists in the legacy schema and better auth requires the column
    // to be unique and non null, so a routable-looking placeholder is derived
    // per user. The username plugin is what people actually log in with.
    email: `${id}@users.noreply.reactmap.invalid`,
    emailVerified: false,
  }

  const accounts = []
  if (row.password) {
    accounts.push({
      providerId: 'credential',
      issuer: createLocalAccountIssuer('credential'),
      // Better Auth writes the user's own id here for credential accounts,
      // verified by inspecting a row it created. Putting the username here
      // instead would diverge from every row Better Auth writes afterwards.
      accountId: id,
      userId: id,
      password: row.password,
    })
  }
  if (row.discordId) {
    accounts.push({
      providerId: 'discord',
      issuer: createOAuthAccountIssuer('discord'),
      accountId: String(row.discordId),
      userId: id,
    })
  }
  if (row.telegramId) {
    accounts.push({
      providerId: 'telegram',
      issuer: createLocalAccountIssuer('telegram'),
      accountId: String(row.telegramId),
      userId: id,
    })
  }

  const perms = []
  if (row.discordPerms) {
    perms.push({ userId: id, providerId: 'discord', perms: row.discordPerms })
  }
  if (row.telegramPerms) {
    perms.push({ userId: id, providerId: 'telegram', perms: row.telegramPerms })
  }

  return { user, accounts, perms }
}

module.exports = { planBackfill, authIdForLegacy }
