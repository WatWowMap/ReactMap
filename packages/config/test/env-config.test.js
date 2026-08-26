const fs = require('fs')
const path = require('path')

const { expect, test } = require('bun:test')

const ROOT = path.join(__dirname, '..', '..', '..')

const readJson = (name) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, 'config', name), 'utf8'))

const DEFAULTS = readJson('default.json')
const ENV_MAP = readJson('custom-environment-variables.json')

/**
 * Every leaf path in a config tree, dotted.
 *
 * A leaf in `default.json` is a scalar or an array; a leaf in
 * `custom-environment-variables.json` is either a string (the variable name)
 * or the `{ __name, __format }` object the `config` package reads a non-string
 * from. `gen-env-config.js` maps one onto the other, so the two sets of leaf
 * paths are the same set when the generated file is up to date.
 */
const leafPaths = (node, prefix = '') => {
  if (node === null || typeof node !== 'object' || Array.isArray(node)) {
    return [prefix]
  }
  if (typeof node.__name === 'string') return [prefix]
  return Object.entries(node).flatMap(([key, value]) =>
    leafPaths(value, prefix ? `${prefix}.${key}` : key),
  )
}

/**
 * `custom-environment-variables.json` is generated from `default.json`
 * (`gen-env-config.js`), and nothing regenerates it on a config change. An
 * operator who configures this deployment entirely through the environment
 * gets exactly the keys this file names -- a setting missing from it cannot be
 * set at all, and there is no error saying so, just a default that never
 * moves. That is how the whole `poracle` block went unmappable while the
 * Alerts tab was being built.
 */
test('every setting in default.json can be set from the environment', () => {
  const missing = leafPaths(DEFAULTS).filter(
    (leaf) => !leafPaths(ENV_MAP).includes(leaf),
  )
  expect(missing).toEqual([])
})

test('no environment variable maps to a setting that no longer exists', () => {
  // The other direction, and the one that leaves a lie behind: `webhooks` was
  // removed from `default.json` and its mapping stayed, so `WEBHOOKS` read
  // like a supported variable and set nothing.
  const dead = leafPaths(ENV_MAP).filter(
    (leaf) => !leafPaths(DEFAULTS).includes(leaf),
  )
  expect(dead).toEqual([])
})
