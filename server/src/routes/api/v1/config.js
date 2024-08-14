// @ts-check
const router = require('express').Router()

const { log, TAGS } = require('@rm/logger')

const { reloadConfig } = require('../../../utils/reloadConfig')

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
    log.error(TAGS.api, req.originalUrl, e)
    res.status(500).json({ status: 'error', reason: e.message })
  }
})

router.get('/reload', async (req, res) => {
  const error = await reloadConfig()
  if (error) {
    res.status(500).json({ status: 'error', reason: error.message })
  } else {
    res.status(200).json({ status: 'ok' })
  }
})

module.exports = router
