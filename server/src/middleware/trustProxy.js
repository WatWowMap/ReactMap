// @ts-check

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

module.exports = { resolveTrustProxy }
