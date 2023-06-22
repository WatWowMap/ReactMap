const express = require('express')
const path = require('path')
const { devOptions } = require('../services/config')

const router = new express.Router()

const clientRoutes = [
  '/',
  '/login',
  '/blocked/:blockedGuilds',
  '/@/:lat/:lon/:zoom?',
  '/id/:category/:id/:zoom?',
  '/304',
  '/404',
  '/500',
  '/reset',
]

router.get(clientRoutes, (req, res) => {
  res.sendFile(path.join(__dirname, `../${devOptions.clientPath}/index.html`))
})

module.exports = router
