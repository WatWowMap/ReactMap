// server/test/backfill-auth-users.test.js
//
// Unit coverage for the parts of server/src/scripts/backfill-auth-users.js
// that do not require a database connection. The collision predicate
// itself (server/src/auth/backfill.js's detectUsernameCollisions) has to
// talk to MySQL to match the utf8mb4_unicode_ci collation auth_user.username
// enforces, so it is exercised against a real database as part of this
// task's manual verification, not here -- see the task report.
const { test, expect } = require('bun:test')
const { isIdempotentConflict } = require('../src/scripts/backfill-auth-users')

function dupEntryError(sqlMessage) {
  const error = new Error(sqlMessage)
  error.code = 'ER_DUP_ENTRY'
  error.sqlMessage = sqlMessage
  return error
}

test('a duplicate on auth_user.PRIMARY is an idempotent re-run, not a failure', () => {
  const error = dupEntryError(
    "Duplicate entry 'abc123' for key 'auth_user.PRIMARY'",
  )
  expect(isIdempotentConflict('auth_user', error)).toBe(true)
})

test("a duplicate on auth_account's issuer/account_id key is idempotent", () => {
  const error = dupEntryError(
    "Duplicate entry 'local:oauth:discord-99' for key 'auth_account.auth_account_issuer_account_uidx'",
  )
  expect(isIdempotentConflict('auth_account', error)).toBe(true)
})

test("a duplicate on user_perms's user/provider key is idempotent", () => {
  const error = dupEntryError(
    "Duplicate entry 'x-discord' for key 'user_perms.user_perms_user_provider_uidx'",
  )
  expect(isIdempotentConflict('user_perms', error)).toBe(true)
})

test('a duplicate on a different key (e.g. auth_user.username) is not swallowed', () => {
  // This is the exact shape of the bug that dropped legacy user 9104: a
  // username collision the JS predicate could not see slipped past the
  // collision check, and INSERT IGNORE swallowed the resulting unique
  // violation because it does not care which key it was.
  const error = dupEntryError(
    "Duplicate entry 'jose' for key 'auth_user.username'",
  )
  expect(isIdempotentConflict('auth_user', error)).toBe(false)
})

test('a foreign key violation is never treated as idempotent', () => {
  const error = new Error('Cannot add or update a child row')
  error.code = 'ER_NO_REFERENCED_ROW_2'
  expect(isIdempotentConflict('auth_account', error)).toBe(false)
})

test('an unrelated error is never treated as idempotent', () => {
  expect(isIdempotentConflict('auth_user', new Error('connection reset'))).toBe(
    false,
  )
})
