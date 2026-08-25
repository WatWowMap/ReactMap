/* eslint-disable import/no-extraneous-dependencies */

import { log, TAGS } from '@rm/logger'
import { generate, read } from '@rm/masterfile'
import { build } from 'vite'

generate(true)
  .catch((generationError) => {
    let masterfile: any
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
  .then(() => import('./server/src/serve'))
  .catch((e) => {
    log.error(TAGS.ReactMap, 'Unable to start ReactMap', e)
    process.exitCode = 1
  })
