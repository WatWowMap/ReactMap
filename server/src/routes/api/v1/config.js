// @ts-check
const path = require('path')
const router = require('express').Router()
const config = require('@rm/config')
const { log, HELPERS } = require('@rm/logger')

const api = config.getSafe('api')

router.get('/', (req, res) => {
  try {
    if (
      api.reactMapSecret &&
      req.headers['react-map-secret'] === api.reactMapSecret
    ) {
      res.status(200).json({
        ...config,
        api: {
          ...api,
          reactMapSecret: undefined,
        },
        ...config,
        database: {
          ...config.database,
          schemas: api.showSchemasInConfigApi ? config.database.schemas : [],
        },
        authentication: {
          ...config.authentication,
          strategies: api.showStrategiesInConfigApi
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
