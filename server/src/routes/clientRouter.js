// @ts-check
const express = require('express')
const path = require('path')
const config = require('config')

const router = express.Router()

const clientRoutes = [
  '/',
  '/login',
  '/blocked/:info',
  '/@/:lat/:lon/:zoom?',
  '/id/:category/:id/:zoom?',
  '/304',
  '/404',
  '/500',
  '/reset',
]

router.get(clientRoutes, (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      `../${config.getSafe('devOptions.clientPath')}/index.html`,
    ),
  )
})

module.exports = router
