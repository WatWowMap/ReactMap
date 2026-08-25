// server/test/userPerms.test.ts
import { expect, test } from 'bun:test'
import { getTableName } from 'drizzle-orm'
import { userPerms } from '../src/db/auth-schema'

test('perms live in their own table', () => {
  expect(getTableName(userPerms)).toBe('user_perms')
})

test('perms are keyed by user and provider, not by strategy', () => {
  const columns = Object.keys(userPerms)
  expect(columns).toContain('userId')
  expect(columns).toContain('providerId')
  expect(columns).toContain('perms')
  expect(columns).not.toContain('strategy')
})
