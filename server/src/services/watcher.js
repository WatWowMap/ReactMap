const { resolve } = require('path')
const chokidar = require('chokidar')

const config = require('@rm/config')
const { log, HELPERS } = require('@rm/logger')
const checkConfigJsons = require('./functions/checkConfigJsons')

const configDir = resolve(__dirname, '../configs')

const watcher = chokidar.watch(configDir, {
  ignored: /(^|[/\\])\../,
  persistent: true,
  ignoreInitial: true,
})

/**
 * Replace base path, remove .json, and split into array
 * @param {string} path
 */
const clean = (path) =>
  path.replace(`${configDir}/`, '').replace('.json', '').split('/', 2)

const handle = (rawFile, domain, event) => {
  switch (rawFile) {
    case 'loginPage':
    case 'donationPage':
    case 'messageOfTheDay':
      log.info(HELPERS.config, `[${event}]`, rawFile, domain || '')
      if (domain && config.multiDomainsObj[domain]?.[rawFile]) {
        config.multiDomainsObj[domain][rawFile] = checkConfigJsons(
          rawFile,
          domain,
        )
      } else {
        config.map[rawFile] = checkConfigJsons(rawFile)
      }
      break
    default:
      break
  }
}
watcher.on('change', (path) => {
  const [rawFile, domain] = clean(path)
  handle(rawFile, domain, 'CHANGE')
})

watcher.on('add', (path) => {
  const [rawFile, domain] = clean(path)
  handle(rawFile, domain, 'ADD')
})

module.exports = watcher

process.on('SIGINT', () => {
  watcher.close()
  process.exit(0)
})
