/* eslint-disable no-console */
const router = require('express').Router()
const { api } = require('../../../services/config')
const { User } = require('../../../models/index')

router.get('/', async (req, res) => {
  try {
    if (api.reactMapSecret && req.headers['react-map-secret'] === api.reactMapSecret) {
      res.status(200).json(await User.query())
    } else {
      throw new Error('Incorrect or missing API secret')
    }
    console.log('[API] api/v1/users')
  } catch (e) {
    console.error('[API Error] api/v1/sessions', e)
    res.status(500).json({ status: 'ServerError', reason: e.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    if (api.reactMapSecret && req.headers['react-map-secret'] === api.reactMapSecret) {
      res.status(200).json(await User.query().findById(req.params.id))
    } else {
      throw new Error('Incorrect or missing API secret')
    }
    console.log(`[API] api/v1/users/${req.params.id}`)
  } catch (e) {
    console.error(`[API Error] api/v1/users/${req.params.id}`, e)
    res.status(500).json({ status: 'ServerError', reason: e.message })
  }
})

module.exports = router
