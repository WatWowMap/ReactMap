// @ts-check
const router = require('express').Router()
const { and, eq, gte, inArray } = require('drizzle-orm')

const { log, TAGS } = require('@rm/logger')

const { getDrizzle } = require('../../../db/drizzle')
const { authSession, authAccount } = require('../../../db/authSchema')

/**
 * The legacy `sessions` table stored a JSON blob shaped by passport's
 * serializeUser, keyed loosely by whichever of a legacy user id, Discord id,
 * or Telegram id the caller happened to pass. Better Auth links each of
 * those to a user through `auth_account.accountId`, so the equivalent lookup
 * is a join through the account row rather than a JSON path probe.
 *
 * @param {string} id
 */
async function userIdsFor(id) {
  const rows = await getDrizzle()
    .select({ userId: authAccount.userId })
    .from(authAccount)
    .where(eq(authAccount.accountId, id))
  return rows.map((row) => row.userId)
}

router.get('/', async (req, res) => {
  try {
    const now = new Date()
    res
      .status(200)
      .json(
        await getDrizzle()
          .select()
          .from(authSession)
          .where(gte(authSession.expiresAt, now)),
      )
  } catch (e) {
    log.error(TAGS.api, req.originalUrl, e)
    res.status(500).json({ status: 'ServerError', reason: e.message })
  }
})

router.get('/hasValid/:id', async (req, res) => {
  try {
    const now = new Date()
    const userIds = await userIdsFor(req.params.id)
    const results = userIds.length
      ? await getDrizzle()
          .select()
          .from(authSession)
          .where(
            and(
              inArray(authSession.userId, userIds),
              gte(authSession.expiresAt, now),
            ),
          )
      : []
    res.status(200).json({
      valid: !!results.length,
      length: results.length,
    })
  } catch (e) {
    log.error(TAGS.api, req.originalUrl, e)
    res.status(500).json({ status: 'ServerError', reason: e.message })
  }
})

router.get('/clearSessions/:id', async (req, res) => {
  try {
    const userIds = await userIdsFor(req.params.id)
    const results = userIds.length
      ? await getDrizzle()
          .delete(authSession)
          .where(inArray(authSession.userId, userIds))
      : []
    res.status(200).json({ results })
  } catch (e) {
    log.error(TAGS.api, req.originalUrl, e)
    res.status(500).json({ status: 'ServerError', reason: e.message })
  }
})

module.exports = router
