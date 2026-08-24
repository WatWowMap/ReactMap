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
    scope: ['identify', 'guilds'],
  })
})

test('discord requests the guilds scope, the basis of the whole perms model', () => {
  const options = buildAuthOptions(baseConfig)
  expect(options.socialProviders.discord.scope).toEqual(['identify', 'guilds'])
})

test('a configured redirectUri is passed through to the discord provider', () => {
  const withRedirect = {
    ...baseConfig,
    strategies: [
      { ...baseConfig.strategies[0], redirectUri: 'https://example.com/cb' },
    ],
  }
  expect(
    buildAuthOptions(withRedirect).socialProviders.discord.redirectURI,
  ).toBe('https://example.com/cb')
})

test('no redirectURI key is set when the strategy has none configured', () => {
  const options = buildAuthOptions(baseConfig)
  expect('redirectURI' in options.socialProviders.discord).toBe(false)
})

test('a disabled strategy is not registered', () => {
  const options = buildAuthOptions({
    ...baseConfig,
    strategies: [{ ...baseConfig.strategies[0], enabled: false }],
  })
  expect(options.socialProviders.discord).toBeUndefined()
})

test('username and password auth follows the local strategy', () => {
  const withLocal = {
    ...baseConfig,
    strategies: [
      ...baseConfig.strategies,
      { name: 'local', type: 'local', enabled: true },
    ],
  }
  expect(buildAuthOptions(withLocal).emailAndPassword.enabled).toBe(true)
  // Off by default. An instance with local auth disabled must not accept
  // sign-ups at /api/auth/sign-up/email.
  expect(buildAuthOptions(baseConfig).emailAndPassword.enabled).toBe(false)
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

test('a password over 72 bytes verifies through the configured hasher, via the bcrypt-truncation fallback', async () => {
  const { hash, verify } =
    buildAuthOptions(baseConfig).emailAndPassword.password
  const long = 'a'.repeat(100)
  const hashed = await hash(long)
  expect(await verify({ hash: hashed, password: long })).toBe(true)
  // Only the first 72 bytes are significant, matching what bcrypt itself did.
  expect(await verify({ hash: hashed, password: 'a'.repeat(72) })).toBe(false)
})

test('a malformed hash fails verification cleanly instead of throwing', async () => {
  const { verify } = buildAuthOptions(baseConfig).emailAndPassword.password
  expect(await verify({ hash: 'not-a-real-hash', password: 'reactmap' })).toBe(
    false,
  )
})

test('forwarded ip headers are ignored unless a proxy is trusted', () => {
  // Better Auth does not read Express's `trust proxy`, so without this the two
  // disagree and a forged X-Forwarded-For lands in auth_session.ip_address.
  expect(
    buildAuthOptions(baseConfig).advanced.ipAddress.ipAddressHeaders,
  ).toEqual([])
  expect(
    buildAuthOptions({ ...baseConfig, trustProxy: 1 }).advanced.ipAddress
      .ipAddressHeaders,
  ).toBeUndefined()
})

test('checkSignInGate is wired to session.create.before and can veto a session', async () => {
  const options = buildAuthOptions({
    ...baseConfig,
    checkSignInGate: async () => ({ allow: false, reason: 'blocked_guild' }),
  })
  const result = await options.databaseHooks.session.create.before(
    { userId: 'u1' },
    null,
  )
  expect(result).toBe(false)
})

test('checkSignInGate allows session creation by returning nothing', async () => {
  const options = buildAuthOptions({
    ...baseConfig,
    checkSignInGate: async () => ({ allow: true }),
  })
  const result = await options.databaseHooks.session.create.before(
    { userId: 'u1' },
    null,
  )
  expect(result).toBeUndefined()
})

test('session.create.before and .after both wire up when both are provided', async () => {
  let recomputedFor = null
  const options = buildAuthOptions({
    ...baseConfig,
    checkSignInGate: async () => ({ allow: true }),
    onSessionCreate: async (userId) => {
      recomputedFor = userId
    },
  })
  expect(
    await options.databaseHooks.session.create.before({ userId: 'u1' }, null),
  ).toBeUndefined()
  await options.databaseHooks.session.create.after({ userId: 'u1' }, null)
  expect(recomputedFor).toBe('u1')
})

test('no databaseHooks are set at all when neither hook input is provided', () => {
  const options = buildAuthOptions(baseConfig)
  expect(options.databaseHooks).toBeUndefined()
})
