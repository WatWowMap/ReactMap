// server/src/auth/usernameAvailability.js
// @ts-check

// Better Auth's `username` plugin exposes this path unconditionally, once
// the plugin is loaded -- which it always is here, since Discord- and
// Telegram-linked accounts also carry a `username` column from the
// back-fill (server/src/auth/backfill.js).
const USERNAME_AVAILABILITY_PATH = '/api/auth/is-username-available'

/**
 * `POST /api/auth/is-username-available` is reachable unauthenticated and
 * answers truthfully for every row in `auth_user`, including every
 * Discord- and Telegram-linked account the back-fill created, not just
 * local ones. That makes the whole migrated user roster enumerable by
 * anyone willing to guess or brute-force usernames.
 *
 * The endpoint exists to give a local sign-up form live feedback. Local
 * sign-up defaults to disabled (the same `local` strategy gate
 * `buildAuthOptions` uses for `emailAndPassword.enabled`), and with no
 * sign-up form to feed there is no legitimate caller for it, so it is
 * blocked outright when local sign-up is off. An instance that has
 * deliberately turned on open registration has already accepted a public
 * username-enumeration surface as part of that -- every sign-up form on
 * the internet leaks this the same way -- so this endpoint is not adding a
 * new risk on top of that choice, only removing one where no such choice
 * was made.
 *
 * @param {{ type: string, enabled: boolean }[]} strategies
 */
function isLocalSignUpEnabled(strategies) {
  return strategies.some((s) => s.type === 'local' && s.enabled)
}

/**
 * @param {{ type: string, enabled: boolean }[]} strategies
 * @returns {import('express').RequestHandler}
 */
function createUsernameAvailabilityGate(strategies) {
  const allowed = isLocalSignUpEnabled(strategies)
  return function usernameAvailabilityGate(req, res, next) {
    if (!allowed && req.path === USERNAME_AVAILABILITY_PATH) {
      res.status(404).end()
      return
    }
    next()
  }
}

module.exports = {
  USERNAME_AVAILABILITY_PATH,
  isLocalSignUpEnabled,
  createUsernameAvailabilityGate,
}
