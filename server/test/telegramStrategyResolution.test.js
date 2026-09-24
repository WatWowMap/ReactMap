const assert = require('node:assert/strict')
const { test } = require('node:test')

const {
  annotateTelegramBlocks,
  getStrategyNameFromAuthUrl,
  getTelegramStrategy,
  isOAuthStrategy,
  isTelegramOAuth,
} = require('../src/utils/getTelegramStrategy')

/** @param {object} overrides */
const telegram = (overrides) => ({
  name: 'telegram',
  type: 'telegram',
  enabled: true,
  botToken: '1:A',
  clientId: '',
  clientSecret: '',
  ...overrides,
})

const LEGACY = telegram({ name: 'telegram' })
const OAUTH = telegram({
  name: 'telegram-oauth',
  clientId: '123',
  clientSecret: 'shh',
  redirectUri: 'https://map.example/auth/telegram-oauth/callback',
})

test('resolves the strategy name from both route shapes', () => {
  assert.equal(
    getStrategyNameFromAuthUrl('/auth/telegram/callback'),
    'telegram',
  )
  assert.equal(getStrategyNameFromAuthUrl('/auth/telegram'), 'telegram')
  assert.equal(
    getStrategyNameFromAuthUrl('https://map.example/auth/tg-two/callback'),
    'tg-two',
  )
  assert.equal(getStrategyNameFromAuthUrl(''), null)
  assert.equal(getStrategyNameFromAuthUrl('/login'), null)
  assert.equal(getStrategyNameFromAuthUrl('http://['), null)
})

test('ignores a query string or hash on the auth url', () => {
  // express routes `/auth/tg?source=login` to the `tg` strategy
  assert.equal(getStrategyNameFromAuthUrl('/auth/tg?source=login'), 'tg')
  assert.equal(
    getStrategyNameFromAuthUrl('/auth/tg/callback?source=login'),
    'tg',
  )
  assert.equal(getStrategyNameFromAuthUrl('/auth/tg#anchor'), 'tg')
  assert.equal(
    getStrategyNameFromAuthUrl('https://map.example/auth/tg?a=1'),
    'tg',
  )
  assert.equal(getStrategyNameFromAuthUrl('auth/tg/callback'), 'tg')

  const tg = telegram({
    name: 'tg',
    clientId: '123',
    clientSecret: 'shh',
    redirectUri: 'https://map.example/auth/tg/callback',
  })
  assert.equal(isTelegramOAuth('/auth/tg?source=login', [tg, LEGACY]), true)
})

test('resolves a strategy whose name collides with the route shape', () => {
  const named = (name) =>
    telegram({
      name,
      clientId: '123',
      clientSecret: 'shh',
      redirectUri: `https://map.example/auth/${name}/callback`,
    })

  assert.equal(getStrategyNameFromAuthUrl('/auth/auth/callback'), 'auth')
  assert.equal(getStrategyNameFromAuthUrl('/auth/auth'), 'auth')
  assert.equal(
    getStrategyNameFromAuthUrl('/auth/callback/callback'),
    'callback',
  )
  assert.equal(getStrategyNameFromAuthUrl('/auth/callback'), 'callback')
  // a proxy prefix still resolves, the name is matched from the end
  assert.equal(getStrategyNameFromAuthUrl('/reactmap/auth/tg/callback'), 'tg')

  // mixed with a legacy strategy, so the flow cannot be inferred and has to
  // come from the name the route actually resolves to
  assert.equal(
    isTelegramOAuth('/auth/auth/callback', [named('auth'), LEGACY]),
    true,
  )
  assert.equal(
    isTelegramOAuth('/auth/callback/callback', [named('callback'), LEGACY]),
    true,
  )
  assert.equal(
    isTelegramOAuth('/auth/telegram/callback', [named('auth'), LEGACY]),
    false,
  )
})

test('picks the strategy the auth url points at, not just any telegram one', () => {
  const strategies = [LEGACY, OAUTH]

  assert.equal(
    getTelegramStrategy('/auth/telegram/callback', strategies).name,
    'telegram',
  )
  assert.equal(
    getTelegramStrategy('/auth/telegram-oauth/callback', strategies).name,
    'telegram-oauth',
  )
})

test('a second OAuth strategy does not flip the legacy route to OAuth', () => {
  const strategies = [LEGACY, OAUTH]

  assert.equal(isTelegramOAuth('/auth/telegram/callback', strategies), false)
  assert.equal(
    isTelegramOAuth('/auth/telegram-oauth/callback', strategies),
    true,
  )
})

test('a single telegram strategy resolves even from an unrecognized url', () => {
  assert.equal(isTelegramOAuth('/custom/proxy/path', [OAUTH]), true)
  assert.equal(isTelegramOAuth('/custom/proxy/path', [LEGACY]), false)
})

