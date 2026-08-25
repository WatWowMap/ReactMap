// server/test/authLocalPerms.test.ts
import { expect, test } from 'bun:test'
import { computeLocalPerms } from '../src/auth/local-perms'

test('a perm enabled and listed in alwaysEnabledPerms is granted', () => {
  const perms = computeLocalPerms({
    permsConfig: { map: { enabled: true, roles: [] } },
    alwaysEnabledPerms: ['map'],
  })
  expect(perms.map).toBe(true)
})

test("a perm enabled with 'local' in its roles is granted", () => {
  const perms = computeLocalPerms({
    permsConfig: { map: { enabled: true, roles: ['local'] } },
    alwaysEnabledPerms: [],
  })
  expect(perms.map).toBe(true)
})

test('a perm disabled in config is never granted, even if alwaysEnabled', () => {
  const perms = computeLocalPerms({
    permsConfig: { map: { enabled: false, roles: ['local'] } },
    alwaysEnabledPerms: ['map'],
  })
  expect(perms.map).toBe(false)
})

test('with no matching rule at all, a fresh install grants nothing -- still a real, non-empty object', () => {
  const perms = computeLocalPerms({
    permsConfig: {
      map: { enabled: true, roles: [] },
      pokemon: { enabled: true, roles: [] },
    },
    alwaysEnabledPerms: [],
  })
  expect(perms.map).toBe(false)
  expect(perms.pokemon).toBe(false)
  expect(perms.admin).toBe(false)
  expect(perms.trial).toBe(false)
  expect(Object.keys(perms).length).toBeGreaterThan(0)
})
