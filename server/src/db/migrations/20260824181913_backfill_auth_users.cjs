// @ts-check
const crypto = require('crypto')
const config = require('@rm/config')
const { planBackfill } = require('../../auth/backfill')

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

  for (const row of rows) {
    const { user, accounts, perms } = planBackfill(row)

    await knex('auth_user')
      .insert({
        id: user.id,
        name: user.name,
        email: user.email,
        email_verified: user.emailVerified,
        username: user.username,
        display_username: user.displayUsername,
      })
      .onConflict('id')
      .merge()

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
        .merge()
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
        .merge()
    }
  }
}

exports.down = async function down(knex) {
  // The legacy users table was only read, so undoing the back-fill is a
  // matter of emptying what it wrote.
  await knex('user_perms').del()
  await knex('auth_account').del()
  await knex('auth_user').del()
}
