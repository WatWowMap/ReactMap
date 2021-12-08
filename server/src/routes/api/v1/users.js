const router = require('express').Router()
const { api } = require('../../../services/config')
const { User } = require('../../../models/index')

router.get('/', async (req, res) => {
  if (req.headers['react-map-secret'] === api.reactMapSecret) {
    res.status(200).json(await User.query())
  } else {
    res.status(500).json({ status: 'AuthError', reason: 'Incorrect or missing API secret' })
  }
})

router.get('/:id', async (req, res) => {
  if (req.headers['react-map-secret'] === api.reactMapSecret) {
    res.status(200).json(await User.query().findById(req.params.id))
  } else {
    res.status(500).json({ status: 'AuthError', reason: 'Incorrect or missing API secret' })
  }
})

module.exports = router
