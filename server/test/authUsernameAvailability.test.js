// server/test/authUsernameAvailability.test.js
const { test, expect } = require('bun:test')
const {
  isLocalSignUpEnabled,
  createUsernameAvailabilityGate,
  USERNAME_AVAILABILITY_PATH,
} = require('../src/auth/usernameAvailability')

test('local sign-up is disabled when no local strategy is present', () => {
  expect(isLocalSignUpEnabled([{ type: 'discord', enabled: true }])).toBe(false)
})

test('local sign-up is disabled when the local strategy is present but off', () => {
  expect(isLocalSignUpEnabled([{ type: 'local', enabled: false }])).toBe(false)
})

test('local sign-up is enabled when the local strategy is on', () => {
  expect(isLocalSignUpEnabled([{ type: 'local', enabled: true }])).toBe(true)
})

function callGate(strategies, path) {
  const gate = createUsernameAvailabilityGate(strategies)
  let nextCalled = false
  let statusCode = null
  const req = { path }
  const res = {
    status(code) {
      statusCode = code
      return this
    },
    end() {},
  }
  gate(req, res, () => {
    nextCalled = true
  })
  return { nextCalled, statusCode }
}

test('blocks the endpoint with a 404 when local sign-up is off', () => {
  const { nextCalled, statusCode } = callGate(
    [{ type: 'local', enabled: false }],
    USERNAME_AVAILABILITY_PATH,
  )
  expect(statusCode).toBe(404)
  expect(nextCalled).toBe(false)
})

test('lets the request through to better auth when local sign-up is on', () => {
  const { nextCalled, statusCode } = callGate(
    [{ type: 'local', enabled: true }],
    USERNAME_AVAILABILITY_PATH,
  )
  expect(statusCode).toBeNull()
  expect(nextCalled).toBe(true)
})

test('leaves every other path alone regardless of local sign-up', () => {
  const { nextCalled, statusCode } = callGate(
    [{ type: 'local', enabled: false }],
    '/api/auth/sign-in/username',
  )
  expect(statusCode).toBeNull()
  expect(nextCalled).toBe(true)
})
