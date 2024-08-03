// @ts-check
const router = require('express').Router()

const { log, HELPERS } = require('@rm/logger')

const state = require('../../../services/state')
const { bindConnections } = require('../../../models')
const { loadLatestAreas } = require('../../../services/areas')
const { loadAuthStrategies } = require('../../authRouter')

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

router.get('/reload', async (req, res) => {
  try {
    const newConfig = require('@rm/config').reload()

    const newState = state.reload()

    bindConnections(newState.db)

    await newState.db.getDbContext()
    await newState.loadLocalContexts()
    await newState.loadExternalContexts()
    loadAuthStrategies()

    newConfig.setAreas(await loadLatestAreas())

    res.status(200).json({ status: 'ok' })
  } catch (e) {
    log.error(HELPERS.api, req.originalUrl, e)
    res.status(500).json({ status: 'error', reason: e.message })
  }
})

module.exports = router
