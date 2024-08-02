// @ts-check
const path = require('path')
const router = require('express').Router()
const config = require('@rm/config')
const { log, HELPERS } = require('@rm/logger')

router.get('/', (req, res) => {
  const reactMapSecret = config.getSafe('api.reactMapSecret')
  try {
    if (reactMapSecret && req.headers['react-map-secret'] === reactMapSecret) {
      res.status(200).json({
        ...config,
        api: {
          ...config.api,
          reactMapSecret: undefined,
        },
        ...config,
        database: {
          ...config.database,
          schemas: config.api.showSchemasInConfigApi
            ? config.database.schemas
            : [],
        },
        authentication: {
          ...config.authentication,
          strategies: config.api.showStrategiesInConfigApi
            ? config.authentication.strategies
            : [],
        },
      })
    } else {
      throw new Error('Incorrect or missing API secret')
    }
    log.info(HELPERS.api, `api/v1/${path.parse(__filename).name}`)
  } catch (e) {
    log.error(HELPERS.api, `api/v1/${path.parse(__filename).name}`, e)
    res.status(500).json({ status: 'error', reason: e.message })
  }
})

module.exports = router
