// server/test/authInstance.test.js
const { test, expect } = require('bun:test')
const { buildAuthOptions } = require('../src/auth')

const baseConfig = {
  strategies: [
    {
      name: 'discord',
      type: 'discord',
      clientId: 'cid',
      clientSecret: 'secret',
      enabled: true,
    },
  ],
  sessionSecret: 'x'.repeat(32),
  baseURL: 'http://localhost:8080',
}

test('discord is registered as a social provider when enabled', () => {
  const options = buildAuthOptions(baseConfig)
  expect(options.socialProviders.discord).toEqual({
    clientId: 'cid',
    clientSecret: 'secret',
  })
})

test('a disabled strategy is not registered', () => {
  const options = buildAuthOptions({
    ...baseConfig,
    strategies: [{ ...baseConfig.strategies[0], enabled: false }],
  })
  expect(options.socialProviders.discord).toBeUndefined()
})

test('username and password auth is enabled', () => {
  const options = buildAuthOptions(baseConfig)
  expect(options.emailAndPassword.enabled).toBe(true)
})

test('the auth tables are the prefixed ones, not the existing users table', () => {
  const options = buildAuthOptions(baseConfig)
  expect(options.user.modelName).toBe('auth_user')
  expect(options.session.modelName).toBe('auth_session')
})

test('the base url comes straight from config', () => {
  expect(buildAuthOptions(baseConfig).baseURL).toBe('http://localhost:8080')
})

test('passwords hash as bcrypt, so existing hashes keep verifying', async () => {
  const { hash, verify } =
    buildAuthOptions(baseConfig).emailAndPassword.password
  const hashed = await hash('reactmap')
  expect(hashed.startsWith('$2b$')).toBe(true)
  expect(await verify({ hash: hashed, password: 'reactmap' })).toBe(true)
  expect(await verify({ hash: hashed, password: 'wrong' })).toBe(false)
})
