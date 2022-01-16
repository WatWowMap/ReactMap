/* eslint-disable no-console */
const { exec } = require('child_process')

const { version: currentVersion } = require('../../../package.json')
const Fetch = require('./Fetch')

exec('git branch --show-current', async (err, stdout) => {
  try {
    if (err || typeof stdout !== 'string' || !stdout.trim()) {
      throw new Error('Unable to get current branch', err.message)
    }
    const latest = await Fetch.json(`https://raw.githubusercontent.com/WatWowMap/ReactMap/${stdout.trim()}/package.json`)

    if (!latest || !latest.version) {
      throw new Error('Unable to fetch latest version')
    }

    const [majorC, minorC, patchC] = currentVersion.split('.').map(x => parseInt(x))
    const [majorN, minorN, patchN] = latest.version.split('.').map(x => parseInt(x))

    if (stdout.trim() === 'main') {
      console.info('You are on the main branch, there may be additional features available on the "develop" branch. Type "git checkout develop" in the console if you would like the latest features.')
    }
    if (majorC < majorN
      || (majorC === majorN && minorC < minorN)
      || (majorC === majorN && minorC === minorN && patchC < patchN)) {
      console.info(`[${stdout.trim().toUpperCase()}] New version available: ${latest.version} (Current: ${currentVersion})`)
    }
  } catch (e) {
    console.error(e.message)
  }
})
