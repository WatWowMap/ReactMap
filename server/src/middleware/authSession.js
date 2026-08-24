// @ts-check
const { eq } = require('drizzle-orm')

const { log, TAGS } = require('@rm/logger')

/**
 * Folds the per-provider perms rows into the single object the app expects.
 * A true from any provider wins, which matches how a linked account behaves
 * today: linking never removes an ability the person already had.
 *
 * @param {{ providerId: string, perms: Record<string, boolean> }[]} rows
 */
function mergePerms(rows) {
  /** @type {Record<string, any>} */
  const merged = {}
  for (const row of rows) {
    for (const [key, value] of Object.entries(row.perms || {})) {
      merged[key] = merged[key] || value
    }
  }
  return merged
}

/**
 * Supplies `req.user` and `req.session.perms` from better auth. Dependencies
 * are injected so the branching can be tested without a database or a live
 * auth instance.
 *
 * @param {{ getSession: (headers: any) => Promise<any>, getPerms: (userId: string) => Promise<any[]> }} deps
 */
function authSessionMiddleware(deps) {
  return async function middleware(req, _res, next) {
    // express-session used to guarantee `req.session`, including a `.save()`
    // that flushed it to a store. Better Auth rebuilds the equivalent state
    // from the database on every request instead, so there is nothing to
    // flush; `save` is kept as a no-op purely so the many call sites written
    // against the express-session API (rootRouter.js, graphql/resolvers.js)
    // do not have to change. This must run for every request, logged in or
    // not, since those call sites read `req.session` unconditionally.
    req.session = req.session || {}
    if (typeof req.session.save !== 'function') {
      req.session.save = () => {}
    }
    try {
      const session = await deps.getSession(req.headers)
      if (session?.user) {
        const perms = mergePerms(await deps.getPerms(session.user.id))
        // Perms go on BOTH. 41 sites in server/src read `user.perms` against 8
        // that read `session.perms`. Populating only the session copy leaves
        // every authenticated request throwing on `perms[...]` of undefined,
        // for example clientOptions.js:333.
        req.user = { ...session.user, perms }
        req.session.perms = perms
      }
    } catch (e) {
      // A failure here must not take the request down: this is the only auth
      // source now, so a lookup failure means the request continues as
      // anonymous rather than losing an authentication another system had
      // already granted.
      log.warn(TAGS.auth, 'better auth session lookup failed', e)
    }
    next()
  }
}

/** Wires the middleware to the real auth instance and database. */
function createAuthSessionMiddleware() {
  const { getAuth } = require('../auth')
  const { getDrizzle } = require('../db/drizzle')
  const { userPerms } = require('../db/authSchema')

  return authSessionMiddleware({
    getSession: (headers) => getAuth().api.getSession({ headers }),
    getPerms: (userId) =>
      getDrizzle().select().from(userPerms).where(eq(userPerms.userId, userId)),
  })
}

module.exports = {
  authSessionMiddleware,
  mergePerms,
  createAuthSessionMiddleware,
}
