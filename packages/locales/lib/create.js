// @ts-check
const { default: fetch } = require('node-fetch')

const config = require('@rm/config')
const { log, HELPERS } = require('@rm/logger')

const {
  fetchRemote,
  readAndParseJson,
  readLocaleDirectory,
  writeAll,
} = require('./utils')

/**
 * Create locale files from human, AI, and remote locales
 * @returns {Promise<Record<string, Record<string, string>>>}
 */
async function create() {
  const endpoint = config.getSafe('api.pogoApiEndpoints.translations')

  if (!endpoint) {
    log.error(HELPERS.locales, 'No translations endpoint')
    return
  }
  const localTranslations = readLocaleDirectory(true)

  const englishRef = await readAndParseJson('en.json', true)

  const availableRemote = await fetch(`${endpoint}/index.json`)
    .then((res) => res.json())
    .then((res) => new Set(res))

  const translated = await Promise.allSettled(
    localTranslations.map(async (fileName) => {
      const locale = fileName.replace('.json', '')

      const humanLocales = await readAndParseJson(fileName, true)
      const aiLocales = await readAndParseJson(fileName, false)

      if (!availableRemote.has(fileName)) {
        log.warn(
          HELPERS.locales,
          'No remote translation found for',
          fileName,
          'using English',
        )
      }

      const trimmedRemoteFiles = await fetchRemote(
        availableRemote.has(fileName) ? locale : 'en',
        endpoint,
      )

      /** @type {Record<string, string>} */
      const finalTranslations = {
        ...englishRef,
        ...aiLocales,
        ...trimmedRemoteFiles,
        ...humanLocales,
      }

      log.info(HELPERS.locales, fileName, 'done.')
      return [locale, finalTranslations]
    }),
  )
  return Object.fromEntries(
    translated.map((x) => x.status === 'fulfilled' && x.value).filter(Boolean),
  )
}

module.exports.create = create

if (require.main === module) {
  create()
    .then((locales) =>
      writeAll(locales, true, __dirname, '../../../dist/locales'),
    )
    .then(() => log.info(HELPERS.locales, 'locales have finished'))
}
