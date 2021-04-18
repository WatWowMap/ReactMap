const express = require('express')
const config = require('../services/config')

const router = new express.Router()

const clientRoutes = [
  '/',
]

router.get(clientRoutes, (req, res) => {
  res.sendFile(config.clientPath)
})

module.exports = router
