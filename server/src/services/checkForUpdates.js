/* eslint-disable no-console */
const { exec } = require('child_process')
const fs = require('fs')

try {
  exec('git branch --show-current', async (err, stdout) => {
    const gitRef = fs.readFileSync('.gitref', 'utf8')

    if (!gitRef && (err || typeof stdout !== 'string' || !stdout.trim())) {
      throw new Error('Unable to get current branch', err)
    }
    const branch = typeof gitRef === 'string' && gitRef.trim()
      ? gitRef.trim()
      : stdout.trim()

    exec('git rev-parse HEAD', async (err2, stdout2) => {
      const gitSha = fs.readFileSync('.gitsha', 'utf8')

      if (!gitSha && (err2 || typeof stdout2 !== 'string' || !stdout2.trim())) {
        throw new Error('Unable to get current sha', err)
      }
      const sha = typeof gitSha === 'string' && gitSha.trim()
        ? gitSha.trim()
        : stdout2.trim()

      exec(`git ls-remote https://github.com/WatWowMap/ReactMap/ refs/heads/${branch}`, (err3, stdout3) => {
        if (err3 || typeof stdout3 !== 'string' || !stdout3?.split('\t')?.[0]) {
          throw new Error('Unable to get remote sha', err3)
        }
        const remoteSha = stdout3.split('\t')[0]

        if (remoteSha !== sha) {
          console.log('There is a new version available:', remoteSha)
        }
      })
    })
  })
} catch (e) {
  console.log(e.message)
}
