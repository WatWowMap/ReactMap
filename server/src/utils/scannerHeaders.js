// @ts-check

/**
 * Request headers for a Golbat HTTP call: JSON content negotiation plus the
 * optional API secret and HTTP basic auth a source is configured with. Shared
 * by the scanner query evaluator and the capability discovery service so both
 * authenticate the same way.
 * @param {string} [secret]
 * @param {{ username: string, password: string } | null} [httpAuth]
 * @returns {Record<string, string>}
 */
function buildScannerHeaders(secret = '', httpAuth = null) {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(secret ? { 'X-Golbat-Secret': secret } : {}),
    ...(httpAuth
      ? {
          Authorization: `Basic ${Buffer.from(
            `${httpAuth.username}:${httpAuth.password}`,
          ).toString('base64')}`,
        }
      : {}),
  }
}

module.exports = { buildScannerHeaders }
