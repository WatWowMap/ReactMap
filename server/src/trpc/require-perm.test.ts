import { expect, test } from 'bun:test'

import { requirePerm } from './require-perm'

test('a granted perm returns the user id', () => {
  const ctx = { user: { id: 'u1' }, session: null, perms: { alerts: true } }
  expect(requirePerm(ctx as any, 'alerts')).toBe('u1')
})

test('a signed-out visitor is UNAUTHORIZED, not FORBIDDEN', () => {
  // The two are different to a client: one is "sign in", the other is
  // "signing in will not help".
  const ctx = { user: null, session: null, perms: null }
  expect(() => requirePerm(ctx as any, 'alerts')).toThrow(/Sign in/)
})

test('a signed-in user without the perm is FORBIDDEN', () => {
  const ctx = { user: { id: 'u1' }, session: null, perms: { alerts: false } }
  expect(() => requirePerm(ctx as any, 'alerts')).toThrow(/not available/)
})

test('an absent perms object denies rather than defaulting to allowed', () => {
  // The failure mode spec 7.6 names: `perms.alerts ?? true` would be a
  // silent grant to every account whose provider forgot the key.
  const ctx = { user: { id: 'u1' }, session: null, perms: {} }
  expect(() => requirePerm(ctx as any, 'alerts')).toThrow(/not available/)
})

test('a truthy non-boolean is not a grant', () => {
  // `!== true`, not a truthiness check: a provider writing a string into the
  // perms row must not accidentally grant the capability.
  const ctx = { user: { id: 'u1' }, session: null, perms: { alerts: 'yes' } }
  expect(() => requirePerm(ctx as any, 'alerts')).toThrow(/not available/)
})
