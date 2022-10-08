/* eslint-disable no-console */

const router = require('express').Router()
const fs = require('fs')

// Loads in the API V1 Routes, including custom ones
fs.readdir(`${__dirname}/v1/`, (e, files) => {
  if (e) return console.error(e, 'Error initializing an API endpoint')
  files.forEach((file) => {
    try {
      router.use(`/v1/${file.replace('.js', '')}`, require(`./v1/${file}`))
      console.log(`[API] Loaded ${file}`)
    } catch (err) {
      console.warn('[WARN] Unable to load API endpoint:', file, '\n', err)
    }
  })
})

module.exports = router
