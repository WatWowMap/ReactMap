// @ts-check
const { exec } = require('child_process')
const { promisify } = require('util')

const { log, TAGS } = require('@rm/logger')

const execPromise = promisify(exec)

const REPO_API = 'https://api.github.com/repos/WatWowMap/ReactMap'

/**
 * Docker images receive `GIT_REF` / `GIT_SHA` at build time,
 * bare-metal installs fall back to the local git checkout.
 *
 * @returns {Promise<{ branch: string, isDocker: boolean }>}
 */
async function getCurrentBranch() {
  const gitRef = process.env.GIT_REF?.trim()
  if (gitRef) {
    return {
      branch: gitRef.startsWith('refs/heads/')
        ? gitRef.slice('refs/heads/'.length)
        : '',
      isDocker: true,
    }
  }
  try {
    const { stdout } = await execPromise('git branch --show-current')
    return { branch: stdout.trim(), isDocker: false }
  } catch (e) {
    log.info(
      TAGS.update,
      'Unable to determine the local git branch, upgrading your version of git will likely resolve this issue:',
      e.message,
      '\nProceeding normally...',
    )
    return { branch: 'main', isDocker: false }
  }
}

async function getCurrentSha() {
  const gitSha = process.env.GIT_SHA?.trim()
  if (gitSha) return gitSha
  try {
    const { stdout } = await execPromise('git rev-parse HEAD')
    return stdout.trim()
  } catch (e) {
    log.info(
      TAGS.update,
      'Unable to get current SHA:',
      e.message,
      '\nProceeding normally...',
    )
    return ''
  }
}

/** @param {string} branch */
async function getRemoteSha(branch) {
  try {
    const response = await fetch(
      `${REPO_API}/commits/${encodeURIComponent(branch)}`,
      {
        headers: { Accept: 'application/vnd.github.sha' },
        signal: AbortSignal.timeout(10_000),
      },
    )
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`)
    }
    return (await response.text()).trim()
  } catch (e) {
    log.info(
      TAGS.update,
      'Unable to get remote SHA:',
      e.message,
      '\nBranch:',
      branch,
      '\nProceeding normally...',
    )
    return ''
  }
}

async function checkForUpdates() {
  try {
    const { branch, isDocker } = await getCurrentBranch()
    if (!branch) {
      log.info(TAGS.update, 'Not running from a branch, skipping update check')
      return
    }
    const sha = await getCurrentSha()
    const remoteSha = await getRemoteSha(branch)
    if (sha && remoteSha && remoteSha !== sha) {
      log.info(
        TAGS.update,
        'There is a new version available: ',
        remoteSha,
        isDocker ? 'docker-compose pull' : 'git pull',
        ' to update',
      )
    }
  } catch (e) {
    log.warn(TAGS.update, e)
  }
}

module.exports = { checkForUpdates }
