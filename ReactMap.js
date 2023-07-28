/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/extensions */
process.env.FORCE_COLOR = 3

const { build } = require('vite')
const { log, HELPERS } = require('./server/src/services/logger')
const { generate } = require('./server/scripts/generateMasterfile')
const viteConfig = require('./vite.config')

generate(true).then(() =>
  build(viteConfig)
    .then(() => log.info(HELPERS.build, 'React Map Compiled'))
    .then(() => require('./server/src/index')),
)
