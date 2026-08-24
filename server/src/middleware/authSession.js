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
 * Supplies `req.user` and `req.session.perms` from better auth, falling back
 * to whatever passport already set. Dependencies are injected so the branching
 * can be tested without a database or a live auth instance.
 *
 * @param {{ getSession: (headers: any) => Promise<any>, getPerms: (userId: string) => Promise<any[]> }} deps
 */
function authSessionMiddleware(deps) {
  return async function middleware(req, _res, next) {
    try {
      const session = await deps.getSession(req.headers)
      if (session?.user) {
        req.user = session.user
        req.session = req.session || {}
        req.session.perms = mergePerms(await deps.getPerms(session.user.id))
      }
    } catch (e) {
      // A failure here must not take the request down: passport is still
      // mounted and may well have authenticated this person already.
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
