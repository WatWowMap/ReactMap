import { expect, test } from 'bun:test'
import {
  isAddressOrCIDR,
  resolveIpAddressStrategy,
  resolveTrustProxy,
} from '../src/middleware/trust-proxy'

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

test('isAddressOrCIDR accepts a literal address and a CIDR range', () => {
  expect(isAddressOrCIDR('10.0.0.1')).toBe(true)
  expect(isAddressOrCIDR('10.0.0.0/8')).toBe(true)
  expect(isAddressOrCIDR('::1')).toBe(true)
  expect(isAddressOrCIDR('2001:db8::/32')).toBe(true)
})

test('isAddressOrCIDR rejects a named Express preset and garbage', () => {
  expect(isAddressOrCIDR('loopback')).toBe(false)
  expect(isAddressOrCIDR('linklocal')).toBe(false)
  expect(isAddressOrCIDR('uniquelocal')).toBe(false)
  expect(isAddressOrCIDR('not-an-ip')).toBe(false)
  expect(isAddressOrCIDR('10.0.0.0/not-a-prefix')).toBe(false)
})

test('resolveIpAddressStrategy: true is fully permissive, matching Express trust proxy: true', () => {
  expect(resolveIpAddressStrategy(true)).toEqual({ mode: 'permissive' })
})

test('resolveIpAddressStrategy: an address or CIDR passes through as trustedProxies', () => {
  expect(resolveIpAddressStrategy('10.0.0.0/8')).toEqual({
    mode: 'trustedProxies',
    trustedProxies: ['10.0.0.0/8'],
  })
})

test('resolveIpAddressStrategy: a comma-separated allowlist passes through as trustedProxies', () => {
  expect(resolveIpAddressStrategy('10.0.0.0/8, 172.16.0.5')).toEqual({
    mode: 'trustedProxies',
    trustedProxies: ['10.0.0.0/8', '172.16.0.5'],
  })
})

test('resolveIpAddressStrategy: false, a hop count, and a named preset all fall back to the socket', () => {
  expect(resolveIpAddressStrategy(false)).toEqual({ mode: 'socket' })
  expect(resolveIpAddressStrategy(1)).toEqual({ mode: 'socket' })
  expect(resolveIpAddressStrategy('loopback')).toEqual({ mode: 'socket' })
})
