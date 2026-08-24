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

/**
 * Groups legacy rows by lowercased/trimmed username, and separately by
 * discordId and telegramId, and reports every group with more than one row.
 *
 * The legacy `users` table has no unique index on any of these three
 * columns, but `auth_user.username` is unique under a case-insensitive
 * collation and the back-fill merges accounts on `(issuer, account_id)`.
 * Two legacy rows that collide on one of these keys would otherwise be
 * silently folded into a single auth user, or made to fight over a single
 * `auth_account`/`user_perms` row. Only an operator who can see both rows can
 * decide which one is real, so this only detects and reports, it never
 * decides for them.
 *
 * Pure: takes rows, returns a description, writes nothing.
 *
 * @param {Record<string, any>[]} rows
 * @returns {{ field: 'username' | 'discordId' | 'telegramId', value: string, ids: any[] }[]}
 */
function detectCollisions(rows) {
  const groups = {
    username: new Map(),
    discordId: new Map(),
    telegramId: new Map(),
  }

  for (const row of rows) {
    if (row.username != null && String(row.username).trim() !== '') {
      const key = String(row.username).trim().toLowerCase()
      const bucket = groups.username.get(key) || []
      bucket.push(row.id)
      groups.username.set(key, bucket)
    }
    if (row.discordId != null) {
      const key = String(row.discordId)
      const bucket = groups.discordId.get(key) || []
      bucket.push(row.id)
      groups.discordId.set(key, bucket)
    }
    if (row.telegramId != null) {
      const key = String(row.telegramId)
      const bucket = groups.telegramId.get(key) || []
      bucket.push(row.id)
      groups.telegramId.set(key, bucket)
    }
  }

  /** @type {{ field: 'username' | 'discordId' | 'telegramId', value: string, ids: any[] }[]} */
  const collisions = []
  for (const field of /** @type {const} */ ([
    'username',
    'discordId',
    'telegramId',
  ])) {
    for (const [value, ids] of groups[field]) {
      if (ids.length > 1) {
        collisions.push({ field, value, ids })
      }
    }
  }
  return collisions
}

/**
 * Renders `detectCollisions` output into a message an operator can act on
 * without reading this code, naming exactly which legacy ids collide on
 * which value.
 *
 * @param {ReturnType<typeof detectCollisions>} collisions
 */
function formatCollisionReport(collisions) {
  const lines = collisions.map(
    (c) =>
      `  - ${c.field} "${c.value}" is shared by legacy users.id ${c.ids.join(', ')}`,
  )
  return [
    `auth back-fill refused: ${collisions.length} colliding group(s) found in the legacy "users" table.`,
    ...lines,
    'The legacy table has no unique index on username, discordId or telegramId, so these rows would otherwise be silently merged into one account.',
    'Resolve the duplicates by hand (rename, merge, or delete the extra legacy row) and re-run migrate:latest.',
  ].join('\n')
}

module.exports = {
  planBackfill,
  authIdForLegacy,
  detectCollisions,
  formatCollisionReport,
}
