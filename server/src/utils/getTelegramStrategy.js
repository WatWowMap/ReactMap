// @ts-check

/**
 * The client renders a single Telegram login control per domain, pointed at
 * `map.customRoutes.telegramAuthUrl`. Which flow that control has to use - the
 * OAuth/OIDC redirect or the legacy hash signed widget - is a property of the
 * one strategy sitting behind that route, not of the strategy list as a whole,
 * since a config can enable several Telegram strategies at once and a
 * multiDomain setup can point each domain at a different one.
 *
 * @param {string} authUrl the configured `telegramAuthUrl`
 * @returns {string | null} the strategy name the route resolves to
 */
function getStrategyNameFromAuthUrl(authUrl) {
  if (!authUrl) return null
  // Tolerate absolute URLs, the config allows either form
  const pathname = authUrl.startsWith('http')
    ? URL.canParse(authUrl)
      ? new URL(authUrl).pathname
      : ''
    : authUrl
  const segments = pathname.split('/').filter(Boolean)
  const authIndex = segments.lastIndexOf('auth')
  // `/auth/<name>` and `/auth/<name>/callback` are the two shapes authRouter
  // registers, so the name is always the segment right after `auth`
  return authIndex === -1 ? null : (segments[authIndex + 1] ?? null)
}

/**
 * Resolves the Telegram strategy that a login control points at.
 *
 * @param {string} authUrl the configured `telegramAuthUrl`
 * @param {import('@rm/types').StrategyConfig[]} strategies
 * @returns {import('@rm/types').StrategyConfig | null}
 */
function getTelegramStrategy(authUrl, strategies) {
  const enabled = strategies.filter((s) => s.enabled && s.type === 'telegram')
  if (!enabled.length) return null

  const name = getStrategyNameFromAuthUrl(authUrl)
  const byName = name ? enabled.find((s) => s.name === name) : undefined
  if (byName) return byName

  // A custom or proxied auth URL will not resolve by name. With only one
  // Telegram strategy there is no ambiguity, so use it - otherwise there is no
  // way to tell which one the route means, and the legacy widget is the safer
  // guess since it is what every pre-OAuth config already runs.
  return enabled.length === 1 ? enabled[0] : null
}

/**
 * Whether the Telegram strategy behind a login control runs the OAuth/OIDC
 * flow. Anything else falls back to the legacy hash signed widget.
 *
 * @param {string} authUrl the configured `telegramAuthUrl`
 * @param {import('@rm/types').StrategyConfig[]} strategies
 * @returns {boolean}
 */
function isTelegramOAuth(authUrl, strategies) {
  const strategy = getTelegramStrategy(authUrl, strategies)
  return !!(strategy?.clientId && strategy?.clientSecret)
}

module.exports = {
  getStrategyNameFromAuthUrl,
  getTelegramStrategy,
  isTelegramOAuth,
}
