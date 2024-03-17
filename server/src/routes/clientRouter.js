// @ts-check
const express = require('express')
const path = require('path')

const router = express.Router()

const CLIENT_ROUTES = [
  '/',
  '/login',
  '/blocked/:info',
  '/@/:lat/:lon/:zoom?',
  '/id/:category/:id/:zoom?',
  '/304',
  '/404',
  '/500',
  '/reset',
  '/playground',
  '/locales',
  '/data-management',
]

router.get(CLIENT_ROUTES, (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      `../../../dist${
        process.env.NODE_CONFIG_ENV ? `-${process.env.NODE_CONFIG_ENV}` : ''
      }/index.html`,
    ),
  )
})

module.exports = router
