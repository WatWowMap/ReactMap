const path = require('path')
const router = require('express').Router()

const config = require('@rm/config')
const { log, HELPERS } = require('@rm/logger')
const { loadLatestAreas } = require('../../../services/areas')

router.get('/reload', async (req, res) => {
  try {
    const newAreas = await loadLatestAreas()
    config.areas = newAreas

    res.status(200).json({ status: 'ok', message: 'reloaded areas' })
    log.info(HELPERS.api, `api/v1/${path.parse(__filename).name}/reload`)
  } catch (e) {
    log.error(HELPERS.api, `api/v1/${path.parse(__filename).name}/reload`, e)
    res.status(500).json({ status: 'error', reason: e.message })
  }
})

module.exports = router
