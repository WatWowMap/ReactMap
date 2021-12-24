const express = require('express')
const path = require('path')
const config = require('../services/config')

const router = new express.Router()

const clientRoutes = [
  '/',
  '/login',
  '/@/:lat/:lon/:zoom?',
  '/id/:category/:id/:zoom?',
  '/404',
  '/500',
  '/reset',
]

router.get(clientRoutes, (req, res) => {
  res.sendFile(path.join(__dirname, `../${config.devOptions.clientPath}/index.html`))
})

module.exports = router
