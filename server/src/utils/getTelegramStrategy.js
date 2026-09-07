// @ts-check

/**
 * authRouter mounts `/<name>` and `/<name>/callback` under `/auth`, so the name
 * is matched from the end of the path. Scanning forward for `auth` instead
 * would misread a strategy that is itself named `auth`, and scanning backward
 * for it would misread one named `callback`.
 *
 * @param {string} authUrl the configured `telegramAuthUrl`
 * @returns {string | null} the strategy name the route resolves to
 */
function getStrategyNameFromAuthUrl(authUrl) {
  if (!authUrl) return null
  // The url may be absolute or relative and may carry a query string or hash.
  // Express routes on the pathname alone, so match on the pathname too.
  if (!URL.canParse(authUrl, 'http://localhost')) return null
  const { pathname } = new URL(authUrl, 'http://localhost')
  const segments = pathname.split('/').filter(Boolean)
  if (segments.at(-1) === 'callback' && segments.at(-3) === 'auth') {
    return segments.at(-2)
  }
  return segments.at(-2) === 'auth' ? segments.at(-1) : null
}

/**
 * @param {import('@rm/types').StrategyConfig[]} strategies
 * @returns {import('@rm/types').StrategyConfig[]}
 */
function getEnabledTelegramStrategies(strategies) {
  return (strategies ?? []).filter((s) => s.enabled && s.type === 'telegram')
}

/**
 * Resolves the Telegram strategy that a login control points at. A config can
 * enable several Telegram strategies at once, and a multiDomain setup can point
 * each domain at a different one.
 *
 * @param {string} authUrl the configured `telegramAuthUrl`
 * @param {import('@rm/types').StrategyConfig[]} strategies
 * @returns {import('@rm/types').StrategyConfig | null}
 */
function getTelegramStrategy(authUrl, strategies) {
  const enabled = getEnabledTelegramStrategies(strategies)
  if (!enabled.length) return null

  const name = getStrategyNameFromAuthUrl(authUrl)
  const byName = name ? enabled.find((s) => s.name === name) : undefined
  if (byName) return byName

  // A custom or proxied url will not resolve by name. One strategy is
  // unambiguous; beyond that there is no way to tell which one the route means.
  return enabled.length === 1 ? enabled[0] : null
}

/**
 * Whether a strategy is configured to run the OAuth/OIDC flow. All three values
 * are needed: Telegram rejects the authorization request without a
 * `redirect_uri`, and `redirectUri` is not inherited from `default.json` when a
 * config declares its own `strategies`, since node-config replaces arrays
 * rather than merging them.
 *
 * Both `TelegramClient` and the login control branch on this, so they cannot
 * disagree about which flow a route is running.
 *
 * @param {import('@rm/types').StrategyConfig} strategy
 * @returns {boolean}
 */
function isOAuthStrategy(strategy) {
  return !!(
    strategy?.clientId &&
    strategy?.clientSecret &&
    strategy?.redirectUri
  )
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
  if (strategy) return isOAuthStrategy(strategy)

  // The url did not resolve to a name, but there is only something to
  // disambiguate when the candidates disagree. An OAuth only config has no
  // reason to set `telegramBotName`, so falling back to the widget there would
  // leave it with no usable login control.
  const enabled = getEnabledTelegramStrategies(strategies)
  return enabled.length > 0 && enabled.every(isOAuthStrategy)
}

/**
 * Custom login page blocks carry their own `telegramAuthUrl`, which can point at
 * a different strategy than the domain's `customRoutes` default, so each block
 * has its flow resolved from its own route.
 *
 * @param {import("@rm/types").CustomComponent[]} components
 * @param {import('@rm/types').StrategyConfig[]} strategies
 * @returns {import("@rm/types").CustomComponent[]}
 */
function annotateTelegramBlocks(components, strategies) {
  return (Array.isArray(components) ? components : []).map((component) => {
    if ('components' in component && Array.isArray(component.components)) {
      return {
        ...component,
        components: annotateTelegramBlocks(component.components, strategies),
      }
    }
    return component.type === 'telegram'
      ? {
          ...component,
          telegramOAuth: isTelegramOAuth(component.telegramAuthUrl, strategies),
        }
      : component
  })
}

module.exports = {
  annotateTelegramBlocks,
  getStrategyNameFromAuthUrl,
  getTelegramStrategy,
  isOAuthStrategy,
  isTelegramOAuth,
}
