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

const config = require('config')

config.getSafe = config.get

config.getMapConfig = (req) => {
  const domain = /** @type {const} */ (
    `multiDomainsObj.${req.headers.host.replaceAll('.', '_')}`
  )
  return config.has(domain) ? config.getSafe(domain) : config.getSafe('map')
}

config.getAreas = (req, key) => {
  const location = /** @type {const} */ (
    `areas.${key}.${req.headers.host.replaceAll('.', '_')}`
  )
  return config.has(location)
    ? config.getSafe(location)
    : config.getSafe(`areas.${key}.main`)
}

module.exports = config
