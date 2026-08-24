// @ts-check
const crypto = require('crypto')
const config = require('@rm/config')
const {
  planBackfill,
  detectCollisions,
  formatCollisionReport,
} = require('../../auth/backfill')

// auth_account.id and user_perms.id are varchar(36), and the auth_user id
// this back-fill derives is already 36 characters on its own. Concatenating
// `${userId}:${providerId}` overflows that column: MySQL's strict mode
// rejects the insert outright, and the failure mode without strict mode is
// worse, every account for the same user gets truncated down to the same 36
// characters and the rows collide on their primary key. Deriving a second
// stable hash keeps ids deterministic (idempotent re-runs upsert instead of
// duplicating) while staying inside the column width.
function derivedId(...parts) {
  return crypto
    .createHash('sha256')
    .update(`reactmap-derived:${parts.join(':')}`)
    .digest('hex')
    .slice(0, 36)
}

// planBackfill hands back the camelCase shape the Drizzle schema uses, but
// this migration goes through the knex query builder, which does not
// camelCase/snake_case translate column names the way Drizzle does. Inserting
// the plan as-is throws "Unknown column 'displayUsername'" (and would insert
// nothing at all for the rest, silently, on a client lenient enough not to
// throw). The auth_user/auth_account DDL are both snake_case, so the plan's
// fields are remapped to the real column names here.
exports.up = async function up(knex) {
  const usersTable = config.getSafe('database.settings.userTableName')
  const rows = await knex(usersTable).select('*')

  // The legacy table has no unique index on username, discordId or
  // telegramId, so two colliding rows would otherwise be folded together by
  // the upserts below: a username collision under auth_user's
  // case-insensitive unique index, or an identity collision on the
  // (issuer, account_id) key the account upsert merges on. Neither can be
  // resolved automatically, since the migration has no way to know which of
  // two same-named or same-identity rows is the real account, so it refuses
  // and leaves the operator to fix the legacy data by hand. Knex wraps this
  // migration in a transaction, so throwing here writes nothing.
  const collisions = detectCollisions(rows)
  if (collisions.length > 0) {
    throw new Error(formatCollisionReport(collisions))
  }

  for (const row of rows) {
    const { user, accounts, perms } = planBackfill(row)

    // A re-run must not clobber anything the new system, or the person
    // themselves, has since changed: a password reset through Better Auth,
    // an edited username, or perms recomputed by the sign-in hook. Every id
    // here is derived deterministically from the legacy row, so a second run
    // hits the same primary/unique keys as the first. Using `.ignore()`
    // rather than `.merge()` makes that second run a true no-op against
    // anything that already exists, inserting only rows that are genuinely
    // new (e.g. a legacy user added after the first run), and it also closes
    // the primary-key hazard `.merge()` had: MySQL's `ON DUPLICATE KEY
    // UPDATE` includes every merged column, and merging `id` on a username
    // collision rewrote a different user's primary key.
    await knex('auth_user')
      .insert({
        id: user.id,
        legacy_id: user.legacyId,
        name: user.name,
        email: user.email,
        email_verified: user.emailVerified,
        username: user.username,
        display_username: user.displayUsername,
      })
      .onConflict('id')
      .ignore()

    for (const account of accounts) {
      await knex('auth_account')
        .insert({
          id: derivedId(account.userId, account.providerId),
          issuer: account.issuer,
          account_id: account.accountId,
          provider_id: account.providerId,
          user_id: account.userId,
          password: account.password || null,
        })
        .onConflict(['issuer', 'account_id'])
        .ignore()
    }

    for (const perm of perms) {
      await knex('user_perms')
        .insert({
          id: derivedId(perm.userId, perm.providerId),
          user_id: perm.userId,
          provider_id: perm.providerId,
          perms: JSON.stringify(perm.perms),
        })
        .onConflict(['user_id', 'provider_id'])
        .ignore()
    }
  }
}

exports.down = async function down(knex) {
  // The legacy users table was only read, but auth_user, auth_account and
  // user_perms rows written after this migration ran (a real sign-up, a
  // linked account, perms recomputed at sign-in) are not this migration's to
  // undo. Scope the rollback to rows it actually wrote: every auth_user row
  // this migration created carries a non-null legacy_id, which nothing else
  // in the system sets.
  const legacyUserIds = await knex('auth_user')
    .whereNotNull('legacy_id')
    .pluck('id')

  if (legacyUserIds.length === 0) return

  await knex('user_perms').whereIn('user_id', legacyUserIds).del()
  await knex('auth_account').whereIn('user_id', legacyUserIds).del()
  await knex('auth_user').whereIn('id', legacyUserIds).del()
}
