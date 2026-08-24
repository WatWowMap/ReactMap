// @ts-check
const assert = require('node:assert/strict')
const { test } = require('bun:test')

const plugins = require('../lib/index.js')

test('barrel no longer exports customFilePlugin', () => {
  assert.equal('customFilePlugin' in plugins, false)
})
