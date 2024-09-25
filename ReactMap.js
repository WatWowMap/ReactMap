// @ts-check
const { log, TAGS } = require('@rm/logger')
const { generate } = require('@rm/masterfile')

generate(true).then(() =>
  require('@rm/client')
    .then(() => log.info(TAGS.build, 'React Map Compiled'))
    .then(() => require('@rm/server')),
)
