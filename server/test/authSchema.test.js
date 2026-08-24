// server/test/authSchema.test.js
const { test, expect } = require('bun:test')
const { getTableName } = require('drizzle-orm')
const {
  authUser,
  authSession,
  authAccount,
  authVerification,
} = require('../src/db/authSchema')

test('tables are auth-prefixed so they cannot collide with existing ones', () => {
  expect(getTableName(authUser)).toBe('auth_user')
  expect(getTableName(authSession)).toBe('auth_session')
  expect(getTableName(authAccount)).toBe('auth_account')
  expect(getTableName(authVerification)).toBe('auth_verification')
})

test('auth_user carries the columns better auth requires', () => {
  const columns = Object.keys(authUser)
  for (const name of [
    'id',
    'name',
    'email',
    'emailVerified',
    'image',
    'createdAt',
    'updatedAt',
  ]) {
    expect(columns).toContain(name)
  }
})

test('auth_account carries a password column for credential accounts', () => {
  expect(Object.keys(authAccount)).toContain('password')
})

test('auth_user carries username fields for the username plugin', () => {
  const columns = Object.keys(authUser)
  expect(columns).toContain('username')
  expect(columns).toContain('displayUsername')
})
