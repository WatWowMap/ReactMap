/* eslint-disable no-console */
const extend = require('extend')
const fs = require('fs')
const uConfig = require('../configs/config.json')
const eConfig = require('../configs/default.json')

const target = {}

extend(true, target, eConfig, uConfig)

try {
  target.authMethods = []
  fs.readdir(`${__dirname}/../strategies/`, (e, files) => {
    if (e) return console.error(e)
    files.forEach(file => {
      const trimmed = file.replace('.js', '')
      if (target[trimmed]?.enabled) {
        target.authMethods.push(trimmed)
      }
    })
  })
} catch (e) {
  console.error('Failed to initialize a strategy', e)
}

module.exports = target
