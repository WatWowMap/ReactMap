// @ts-check

const { build } = require('vite')

const viteConfig = require('./vite.config')

process.env.SKIP_CONFIG = 'true'

module.exports = build(
  viteConfig({
    mode: process.env.NODE_ENV || 'production',
    command: 'build',
  }),
)
