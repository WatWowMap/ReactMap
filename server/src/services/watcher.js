// @ts-check
const { resolve } = require('path')
const chokidar = require('chokidar')

const config = require('@rm/config')
const { log, TAGS } = require('@rm/logger')
const { validateJsons } = require('@rm/config/lib/validateJsons')
const { reloadConfig } = require('../utils/reloadConfig')

const configDir = resolve(__dirname, '../../../config/user')

/**
 * Replace base path, remove .json, and split into array
 * @param {string} path
 */
const clean = (path) =>
  path.replace(`${configDir}/`, '').replace('.json', '').split('-', 1).at(0)

/**
 *
 * @param {string} event
 * @param {string} rawFile
 */
const handle = async (event, rawFile) => {
  log.debug(TAGS.config, `[${event}]`, rawFile)

  switch (rawFile) {
    case 'loginPage':
    case 'donationPage':
    case 'messageOfTheDay':
      log.info(TAGS.config, `[${event}]`, rawFile)
      config.map[rawFile] = config.util.extendDeep(
        {},
        config.map[rawFile],
        validateJsons(rawFile),
      )
      break
    case 'local':
      if (config.reloadConfigOnSave) {
        await reloadConfig()
      }
      break
    default:
      break
  }
}

const startWatcher = () => {
  const watcher = chokidar.watch(configDir, {
    ignored: /(^|[/\\])\../,
    persistent: true,
    ignoreInitial: true,
  })

  watcher.on('change', async (path) => {
    await handle('CHANGE', clean(path))
  })

  watcher.on('add', async (path) => {
    await handle('ADD', clean(path))
  })

  return watcher
}

module.exports = { startWatcher }
