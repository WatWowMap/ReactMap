// @ts-check
const router = require('express').Router()

const { log, TAGS } = require('@rm/logger')

const state = require('../../../services/state')

router.get('/start', async (req, res) => {
  state.setTrials(true)
  res.status(200).json({ status: 'success' })
})

router.get('/start/:strategy', async (req, res) => {
  try {
    state.setTrials(true, req.params.strategy)
    res.status(200).json({ status: 'success' })
  } catch (e) {
    log.error(TAGS.api, e)
    res.status(404).json({ status: 'error', message: e.message })
  }
})

router.get('/stop', async (req, res) => {
  state.setTrials(false)
  res.status(200).json({ status: 'success' })
})

router.get('/stop/:strategy', async (req, res) => {
  try {
    state.setTrials(false, req.params.strategy)
    res.status(200).json({ status: 'success' })
  } catch (e) {
    log.error(TAGS.api, e)
    res.status(404).json({ status: 'error', message: e.message })
  }
})

router.get('/status', async (req, res) => {
  res.status(200).json({ status: state.getTrialStatus() })
})

router.get('/status/:strategy', async (req, res) => {
  try {
    const status = state.getTrialStatus()
    res.status(200).json({ status })
  } catch (e) {
    log.error(TAGS.api, e)
    res.status(404).json({ status: 'error', message: e.message })
  }
})

module.exports = router
