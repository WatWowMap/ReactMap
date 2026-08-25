// server/test/authSchema.test.ts
import { expect, test } from 'bun:test'
import { getTableName } from 'drizzle-orm'
import {
  authAccount,
  authSession,
  authUser,
  authVerification,
} from '../src/db/auth-schema'

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

test('auth_account carries the issuer column better auth 1.7 requires', () => {
  // Without it every sign-up throws after the user row is already written.
  expect(Object.keys(authAccount)).toContain('issuer')
})

test('auth_user carries username fields for the username plugin', () => {
  const columns = Object.keys(authUser)
  expect(columns).toContain('username')
  expect(columns).toContain('displayUsername')
})

test('auth_user carries a legacy_id join key back to the legacy users row', () => {
  expect(Object.keys(authUser)).toContain('legacyId')
})
