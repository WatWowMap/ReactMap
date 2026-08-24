// server/test/authMount.test.js
const { test, expect } = require('bun:test')
const { buildAuthRoutePrefix, isAuthRequest } = require('../src/auth')

test('better auth owns its own prefix', () => {
  expect(buildAuthRoutePrefix()).toBe('/api/auth')
})

test('auth requests are recognised by prefix', () => {
  expect(isAuthRequest('/api/auth/sign-in/username')).toBe(true)
  expect(isAuthRequest('/api/auth')).toBe(true)
})

test('existing passport routes are not captured', () => {
  expect(isAuthRequest('/auth/discord/callback')).toBe(false)
  expect(isAuthRequest('/api/settings')).toBe(false)
  expect(isAuthRequest('/graphql')).toBe(false)
})
