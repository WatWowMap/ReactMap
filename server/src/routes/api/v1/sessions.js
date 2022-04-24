/* eslint-disable no-console */
const router = require('express').Router()
const { api } = require('../../../services/config')
const { Session } = require('../../../models/index')

router.get('/', async (req, res) => {
  try {
    if (api.reactMapSecret && req.headers['react-map-secret'] === api.reactMapSecret) {
      const ts = Math.floor((new Date()).getTime() / 1000)
      res.status(200).json(await Session.query()
        .where('expires', '>=', ts))
    } else {
      throw new Error('Incorrect or missing API secret')
    }
    console.log('[API] api/v1/sessions')
  } catch (e) {
    console.error('[API Error] api/v1/sessions/', e)
    res.status(500).json({ status: 'ServerError', reason: e.message })
  }
})
router.get('/hasValid/:id', async (req, res) => {
  try {
    if (api.reactMapSecret && req.headers['react-map-secret'] === api.reactMapSecret) {
      const results = await Session.query()
        .whereRaw(`json_extract(data, '$.passport.user.id') = ${req.params.id}`)
      res.status(200).json({
        valid: Boolean(results.length),
        length: results.length,
      })
    } else {
      throw new Error('Incorrect or missing API secret')
    }
  } catch (e) {
    console.error(`[API Error] api/v1/sessions/hasValid/${req.params.id}`, e)
    res.status(500).json({ status: 'ServerError', reason: e.message })
  }
})

router.get('/clearSessions/:id', async (req, res) => {
  try {
    if (api.reactMapSecret && req.headers['react-map-secret'] === api.reactMapSecret) {
      const results = await Session.query()
        .whereRaw(`json_extract(data, '$.passport.user.id') = ${req.params.id}`)
        .delete()
      res.status(200).json(results, 'Sessions Cleared')
    } else {
      throw new Error('Incorrect or missing API secret')
    }
    console.log(`[API] api/v1/sessions/clearSessions/${req.params.id}`)
  } catch (e) {
    console.error(`[API Error] api/v1/sessions/clearSessions/${req.params.id}`, e)
    res.status(500).json({ status: 'ServerError', reason: e.message })
  }
})

module.exports = router
