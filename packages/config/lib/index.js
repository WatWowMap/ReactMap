/* eslint-disable import/order */
// @ts-check
if (!process.env.NODE_CONFIG_DIR) {
  process.env.NODE_CONFIG_DIR = require('path').join(
    __dirname,
    '..',
    '..',
    '..',
    'server',
    'src',
    'configs',
  )
  process.env.ALLOW_CONFIG_MUTATIONS = 'true'
}

if (process.env.NODE_CONFIG_ENV) {
  if (
    process.env.NODE_CONFIG_ENV.includes('.') ||
    process.env.NODE_CONFIG_ENV.includes('/')
  ) {
    throw new Error('Invalid NODE_CONFIG_ENV, must not contain "." or "/"')
  }
}

const { setLogLevel, HELPERS, log } = require('@rm/logger')
const { applyMutations } = require('./mutations')

function purge() {
  Object.keys(require.cache).forEach((fileName) => {
    if (fileName.indexOf(process.env.NODE_CONFIG_DIR) === -1) {
      return
    }
    delete require.cache[fileName]
  })
  delete require.cache[require.resolve('config')]
  delete require.cache[require.resolve('@rm/config')]
}

/** @param {import('config').IConfig} c */
function setup(c) {
  c.reload = function reload() {
    try {
      purge()
      const newConfig = require('config')
      setup(newConfig)

      log.info(HELPERS.config, 'config reloaded')
      return newConfig
    } catch (e) {
      log.error(HELPERS.config, 'error reloading config', e)
      return this
    }
  }

  c.getSafe = function getSafe(key) {
    return require('config').get(key)
  }

  c.getMapConfig = function getMapConfig(req) {
    const domain = /** @type {const} */ (
      `multiDomainsObj.${req.headers.host.replaceAll('.', '_')}`
    )
    return this.has(domain) ? this.getSafe(domain) : this.getSafe('map')
  }

  c.getAreas = function getAreas(req, key) {
    const location = /** @type {const} */ (
      `areas.${key}.${req.headers.host.replaceAll('.', '_')}`
    )
    return this.has(location)
      ? this.getSafe(location)
      : this.getSafe(`areas.${key}.main`)
  }

  c.setAreas = function setAreas(newAreas) {
    this.areas = newAreas
  }

  setLogLevel(c.getSafe('devOptions.logLevel'))
  applyMutations(c)
}

const config = require('config')

setup(config)

module.exports = config
