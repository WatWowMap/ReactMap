// @ts-check
const { eq } = require('drizzle-orm')

const { log, TAGS } = require('@rm/logger')

const { mergePerms: mergePermsPair } = require('../utils/mergePerms')

/**
 * Folds the per-provider perms rows into the single object the app expects.
 * A true from any provider wins, which matches how a linked account behaves
 * today: linking never removes an ability the person already had.
 *
 * `merged[key] || value` was the naive version of that fold, but an empty
 * array is truthy in JS, so the first row processed always won outright for
 * any array-valued perm (`areaRestrictions`). Since `areaRestrictions` treats
 * an empty array as unrestricted (`server/src/utils/getAreaSql.js`), and the
 * `user_perms` query carries no `ORDER BY`, a user restricted to one area by
 * one provider could get the whole map depending on unspecified row order.
 * `mergePermsPair` (`server/src/utils/mergePerms.js`, the 1.x
 * implementation) unions array values explicitly instead, so this reduces
 * pairwise through it rather than re-deriving the same semantics here.
 *
 * @param {{ providerId: string, perms: Record<string, boolean> }[]} rows
 */
function mergePerms(rows) {
  return rows.reduce(
    (merged, row) => mergePermsPair(merged, row.perms || {}),
    /** @type {Record<string, any>} */ ({}),
  )
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
