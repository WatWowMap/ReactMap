// @ts-check
/* eslint-disable import/no-extraneous-dependencies */
const { build } = require('vite')

const { log, TAGS } = require('@rm/logger')
const { generate } = require('@rm/masterfile')

generate(true).then(() =>
  build()
    .then(() => log.info(TAGS.build, 'React Map Compiled'))
    .then(() => require('./server/src/index')),
)
