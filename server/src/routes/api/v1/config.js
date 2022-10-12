/* eslint-disable no-console */
const path = require('path')
const router = require('express').Router()
const config = require('../../../services/config')

router.get('/', (req, res) => {
  try {
    if (
      config.api.reactMapSecret &&
      req.headers['react-map-secret'] === config.api.reactMapSecret
    ) {
      res.status(200).json({
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
    console.log(`[API] api/v1/${path.parse(__filename).name}`)
  } catch (e) {
    console.error(`[API Error] api/v1/${path.parse(__filename).name}`, e)
    res.status(500).json({ status: 'error', reason: e.message })
  }
})

module.exports = router
