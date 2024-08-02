// @ts-check
const router = require('express').Router()
const { log, HELPERS } = require('@rm/logger')

router.get('/', (req, res) => {
  const config = require('@rm/config')
  try {
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
  } catch (e) {
    log.error(HELPERS.api, req.originalUrl, e)
    res.status(500).json({ status: 'error', reason: e.message })
  }
})

module.exports = router
