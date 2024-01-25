const path = require('path')
const router = require('express').Router()

const config = require('@rm/config')
const { log, HELPERS } = require('@rm/logger')
const { loadLatestAreas } = require('../../../services/areas')

const reactMapSecret = config.getSafe('api.reactMapSecret')

router.get('/reload', async (req, res) => {
  try {
    if (reactMapSecret && req.headers['react-map-secret'] === reactMapSecret) {
      const newAreas = await loadLatestAreas()
      config.areas = newAreas

      res.status(200).json({ status: 'ok', message: 'reloaded areas' })
    } else {
      throw new Error('Incorrect or missing API secret')
    }
    log.info(HELPERS.api, `api/v1/${path.parse(__filename).name}/reload`)
  } catch (e) {
    log.error(HELPERS.api, `api/v1/${path.parse(__filename).name}/reload`, e)
    res.status(500).json({ status: 'error', reason: e.message })
  }
})

module.exports = router
