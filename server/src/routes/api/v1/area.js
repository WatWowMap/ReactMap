const router = require('express').Router()

const config = require('@rm/config')
const { log, TAGS } = require('@rm/logger')
const { loadLatestAreas } = require('../../../services/areas')

router.get('/reload', async (req, res) => {
  try {
    const newAreas = await loadLatestAreas()
    config.setAreas(newAreas)

    res.status(200).json({ status: 'ok', message: 'reloaded areas' })
  } catch (e) {
    log.error(TAGS.api, req.originalUrl, e)
    res.status(500).json({ status: 'error', reason: e.message })
  }
})

module.exports = router
