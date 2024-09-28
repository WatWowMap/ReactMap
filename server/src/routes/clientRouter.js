// @ts-check
const path = require('path')

const express = require('express')

const clientRouter = express.Router()

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
  '/error',
  '/error/:message',
]

clientRouter.get(CLIENT_ROUTES, (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      `../../../dist${
        process.env.NODE_CONFIG_ENV ? `-${process.env.NODE_CONFIG_ENV}` : ''
      }/index.html`,
    ),
  )
})

module.exports = { clientRouter }