test('an unrecognized url falls back to the legacy widget only when the strategies disagree', () => {
  const secondOAuth = telegram({
    name: 'telegram-oauth-two',
    clientId: '456',
    clientSecret: 'shh',
    redirectUri: 'https://map.example/auth/telegram-oauth-two/callback',
  })

  // mixed, so there is no way to tell which flow the route means
  assert.equal(isTelegramOAuth('/custom/proxy/path', [LEGACY, OAUTH]), false)
  // all OAuth, so the route is unambiguous even though the name did not resolve
  assert.equal(
    isTelegramOAuth('/custom/proxy/path', [OAUTH, secondOAuth]),
    true,
  )
  assert.equal(
    isTelegramOAuth('/custom/proxy/path', [LEGACY, { ...LEGACY, name: 'two' }]),
    false,
  )
  // still no telegram strategy at all
  assert.equal(isTelegramOAuth('/custom/proxy/path', []), false)
})

test('disabled strategies are ignored', () => {
  const disabledOAuth = { ...OAUTH, name: 'telegram', enabled: false }

  assert.equal(
    getTelegramStrategy('/auth/telegram/callback', [disabledOAuth]),
    null,
  )
  assert.equal(
    isTelegramOAuth('/auth/telegram/callback', [disabledOAuth]),
    false,
  )
  assert.equal(isTelegramOAuth('/auth/telegram/callback', []), false)
})

test('half configured credentials stay on the legacy widget', () => {
  const idOnly = telegram({ clientId: '123' })
  const secretOnly = telegram({ clientSecret: 'shh' })

  assert.equal(isTelegramOAuth('/auth/telegram/callback', [idOnly]), false)
  assert.equal(isTelegramOAuth('/auth/telegram/callback', [secretOnly]), false)
})

test('credentials without a redirectUri stay on the legacy widget', () => {
  // node-config replaces arrays rather than merging them, so a config that
  // declares its own `strategies` does not inherit the `redirectUri` default
  const noRedirect = telegram({ clientId: '123', clientSecret: 'shh' })

  assert.equal(isOAuthStrategy(noRedirect), false)
  assert.equal(isTelegramOAuth('/auth/telegram/callback', [noRedirect]), false)
  assert.equal(isOAuthStrategy(OAUTH), true)
  assert.equal(isOAuthStrategy(LEGACY), false)
  assert.equal(isOAuthStrategy(null), false)
})

test('non telegram strategies never match', () => {
  const discord = {
    name: 'discord',
    type: 'discord',
    enabled: true,
    clientId: '123',
    clientSecret: 'shh',
  }

  assert.equal(getTelegramStrategy('/auth/discord/callback', [discord]), null)
  assert.equal(isTelegramOAuth('/auth/discord/callback', [discord]), false)
})

test('annotates custom login page blocks from their own auth url', () => {
  const strategies = [LEGACY, OAUTH]
  // the shape a loginPage config actually has
  const blocks = [
    {
      type: 'telegram',
      gridSizes: { sm: 6 },
      telegramBotName: 'CandyMapBot',
      telegramAuthUrl: '/auth/telegram/callback',
      gridStyle: { marginTop: 20, textDecoration: 'none' },
    },
    {
      type: 'telegram',
      telegramBotName: 'CandyMapBot',
      telegramAuthUrl: '/auth/telegram-oauth/callback',
    },
    { type: 'discord', link: '/auth/discord/callback' },
  ]

  const [legacyBlock, oauthBlock, discordBlock] = annotateTelegramBlocks(
    blocks,
    strategies,
  )

  assert.equal(legacyBlock.telegramOAuth, false)
  assert.equal(oauthBlock.telegramOAuth, true)
  assert.equal('telegramOAuth' in discordBlock, false)
  // every other key on the block survives untouched
  assert.deepEqual(legacyBlock.gridSizes, { sm: 6 })
  assert.equal(legacyBlock.telegramBotName, 'CandyMapBot')
  assert.deepEqual(legacyBlock.gridStyle, {
    marginTop: 20,
    textDecoration: 'none',
  })
})

test('annotates telegram blocks nested inside parent blocks', () => {
  const annotated = annotateTelegramBlocks(
    [
      {
        type: 'parent',
        components: [
          { type: 'telegram', telegramAuthUrl: '/auth/telegram/callback' },
          {
            type: 'parent',
            components: [
              {
                type: 'telegram',
                telegramAuthUrl: '/auth/telegram-oauth/callback',
              },
            ],
          },
        ],
      },
    ],
    [LEGACY, OAUTH],
  )

  assert.equal(annotated[0].components[0].telegramOAuth, false)
  assert.equal(annotated[0].components[1].components[0].telegramOAuth, true)
})

test('annotating does not mutate the config objects it is given', () => {
  const block = {
    type: 'telegram',
    telegramAuthUrl: '/auth/telegram-oauth/callback',
  }
  const blocks = [block]

  annotateTelegramBlocks(blocks, [LEGACY, OAUTH])

  assert.equal('telegramOAuth' in block, false)
  assert.equal(blocks[0], block)
})

test('annotating tolerates a missing or empty component list', () => {
  assert.deepEqual(annotateTelegramBlocks(undefined, [OAUTH]), [])
  assert.deepEqual(annotateTelegramBlocks([], [OAUTH]), [])
})
