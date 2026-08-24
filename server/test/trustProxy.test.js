const { test, expect } = require('bun:test')
const { resolveTrustProxy } = require('../src/middleware/trustProxy')

test('defaults to disabled, which is the safe choice when unset', () => {
  expect(resolveTrustProxy(undefined)).toBe(false)
})

test('a hop count passes through as a number', () => {
  expect(resolveTrustProxy(1)).toBe(1)
})

test('a numeric string becomes a number so config files can use either', () => {
  expect(resolveTrustProxy('2')).toBe(2)
})

test('a subnet name passes through unchanged', () => {
  expect(resolveTrustProxy('loopback')).toBe('loopback')
})

test('booleans pass through', () => {
  expect(resolveTrustProxy(true)).toBe(true)
  expect(resolveTrustProxy(false)).toBe(false)
})
