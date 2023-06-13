const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')
const { log, HELPERS } = require('./logger')

let isDocker = false

try {
  exec('git branch --show-current', (err, stdout) => {
    try {
      const gitRef = fs.readFileSync(
        path.resolve(`${__dirname}/../../../.gitref`),
        'utf8',
      )

      if (!gitRef && (err || typeof stdout !== 'string' || !stdout.trim())) {
        throw new Error(err)
      }
      if (typeof gitRef === 'string' && gitRef.trim()) {
        isDocker = true
      }
      const branch =
        typeof gitRef === 'string' && gitRef.trim()
          ? gitRef.split('/')[2].trim()
          : stdout.trim()

      exec('git rev-parse HEAD', (err2, stdout2) => {
        try {
          const gitSha = fs.readFileSync(
            path.resolve(`${__dirname}/../../../.gitsha`),
            'utf8',
          )

          if (
            !gitSha &&
            (err2 || typeof stdout2 !== 'string' || !stdout2.trim())
          ) {
            throw new Error(err2)
          }
          const sha =
            typeof gitSha === 'string' && gitSha.trim()
              ? gitSha.trim()
              : stdout2.trim()

          exec(
            `git ls-remote https://github.com/WatWowMap/ReactMap/ refs/heads/${branch}`,
            (err3, stdout3) => {
              try {
                if (
                  err3 ||
                  typeof stdout3 !== 'string' ||
                  !stdout3?.split('\t')?.[0]
                ) {
                  throw new Error(err3)
                }
                const remoteSha = stdout3.split('\t')[0]

                if (remoteSha !== sha) {
                  log.info(
                    HELPERS.update,
                    'There is a new version available: ',
                    remoteSha,
                    isDocker ? 'docker-compose pull' : 'git pull',
                    ' to update',
                  )
                }
              } catch (e) {
                log.info(
                  HELPERS.update,
                  'Unable to get remote SHA:',
                  e.message,
                  '\nBranch:',
                  branch,
                  'Local SHA:',
                  sha,
                  '\nProceeding normally...',
                )
              }
            },
          )
        } catch (e) {
          log.info(
            HELPERS.update,
            'Unable to get current SHA:',
            e.message,
            '\nBranch:',
            branch,
            '\nProceeding normally...',
          )
        }
      })
    } catch (e) {
      log.info(
        HELPERS.update,
        'Unable to determine the local git branch, upgrading your version of git will likely resolve this issue:',
        e.message,
        '\nProceeding normally...',
      )
    }
  })
} catch (e) {
  log.warn(HELPERS.update, e)
}
