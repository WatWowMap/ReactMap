// @ts-check
/* eslint-disable import/no-extraneous-dependencies */
const { build } = require('vite')

const { log, TAGS } = require('@rm/logger')
const { generate, read } = require('@rm/masterfile')

generate(true)
  .catch((generationError) => {
    let masterfile
    try {
      masterfile = read()
    } catch (readError) {
      log.warn(TAGS.masterfile, 'Unable to refresh masterfile', generationError)
      throw readError
    }
    log.warn(
      TAGS.masterfile,
      'Unable to refresh masterfile, using existing.',
      generationError,
    )
    return masterfile
  })
  .then(() => build())
  .then(() => log.info(TAGS.build, 'React Map Compiled'))
  .then(() => require('./server/src/index'))
  .catch((e) => {
    log.error(TAGS.ReactMap, 'Unable to start ReactMap', e)
    process.exitCode = 1
  })
