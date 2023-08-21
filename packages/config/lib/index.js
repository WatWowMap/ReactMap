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

module.exports = config
