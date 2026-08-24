// @ts-check
const net = require('net')

/**
 * Normalises the configured `api.trustProxy` value into what Express expects.
 *
 * Defaults to false. Trusting a forwarded header that nothing sets lets a
 * client claim any address it likes, so the safe default is off and turning it
 * on is a deliberate act by whoever knows the deployment.
 *
 * @param {unknown} value
 * @returns {boolean | number | string}
 */
function resolveTrustProxy(value) {
  if (value === undefined || value === null) return false
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const asNumber = Number(value)
    return Number.isInteger(asNumber) && value.trim() !== '' ? asNumber : value
  }
  return false
}

/**
 * Whether a single entry is a literal IP address or an `address/prefix` CIDR
 * range -- the only shapes `@better-auth/core`'s `advanced.ipAddress.trustedProxies`
 * understands. Named Express presets (`loopback`, `linklocal`, `uniquelocal`)
 * fail this, which is deliberate: passing one through anyway would not raise
 * an error, it would just be silently dropped by Better Auth's own
 * validation, leaving `trustedProxies` empty and every single-valued
 * forwarded header trusted unconditionally -- the exact bug this reconciles.
 *
 * @param {string} entry
 */
function isAddressOrCIDR(entry) {
  const slash = entry.lastIndexOf('/')
  const address = slash === -1 ? entry : entry.slice(0, slash)
  if (net.isIP(address) === 0) return false
  if (slash === -1) return true
  return /^\d+$/.test(entry.slice(slash + 1))
}

/**
 * Decides how Better Auth's `advanced.ipAddress` should treat forwarded
 * headers for a given (already Express-resolved) trust proxy value, so the
 * two layers agree about which `X-Forwarded-For` entries are trustworthy.
 *
 * - `true`: every hop is trusted, matching Express's own `trust proxy: true`.
 * - a literal address or CIDR range (or comma-separated list of them, the
 *   same shape Express itself accepts as a string): passed through as
 *   `trustedProxies`, so both layers strip the same trusted hops.
 * - anything else -- `false`, a hop count, or a named Express preset --
 *   cannot be expressed as an address allowlist. Express computes a real
 *   client IP for these from information Better Auth does not have (a
 *   preset subnet table, or a hop count with no fixed addresses), so headers
 *   are not consulted at all rather than either layer guessing.
 *
 * @param {boolean | number | string} expressTrustProxy
 * @returns {{ mode: 'permissive' } | { mode: 'trustedProxies', trustedProxies: string[] } | { mode: 'socket' }}
 */
function resolveIpAddressStrategy(expressTrustProxy) {
  if (expressTrustProxy === true) return { mode: 'permissive' }
  if (typeof expressTrustProxy === 'string') {
    const entries = expressTrustProxy.split(',').map((entry) => entry.trim())
    if (entries.length > 0 && entries.every(isAddressOrCIDR)) {
      return { mode: 'trustedProxies', trustedProxies: entries }
    }
  }
  return { mode: 'socket' }
}

module.exports = {
  resolveTrustProxy,
  resolveIpAddressStrategy,
  isAddressOrCIDR,
}
