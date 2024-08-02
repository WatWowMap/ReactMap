// @ts-check
const router = require('express').Router()

const { log, HELPERS } = require('@rm/logger')

const state = require('../../../services/state')

router.get('/', async (req, res) => {
  try {
    const ts = Math.floor(new Date().getTime() / 1000)
    res
      .status(200)
      .json(await state.db.models.Session.query().where('expires', '>=', ts))
  } catch (e) {
    log.error(HELPERS.api, req.originalUrl, e)
    res.status(500).json({ status: 'ServerError', reason: e.message })
  }
})
router.get('/hasValid/:id', async (req, res) => {
  try {
    const results = await state.db.models.Session.query().whereRaw(
      `json_extract(data, '$.passport.user.id') = ${req.params.id}
          OR json_extract(data, '$.passport.user.discordId') = "${req.params.id}"
          OR json_extract(data, '$.passport.user.telegramId') = "${req.params.id}"`,
    )
    res.status(200).json({
      valid: !!results.length,
      length: results.length,
    })
  } catch (e) {
    log.error(HELPERS.api, req.originalUrl, e)
    res.status(500).json({ status: 'ServerError', reason: e.message })
  }
})

router.get('/clearSessions/:id', async (req, res) => {
  try {
    const results = await state.db.models.Session.query()
      .whereRaw(
        `json_extract(data, '$.passport.user.id') = ${req.params.id}
            OR json_extract(data, '$.passport.user.discordId') = "${req.params.id}"
            OR json_extract(data, '$.passport.user.telegramId') = "${req.params.id}"`,
      )
      .delete()
    res.status(200).json({ results })
  } catch (e) {
    log.error(HELPERS.api, req.originalUrl, e)
    res.status(500).json({ status: 'ServerError', reason: e.message })
  }
})

module.exports = router
