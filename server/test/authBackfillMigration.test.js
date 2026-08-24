// server/test/authBackfillMigration.test.js
//
// Exercises the back-fill migration's up()/down() against an in-memory fake
// knex rather than a real database, so it can assert the collision guard
// refuses BEFORE anything is written, and that a clean table still migrates.
const { test, expect } = require('bun:test')
const migration = require('../src/db/migrations/20260824181913_backfill_auth_users.cjs')

/**
 * A minimal stand-in for the knex query builder, supporting only the
 * chains the migration actually calls: `select`, `insert().onConflict().
 * ignore()`, `whereNotNull().pluck()`, and `whereIn().del()`.
 */
function makeFakeKnex(seed) {
  const tables = {
    users: seed.users || [],
    auth_user: [],
    auth_account: [],
    user_perms: [],
  }

  function conflictKey(row, columns) {
    return columns.map((c) => row[c]).join('::')
  }

  function fakeTable(name) {
    return {
      select() {
        return Promise.resolve(tables[name])
      },
      insert(row) {
        return {
          onConflict(columns) {
            const cols = Array.isArray(columns) ? columns : [columns]
            return {
              ignore() {
                const exists = tables[name].some(
                  (existing) =>
                    conflictKey(existing, cols) === conflictKey(row, cols),
                )
                if (!exists) tables[name].push(row)
                return Promise.resolve()
              },
              merge() {
                const idx = tables[name].findIndex(
                  (existing) =>
                    conflictKey(existing, cols) === conflictKey(row, cols),
                )
                if (idx === -1) tables[name].push(row)
                else tables[name][idx] = { ...tables[name][idx], ...row }
                return Promise.resolve()
              },
            }
          },
        }
      },
      whereNotNull(column) {
        const filtered = tables[name].filter((row) => row[column] != null)
        return {
          pluck(column2) {
            return Promise.resolve(filtered.map((row) => row[column2]))
          },
        }
      },
      whereIn(column, values) {
        return {
          del() {
            tables[name] = tables[name].filter(
              (row) => !values.includes(row[column]),
            )
            return Promise.resolve()
          },
        }
      },
    }
  }

  const knex = (name) => fakeTable(name)
  knex.__tables = tables
  return knex
}

test('the migration refuses on a dirty table and writes nothing', async () => {
  const knex = makeFakeKnex({
    users: [
      { id: 300, username: 'AshKetchum', password: 'h', strategy: 'local' },
      { id: 301, username: 'ashketchum', password: 'h', strategy: 'local' },
      { id: 302, username: 'brock', password: 'h', strategy: 'local' },
    ],
  })

  await expect(migration.up(knex)).rejects.toThrow(/300.*301|301.*300/s)
  expect(knex.__tables.auth_user).toHaveLength(0)
})

test('the migration succeeds on a clean table', async () => {
  const knex = makeFakeKnex({
    users: [
      { id: 1, username: 'ash', password: 'h', strategy: 'local' },
      { id: 2, username: 'brock', password: 'h', strategy: 'local' },
    ],
  })

  await migration.up(knex)
  expect(knex.__tables.auth_user).toHaveLength(2)
  expect(knex.__tables.auth_account).toHaveLength(2)
})

test('a second run does not overwrite a password already changed in the new system', async () => {
  const knex = makeFakeKnex({
    users: [
      { id: 1, username: 'ash', password: 'legacy-hash', strategy: 'local' },
    ],
  })

  await migration.up(knex)
  const account = knex.__tables.auth_account.find(
    (a) => a.provider_id === 'credential',
  )
  // Simulate the user changing their password through Better Auth.
  account.password = 'new-hash'

  await migration.up(knex)
  const accountAfterRerun = knex.__tables.auth_account.find(
    (a) => a.provider_id === 'credential',
  )
  expect(accountAfterRerun.password).toBe('new-hash')
})

test('down() removes only the rows this migration wrote', async () => {
  const knex = makeFakeKnex({
    users: [{ id: 1, username: 'ash', password: 'h', strategy: 'local' }],
  })

  await migration.up(knex)
  // A row created afterward by real Better Auth sign-up, not the back-fill.
  knex.__tables.auth_user.push({
    id: 'native-user',
    legacy_id: null,
    username: 'newperson',
  })

  await migration.down(knex)
  expect(knex.__tables.auth_user).toEqual([
    { id: 'native-user', legacy_id: null, username: 'newperson' },
  ])
})
