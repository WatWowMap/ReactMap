// server/src/scripts/backfill-auth-users.js
//
// Moves every row in the legacy `users` table into `auth_user`/
// `auth_account`/`user_perms`, so a 1.x account can sign in through Better
// Auth. This used to run automatically inside `migrate:latest`, which meant
// a colliding pair of legacy rows took the whole server down at boot rather
// than degrading, and an operator got a stack trace instead of something
// they could act on. It is a script now: an operator runs it deliberately,
// reads its output, and decides what to do next. Nothing about it runs
// unless invoked directly.
//
// Run with `bun run backfill:auth-users` (see package.json).
//
// Re-running this script is safe. Every id it writes is derived
// deterministically from the legacy row (see `authIdForLegacy`/`derivedId`
// in `../auth/backfill.js`), so a second run recognizes rows it already
// wrote and skips them rather than duplicating them or overwriting
// anything -- including a password the person has since changed through
// Better Auth. It is also safe to run while the server is up: it only ever
// reads the legacy `users` table and inserts rows keyed off ids nothing
// else in the system derives, so it cannot collide with a live sign-up,
// sign-in, or permission recompute.
//
// The one thing it will not do is paper over a real problem. If a legacy
// row would collide with another legacy row (case, accent, or sharp-s/ss
// folding under the same collation MySQL enforces on `auth_user.username`,
// or a shared discordId/telegramId), it refuses and writes nothing. If an
// insert fails for any other reason -- a foreign key error, a unique
// violation the collision check did not anticipate -- it stops and reports
// exactly which legacy row and which table, rather than swallowing the
// error the way `INSERT IGNORE` used to.
// @ts-check
require('dotenv').config()

const { knex: knexFactory } = require('knex')
const config = require('@rm/config')
const { log, TAGS } = require('@rm/logger')

const { knexConfig } = require('../db/knexfile.cjs')
const {
  planBackfill,
  derivedId,
  detectIdentityCollisions,
  detectUsernameCollisions,
  formatCollisionReport,
} = require('../auth/backfill')

/**
 * MySQL's name for the unique key/primary key an `ER_DUP_ENTRY` error names
 * in its message, for each table this script writes to. Used to tell "this
 * exact row already exists" (the key we derived for idempotency) apart from
 * any other unique violation, which is not something this script expects
 * and should not swallow.
 *
 * @type {Record<string, string>}
 */
const EXPECTED_CONFLICT_KEY = {
  auth_user: 'PRIMARY',
  auth_account: 'auth_account_issuer_account_uidx',
  user_perms: 'user_perms_user_provider_uidx',
}

/**
 * True when `error` is a duplicate-key error on exactly the key this
 * table's idempotency depends on (see `EXPECTED_CONFLICT_KEY`) -- meaning a
 * concurrent run of this same script raced the pre-check in
 * `insertIfAbsent` and inserted the identical row first. That is the one
 * shape of duplicate-key error this script treats as "already exists,
 * skip it" rather than "this failed for a reason nobody expected". Any
 * other unique violation (a legacy username colliding with a live sign-up,
 * for instance) or any other kind of database error at all -- most
 * importantly a foreign key violation, the failure `INSERT IGNORE` used to
 * swallow -- is not this, and must be loud.
 *
 * Pure and synchronous so it can be unit tested against constructed error
 * objects without a database connection.
 *
 * @param {string} table
 * @param {any} error
 */
function isIdempotentConflict(table, error) {
  const expectedKey = EXPECTED_CONFLICT_KEY[table]
  return Boolean(
    error?.code === 'ER_DUP_ENTRY' &&
      expectedKey &&
      typeof error.sqlMessage === 'string' &&
      error.sqlMessage.includes(expectedKey),
  )
}

/**
 * Inserts `row` into `table` unless a row with the same value at
 * `whereMatch` already exists, in which case it is left untouched -- this
 * is what makes a second run of the script a no-op for anything it already
 * wrote, including a password changed since.
 *
 * @param {import('knex').Knex.Transaction} trx
 * @param {string} table
 * @param {Record<string, any>} row
 * @param {Record<string, any>} whereMatch
 * @param {string | number} legacyId
 */
