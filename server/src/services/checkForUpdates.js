// @ts-check
const { exec } = require('child_process')
const { promisify } = require('util')
const path = require('path')
const fs = require('fs')

const { log, HELPERS } = require('@rm/logger')

const execPromise = promisify(exec)

async function getCurrentBranch() {
  try {
    const gitRef = fs
      .readFileSync(path.resolve(`${__dirname}/../../../.gitref`), 'utf8')
      .trim()
    if (gitRef) return { branch: gitRef.split('/')[2].trim(), isDocker: true }

    const { stdout } = await execPromise('git branch --show-current')
    return { branch: stdout.trim(), isDocker: false }
  } catch (e) {
    log.info(
      HELPERS.update,
      'Unable to determine the local git branch, upgrading your version of git will likely resolve this issue:',
      e.message,
      '\nProceeding normally...',
    )
  }
}

async function getCurrentSha() {
  try {
    const gitSha = fs
      .readFileSync(path.resolve(`${__dirname}/../../../.gitsha`), 'utf8')
      .trim()
    if (gitSha) return gitSha

    const { stdout } = await execPromise('git rev-parse HEAD')
    return stdout.trim()
  } catch (e) {
    log.info(
      HELPERS.update,
      'Unable to get current SHA:',
      e.message,
      '\nProceeding normally...',
    )
  }
}

/** @param {string} branch */
async function getRemoteSha(branch) {
  try {
    const { stdout } = await execPromise(
      `git ls-remote https://github.com/WatWowMap/ReactMap/ refs/heads/${branch}`,
    )
    return stdout.split('\t')[0]
  } catch (e) {
    log.info(
      HELPERS.update,
      'Unable to get remote SHA:',
      e.message,
      '\nBranch:',
      branch,
      '\nProceeding normally...',
    )
  }
}

async function checkForUpdates() {
  try {
    const { branch, isDocker } = await getCurrentBranch()
    const sha = await getCurrentSha()
    const remoteSha = await getRemoteSha(branch)
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
    log.warn(HELPERS.update, e)
  }
}

module.exports = checkForUpdates().then(() =>
  log.info(HELPERS.update, 'Completed'),
)
