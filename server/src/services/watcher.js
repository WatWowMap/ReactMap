// @ts-check
const { resolve } = require('path')
const chokidar = require('chokidar')

const config = require('@rm/config')
const { log, TAGS } = require('@rm/logger')
const { validateJsons } = require('@rm/config/lib/validateJsons')
const { reloadConfig } = require('../utils/reloadConfig')

const configDir = resolve(__dirname, '../configs')

/**
 * Replace base path, remove .json, and split into array
 * @param {string} path
 */
const clean = (path) =>
  path.replace(`${configDir}/`, '').replace('.json', '').split('/', 2)

/**
 *
 * @param {string} event
 * @param {string} rawFile
 * @param {string} [domain]
 */
const handle = async (event, rawFile, domain) => {
  log.debug(TAGS.config, `[${event}]`, rawFile)

  switch (rawFile) {
    case 'loginPage':
    case 'donationPage':
    case 'messageOfTheDay':
      if (domain) {
        const domainKey = domain.replaceAll('.', '_')
        const multiDomainsObj = config.getSafe('multiDomainsObj')
        if (multiDomainsObj[domainKey]?.[rawFile]) {
          log.info(TAGS.config, `[${event}]`, rawFile, domain)
          multiDomainsObj[domainKey][rawFile] = config.util.extendDeep(
            {},
            multiDomainsObj[domainKey][rawFile],
            validateJsons(rawFile, domain),
          )
        }
      } else {
        log.info(TAGS.config, `[${event}]`, rawFile)
        config.map[rawFile] = config.util.extendDeep(
          {},
          config.map[rawFile],
          validateJsons(rawFile),
        )
      }
      break
    case 'local':
    case `local-${process.env.NODE_CONFIG_ENV}`:
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
    const [rawFile, domain] = clean(path)
    await handle('CHANGE', rawFile, domain)
  })

  watcher.on('add', async (path) => {
    const [rawFile, domain] = clean(path)
    if (domain && domain.split('_').length > 1) return
    await handle('ADD', rawFile, domain)
  })

  return watcher
}

module.exports = { startWatcher }
