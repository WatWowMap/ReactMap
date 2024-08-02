/* eslint-disable import/order */
// @ts-check
if (!process.env.NODE_CONFIG_DIR) {
  process.env.NODE_CONFIG_DIR = require('path').resolve(
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

const path = require('path')

const { setLogLevel, HELPERS, log } = require('@rm/logger')
const { applyMutations } = require('./mutations')

function directory() {
  if (process.env.NODE_CONFIG_DIR) {
    return process.env.NODE_CONFIG_DIR
  }
  return path.join(process.cwd(), 'config')
}

function purge() {
  Object.keys(require.cache).forEach((fileName) => {
    if (fileName.indexOf(directory()) === -1) {
      return
    }
    delete require.cache[fileName]
  })
  delete require.cache[require.resolve('config')]
  delete require.cache[require.resolve('@rm/config')]
}

/** @param {import('config').IConfig} c */
function setup(c) {
  c.reload = () => {
    try {
      purge()
      const newConfig = require('config')
      setup(newConfig)

      log.info(HELPERS.config, 'Config reloaded')
      return newConfig
    } catch (e) {
      log.error(HELPERS.config, 'error reloading config', e)
      return c
    }
  }

  c.getSafe = (key) => require('config').get(key)

  c.getMapConfig = (req) => {
    const domain = /** @type {const} */ (
      `multiDomainsObj.${req.headers.host.replaceAll('.', '_')}`
    )
    return c.has(domain) ? c.getSafe(domain) : c.getSafe('map')
  }

  c.getAreas = (req, key) => {
    const location = /** @type {const} */ (
      `areas.${key}.${req.headers.host.replaceAll('.', '_')}`
    )
    return c.has(location)
      ? c.getSafe(location)
      : c.getSafe(`areas.${key}.main`)
  }

  c.setAreas = (areas) => {
    c.areas = areas
  }

  setLogLevel(c.getSafe('devOptions.logLevel'))
  applyMutations(c)
}

const config = require('config')

setup(config)

module.exports = config
