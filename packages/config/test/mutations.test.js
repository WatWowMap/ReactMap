const fs = require('fs')
const path = require('path')

const { expect, test } = require('bun:test')

const ROOT = path.join(__dirname, '..', '..', '..')

// `validate-jsons.js` reads NODE_CONFIG_DIR at module load and throws without
// it. `@rm/config`'s entry sets it as a side effect, but requiring that here
// would pick up whichever `mock.module('@rm/config')` a sibling test file
// installed -- those are process-wide in bun. Setting it directly is the same
// two paths index.js sets, with no dependency on load order.
if (!process.env.NODE_CONFIG_DIR) {
  process.env.NODE_CONFIG_DIR =
    path.join(ROOT, 'config') +
    path.delimiter +
    path.join(ROOT, 'server', 'src', 'configs')
  process.env.ALLOW_CONFIG_MUTATIONS = 'true'
  process.env.SUPPRESS_NO_CONFIG_WARNING = 'true'
}

const { applyMutations } = require('../lib/mutations')

const DEFAULTS = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'config', 'default.json'), 'utf8'),
)

const read = (obj, key) =>
  key.split('.').reduce((acc, part) => (acc == null ? acc : acc[part]), obj)

/**
 * A stand-in for the `config` object `applyMutations` mutates in place, built
 * from the real `default.json` so it carries the actual schema. `util` is the
 * genuine one from the `config` package -- `extendDeep` and
 * `getConfigSources` both need to behave exactly as they do in production.
 */
const makeConfig = (overrides = {}) => {
  const cfg = structuredClone(DEFAULTS)
  Object.assign(cfg, overrides)
  cfg.util = require('config').util
  cfg.getSafe = (key) => read(cfg, key)
  cfg.has = (key) => read(cfg, key) !== undefined
  return cfg
}

test('an alias in poracle.discordRoles is expanded to the underlying role id', () => {
  const cfg = makeConfig()
  cfg.authentication.aliases = [{ name: 'supporters', role: '90210' }]
  cfg.poracle.discordRoles = ['supporters', 'already-an-id']

  applyMutations(cfg)

  expect(cfg.poracle.discordRoles).toEqual(['90210', 'already-an-id'])
})

test('poracle.telegramGroups and poracle.local get the same expansion', () => {
  const cfg = makeConfig()
  cfg.authentication.aliases = [
    { name: 'tg-alias', role: 'tg-1' },
    { name: 'local-alias', role: 'local-1' },
  ]
  cfg.poracle.telegramGroups = ['tg-alias']
  cfg.poracle.local = ['local-alias']

  applyMutations(cfg)

  expect(cfg.poracle.telegramGroups).toEqual(['tg-1'])
  expect(cfg.poracle.local).toEqual(['local-1'])
})

test('the rest of the poracle object survives the expansion', () => {
  const cfg = makeConfig()
  cfg.authentication.aliases = []
  cfg.poracle.enabled = true
  cfg.poracle.host = 'http://poracle.example'
  cfg.poracle.port = 3030

  applyMutations(cfg)

  expect(cfg.poracle.enabled).toBe(true)
  expect(cfg.poracle.host).toBe('http://poracle.example')
  expect(cfg.poracle.port).toBe(3030)
})
