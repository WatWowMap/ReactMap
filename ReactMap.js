/* eslint-disable import/no-extraneous-dependencies */
const { build } = require('vite')

const { log, HELPERS } = require('@rm/logger')
const { generate } = require('@rm/masterfile')

const viteConfig = require('./vite.config')

generate(true).then(() =>
  build(viteConfig)
    .then(() => log.info(HELPERS.build, 'React Map Compiled'))
    .then(() => require('./server/src/index')),
)