async function insertIfAbsent(trx, table, row, whereMatch, legacyId) {
  const existing = await trx(table).where(whereMatch).first()
  if (existing) return { inserted: false }

  try {
    await trx(table).insert(row)
    return { inserted: true }
  } catch (error) {
    if (isIdempotentConflict(table, error)) {
      return { inserted: false }
    }
    throw new Error(
      `back-fill failed writing "${table}" for legacy users.id ${legacyId}: ${error.message}`,
      { cause: error },
    )
  }
}

/**
 * Runs the back-fill against a live knex connection. Pure enough to unit
 * test with a fake knex (see server/test/backfill-auth-users.test.js):
 * given a connection, it reads, checks, and writes -- it does not open or
 * close the connection itself, and it does not print anything, so a caller
 * (the CLI entry below, or a test) decides how the result is reported.
 *
 * @param {import('knex').Knex} knex
 * @param {string} usersTable
 */
async function backfillAuthUsers(knex, usersTable) {
  const rows = await knex(usersTable).select('*')

  const identityCollisions = detectIdentityCollisions(rows)
  const usernameCollisions = await detectUsernameCollisions(knex, usersTable)
  const collisions = [...usernameCollisions, ...identityCollisions]

  if (collisions.length > 0) {
    return {
      ok: false,
      report: formatCollisionReport(collisions),
      legacyCount: rows.length,
      migratedCount: 0,
    }
  }

  let migratedCount = 0

  await knex.transaction(async (trx) => {
    for (const row of rows) {
      const { user, accounts, perms } = planBackfill(row)

      await insertIfAbsent(
        trx,
        'auth_user',
        {
          id: user.id,
          legacy_id: user.legacyId,
          name: user.name,
          email: user.email,
          email_verified: user.emailVerified,
          username: user.username,
          display_username: user.displayUsername,
        },
        { id: user.id },
        row.id,
      )

      for (const account of accounts) {
        await insertIfAbsent(
          trx,
          'auth_account',
          {
            id: derivedId(account.userId, account.providerId),
            issuer: account.issuer,
            account_id: account.accountId,
            provider_id: account.providerId,
            user_id: account.userId,
            password: account.password || null,
          },
          { issuer: account.issuer, account_id: account.accountId },
          row.id,
        )
      }

      for (const perm of perms) {
        await insertIfAbsent(
          trx,
          'user_perms',
          {
            id: derivedId(perm.userId, perm.providerId),
            user_id: perm.userId,
            provider_id: perm.providerId,
            perms: JSON.stringify(perm.perms),
          },
          { user_id: perm.userId, provider_id: perm.providerId },
          row.id,
        )
      }

      migratedCount += 1
    }
  })

  return {
    ok: true,
    report: null,
    legacyCount: rows.length,
    migratedCount,
  }
}

async function main() {
  const usersTable = config.getSafe('database.settings.userTableName')
  const knex = knexFactory(knexConfig)

  try {
    log.info(TAGS.db, `auth back-fill: reading legacy table "${usersTable}"`)
    const result = await backfillAuthUsers(knex, usersTable)

    if (!result.ok) {
      log.error(TAGS.db, result.report)
      log.error(
        TAGS.db,
        `auth back-fill: wrote nothing. legacy=${result.legacyCount} migrated=0`,
      )
      process.exitCode = 1
      return
    }

    log.info(
      TAGS.db,
      `auth back-fill: done. legacy=${result.legacyCount} migrated=${result.migratedCount}`,
    )
  } catch (error) {
    log.error(TAGS.db, 'auth back-fill: stopped without finishing.')
    log.error(TAGS.db, error instanceof Error ? error.message : error)
    process.exitCode = 1
  } finally {
    await knex.destroy()
  }
}

if (require.main === module) {
  main()
}

module.exports = { backfillAuthUsers, insertIfAbsent, isIdempotentConflict }
