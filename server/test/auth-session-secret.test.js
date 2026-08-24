// server/test/authSessionSecret.test.js
const { test, expect } = require('bun:test')
const { assertSessionSecret } = require('../src/auth')

test('throws on an empty secret', () => {
  expect(() => assertSessionSecret('')).toThrow()
})

test('throws on the old shipped default, which was 31 characters', () => {
  expect(() => assertSessionSecret('98ki^e72~!@#(85o3kXLI*#c9wu5l!Z')).toThrow()
})

test('throws on any secret under the 32-character minimum', () => {
  expect(() => assertSessionSecret('x'.repeat(31))).toThrow()
})

test('does not throw at exactly 32 characters', () => {
  expect(() => assertSessionSecret('x'.repeat(32))).not.toThrow()
})

test('does not throw on a longer secret', () => {
  expect(() => assertSessionSecret('x'.repeat(64))).not.toThrow()
})
