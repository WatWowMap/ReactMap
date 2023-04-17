const { exec } = require('child_process')
const path = require('path')
const { log } = require('../src/services/logger')
const { version } = require('../../package.json')

/*
  If you are using your own flavor of Sentry, be sure to fill out:
    SENTRY_DSN=""
    SENTRY_AUTH_TOKEN=""
    SENTRY_ORG=""
    SENTRY_PROJECT=""
  These are to be placed in your .env file in the project root.
*/

try {
  exec('yarn build --release', (err0, stdout0) => {
    if (err0) {
      throw new Error(err0)
    }
    log.info(stdout0)
    exec(`sentry-cli releases new ${version}`, (err1, stdout1) => {
      if (err1) {
        throw new Error(err1)
      }
      log.info(stdout1)
      exec(
        `sentry-cli releases files ${version} upload-sourcemaps ${path.resolve(
          __dirname,
          '../../dist',
        )}`,
        (err2, stdout2) => {
          if (err2) {
            throw new Error(err2)
          }
          log.info(stdout2)
          exec(`sentry-cli releases finalize ${version}`, (err3, stdout3) => {
            if (err3) {
              throw new Error(err3)
            }
            log.info(stdout3)
          })
        },
      )
    })
  })
} catch (e) {
  log.error(e)
}
