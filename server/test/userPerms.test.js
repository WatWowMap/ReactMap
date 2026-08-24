// server/test/userPerms.test.js
const { test, expect } = require('bun:test')
const { getTableName } = require('drizzle-orm')
const { userPerms } = require('../src/db/authSchema')

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
