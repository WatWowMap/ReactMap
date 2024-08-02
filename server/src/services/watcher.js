// @ts-check
const { resolve } = require('path')
const chokidar = require('chokidar')

const config = require('@rm/config')
const { log, HELPERS } = require('@rm/logger')

const { validateJsons } = require('@rm/config/lib/validateJsons')

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
const handle = (event, rawFile, domain) => {
  switch (rawFile) {
    case 'loginPage':
    case 'donationPage':
    case 'messageOfTheDay':
      if (domain) {
        const domainKey = domain.replaceAll('.', '_')
        const multiDomainsObj = config.getSafe('multiDomainsObj')
        if (multiDomainsObj[domainKey]?.[rawFile]) {
          log.info(HELPERS.config, `[${event}]`, rawFile, domain)
          multiDomainsObj[domainKey][rawFile] = config.util.extendDeep(
            {},
            multiDomainsObj[domainKey][rawFile],
            validateJsons(rawFile, domain),
          )
        }
      } else {
        log.info(HELPERS.config, `[${event}]`, rawFile)
        config.map[rawFile] = config.util.extendDeep(
          {},
          config.map[rawFile],
          validateJsons(rawFile),
        )
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

  watcher.on('change', (path) => {
    const [rawFile, domain] = clean(path)
    handle('CHANGE', rawFile, domain)
  })

  watcher.on('add', (path) => {
    const [rawFile, domain] = clean(path)
    if (domain && domain.split('_').length > 1) return
    handle('ADD', rawFile, domain)
  })

  return watcher
}

module.exports = { startWatcher }
