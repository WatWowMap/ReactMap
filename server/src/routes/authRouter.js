// @ts-check
const authRouter = require('express').Router()

const { log, TAGS } = require('@rm/logger')
const { getAuth, buildAuthRoutePrefix } = require('../auth')

// Passport used to own this router: a `/:strategy` and `/:strategy/callback`
// pair per enabled strategy, registered by `loadAuthStrategies` below. Better
// Auth now serves sign-in for every strategy directly under `/api/auth/*`
// (mounted in `server/src/index.js`), so the only piece of this router still
// worth keeping is logout.
authRouter.get('/logout', async (req, res) => {
  try {
    await getAuth().api.signOut({ headers: req.headers })
  } catch (err) {
    log.error(TAGS.auth, 'Unable to logout', err)
  }
  res.redirect('/')
})

// Operators have `/auth/:provider/callback` registered with their OAuth
// application, because that is what `config/default.json` ships and what
// passport served. Better Auth serves `/api/auth/callback/:provider`
// instead, so Discord (or any other provider) is told to redirect somewhere
// nothing handles unless this bridges the two. The query string carries the
// OAuth `code` and `state`, so it has to survive the redirect intact -- an
// operator upgrading should not have to touch their Discord application or
// their config.
authRouter.get('/:provider/callback', (req, res) => {
  const queryIndex = req.url.indexOf('?')
  const queryString = queryIndex === -1 ? '' : req.url.slice(queryIndex)
  res.redirect(
    `${buildAuthRoutePrefix()}/callback/${req.params.provider}${queryString}`,
  )
})

/**
 * Better Auth builds its options once and caches the instance (`getAuth` in
 * `server/src/auth/index.js`), unlike passport's per-strategy registration
 * which `reloadConfig.js` re-ran whenever `authentication.strategies`
 * changed. There is no live-reload path for the Better Auth instance yet, so
 * this is kept as a no-op purely so that caller does not have to change.
 * Picking up a strategy change still requires a restart.
 */
const loadAuthStrategies = () => {
  log.debug(
    TAGS.auth,
    'Strategy configuration changed; restart the server to pick it up.',
  )
}

module.exports = { loadAuthStrategies, authRouter }
