const path = require('path')
const router = require('express').Router()

const config = require('config')
const { log, HELPERS } = require('../../../services/logger')
const getAreas = require('../../../services/areas')

/** @type {import('../../../types').Config['api']['reactMapSecret']} */
const reactMapSecret = config.get('api.reactMapSecret')

router.get('/reload', async (req, res) => {
  try {
    if (reactMapSecret && req.headers['react-map-secret'] === reactMapSecret) {
      const newAreas = await getAreas()
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
