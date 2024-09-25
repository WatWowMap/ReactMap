// @ts-check
const path = require('path')

if (!process.env.NODE_CONFIG_DIR) {
  process.env.NODE_CONFIG_DIR =
    path.join(__dirname, '..', '..', '..', 'config') +
    path.delimiter +
    path.join(__dirname, '..', '..', '..', 'config', 'user')
  process.env.ALLOW_CONFIG_MUTATIONS = 'true'
  process.env.SUPPRESS_NO_CONFIG_WARNING = 'true'
}

if (process.env.NODE_CONFIG_ENV) {
  if (
    process.env.NODE_CONFIG_ENV.includes('.') ||
    process.env.NODE_CONFIG_ENV.includes('/')
  ) {
    throw new Error('Invalid NODE_CONFIG_ENV, must not contain "." or "/"')
  }
}

const { setGlobalLogLevel, TAGS, log } = require('@rm/logger')
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

const config = require('config')

config.getSafe = function getSafe(key) {
  return require('config').get(key)
}

setGlobalLogLevel(config.getSafe('devOptions.logLevel'))

config.reload = function reload() {
  try {
    purge()
    log.info(TAGS.config, 'config purged, returning old reference')
    return this
  } catch (e) {
    log.error(TAGS.config, 'error reloading config', e)
    return this
  }
}

config.setAreas = function setAreas(newAreas) {
  log.info(TAGS.config, 'updating areas')
  this.areas = newAreas
}
applyMutations(config)

module.exports = config
