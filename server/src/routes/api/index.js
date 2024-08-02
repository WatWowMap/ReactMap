const express = require('express')
const fs = require('fs')
const { resolve } = require('path')
const { log, HELPERS } = require('@rm/logger')

const apiRouter = express.Router()

fs.readdir(resolve(__dirname, './v1/'), (e, files) => {
  if (e) return log.error(HELPERS.api, 'Error initializing an API endpoint', e)
  files.forEach((file) => {
    try {
      apiRouter.use(
        `/${file.replace('.js', '')}`,
        require(resolve(__dirname, './v1/', file)),
      )
      log.info(HELPERS.api, `Loaded ${file}`)
    } catch (err) {
      log.warn(HELPERS.api, 'Unable to load API endpoint:', file, '\n', err)
    }
  })
})

module.exports = apiRouter
