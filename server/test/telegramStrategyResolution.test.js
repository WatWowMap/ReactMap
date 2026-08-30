const assert = require('node:assert/strict')
const { test } = require('node:test')

const {
  getStrategyNameFromAuthUrl,
  getTelegramStrategy,
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

  // the regression: `some()` over all strategies reported OAuth here, so the
  // login page rendered a redirect link for a route running the hash widget
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

test('an ambiguous unrecognized url falls back to the legacy widget', () => {
  assert.equal(isTelegramOAuth('/custom/proxy/path', [LEGACY, OAUTH]), false)
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
