// server/src/auth/backfill.ts

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
import {
  createLocalAccountIssuer,
  createOAuthAccountIssuer,
} from 'better-auth/db'
import crypto from 'crypto'

/**
 * Derives a stable auth_user id from the legacy numeric id, so the back-fill
 * is idempotent: running it twice produces the same ids and the second run is
 * an upsert rather than a duplicate.
 */
function authIdForLegacy(legacyId: string | number) {
  return crypto
    .createHash('sha256')
    .update(`reactmap-user:${legacyId}`)
    .digest('hex')
    .slice(0, 36)
}

/**
 * Fans one legacy users row out into the rows the auth tables expect.
 * Pure: it decides what to write, it does not write anything.
 */
function planBackfill(row: Record<string, any>) {
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

  const accounts: Record<string, any>[] = []
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

  const perms: Record<string, any>[] = []
  if (row.discordPerms) {
    perms.push({ userId: id, providerId: 'discord', perms: row.discordPerms })
  }
  if (row.telegramPerms) {
    perms.push({ userId: id, providerId: 'telegram', perms: row.telegramPerms })
  }

  return { user, accounts, perms }
}

/**
 * Groups legacy rows by discordId and by telegramId, and reports every
 * group with more than one row.
 *
 * These are plain string/numeric identity keys, not text subject to a
 * collation, so comparing them in JavaScript is exact: there is no MySQL
 * collation folding to reproduce, unlike `username` (see
 * `detectUsernameCollisions` below). The legacy `users` table has no unique
 * index on either column, but the back-fill merges `auth_account` rows on
 * `(issuer, account_id)`, so two legacy rows sharing an identity would
 * otherwise fight over the same account row. Only an operator who can see
 * both rows can decide which one is real, so this only detects and reports,
 * it never decides for them.
 *
 * Pure: takes rows, returns a description, writes nothing.
 *
 */
function detectIdentityCollisions(
  rows: Record<string, any>[],
): { field: 'discordId' | 'telegramId'; value: string; ids: any[] }[] {
  const groups = {
    discordId: new Map<string, any[]>(),
    telegramId: new Map<string, any[]>(),
  }

  for (const row of rows) {
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

  const collisions: {
    field: 'discordId' | 'telegramId'
    value: string
    ids: any[]
  }[] = []
  for (const field of ['discordId', 'telegramId'] as const) {
    for (const [value, ids] of groups[field]) {
      if (ids.length > 1) {
        collisions.push({ field, value, ids })
      }
    }
  }
  return collisions
}

// `auth_user.username` is UNIQUE under this exact collation (confirmed
// against the running schema: `SHOW FULL COLUMNS FROM auth_user` reports
// `utf8mb4_unicode_ci` on the `username` column). It folds case, but it also
// folds accents and the German sharp-s: `jose` and `josé` collide, and so do
// `strasse` and `straße`. A JavaScript `toLowerCase()` comparison does
// neither, so two legacy rows that collide under this collation used to
// pass the old check, insert cleanly (MySQL's own unique index caught one
// of them), and vanish under `INSERT IGNORE` without a word to the
// operator.
const USERNAME_COLLATION = 'utf8mb4_unicode_ci'

/**
 * Builds the `knex.raw` expression that normalizes `username` under the
 * exact collation `auth_user.username` enforces. Split out from
 * `detectUsernameCollisions` so the query it produces -- the part that
 * actually encodes "match MySQL's collation" -- can be inspected by a unit
 * test without a database connection.
 *
 */
function buildNormalizedUsernameExpression(
  knex: import('knex').Knex,
  usersTable: string,
) {
  return knex.raw(
    `CONVERT(TRIM(??) USING utf8mb4) COLLATE ${USERNAME_COLLATION}`,
    [`${usersTable}.username`],
  )
}

/**
 * Finds legacy `username` collisions by asking MySQL to group rows under
 * the exact collation `auth_user.username` enforces, rather than
 * reimplementing that collation in JavaScript. This is the one collision
 * check in this file that talks to the database, because it is the one
 * check where "the same rule the database will enforce" cannot be
 * expressed any other way.
 *
 */
async function detectUsernameCollisions(
  knex: import('knex').Knex,
  usersTable: string,
): Promise<{ field: 'username'; value: string; ids: any[] }[]> {
  const normalized = buildNormalizedUsernameExpression(knex, usersTable)

  // knex has no generated schema types on this branch, so `.select({...})`
  // cannot infer the projected row shape -- cast to `any[]` rather than
  // fight a query builder that has nothing to type-check against.
  const groups: any[] = await knex(usersTable)
    .whereNotNull('username')
    .andWhere('username', '<>', '')
    .select({ normalized })
    .count({ total: '*' })
    .groupByRaw(normalized.toString())
    .having(knex.raw('count(*) > 1'))

  const collisions: { field: 'username'; value: string; ids: any[] }[] = []
  for (const group of groups) {
    const ids = await knex(usersTable)
      .whereRaw(`${normalized.toString()} = ?`, [group.normalized])
      .pluck('id')
    collisions.push({ field: 'username', value: group.normalized, ids })
  }
  return collisions
}

/**
 * Renders combined `detectIdentityCollisions`/`detectUsernameCollisions`
 * output into a message an operator can act on without reading this code,
 * naming exactly which legacy ids collide on which value.
 *
 */
function formatCollisionReport(
  collisions: {
    field: 'username' | 'discordId' | 'telegramId'
    value: string
    ids: any[]
  }[],
) {
  const lines = collisions.map(
    (c) =>
      `  - ${c.field} "${c.value}" is shared by legacy users.id ${c.ids.join(', ')}`,
  )
  return [
    `auth back-fill refused: ${collisions.length} colliding group(s) found in the legacy "users" table.`,
    ...lines,
    'The legacy table has no unique index on username, discordId or telegramId, so these rows would otherwise be silently merged into one account. The username check matches the utf8mb4_unicode_ci collation MySQL enforces on auth_user.username, so it also catches pairs that only differ by accent or by sharp-s/ss.',
    'Resolve the duplicates by hand (rename, merge, or delete the extra legacy row) and re-run the back-fill script.',
  ].join('\n')
}

/**
 * Derives a stable id for a row keyed off a legacy user's derived
 * `auth_user.id`, so a second run of the back-fill hits the same primary
 * key as the first (an idempotent no-op) instead of writing a duplicate row
 * with a fresh random id. Used for `auth_account.id` and `user_perms.id`,
 * neither of which has a natural id of its own to reuse.
 *
 * `auth_account.id`/`user_perms.id` are varchar(36), and the id
 * `authIdForLegacy` derives is already 36 characters, so concatenating
 * `${userId}:${providerId}` would overflow the column. Hashing again keeps
 * the id both deterministic and inside the column width.
 *
 */
function derivedId(...parts: (string | number)[]) {
  return crypto
    .createHash('sha256')
    .update(`reactmap-derived:${parts.join(':')}`)
    .digest('hex')
    .slice(0, 36)
}

export {
  authIdForLegacy,
  buildNormalizedUsernameExpression,
  derivedId,
  detectIdentityCollisions,
  detectUsernameCollisions,
  formatCollisionReport,
  planBackfill,
}
