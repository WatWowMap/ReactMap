// @ts-check
const { promises: fs, readdirSync, readFileSync } = require('fs')
const { resolve } = require('path')
const { default: fetch } = require('node-fetch')

const { log, HELPERS } = require('@rm/logger')

const HUMAN_LOCALES = resolve(__dirname, './human')

const AI_LOCALES = resolve(__dirname, './generated')

/**
 * Fetch remote translations from the locales repository
 * @param {string} locale
 * @param {string} endpoint
 * @returns {Promise<Record<string, string>>}
 */
async function fetchRemote(locale, endpoint) {
  try {
    const remoteFiles = await fetch(
      `${endpoint}/static/locales/${locale}.json`,
    ).then((res) => res.json())

    return Object.fromEntries(
      Object.entries(remoteFiles)
        .filter(
          ([key]) =>
            !key.startsWith('desc_') && !key.startsWith('pokemon_category_'),
        )
        .map(([key, value]) => {
          if (key.startsWith('quest_') || key.startsWith('challenge_')) {
            return [key, value.replace(/%\{/g, '{{').replace(/\}/g, '}}')]
          }
          return [key, value]
        }),
    )
  } catch (e) {
    log.error(HELPERS.locales, `[${locale}]`, e)
  }
}

/**
 * Read and parse a JSON file, optionally from the human or AI locales
 * @param {string} fileName
 * @param {boolean} [human]
 * @returns {Promise<Record<string, string>>}
 */
async function readAndParseJson(fileName, human = false) {
  const file = await fs.readFile(
    resolve(__dirname, human ? HUMAN_LOCALES : AI_LOCALES, fileName),
    'utf-8',
  )
  return JSON.parse(file)
}

function readLocaleDirectory(human = false) {
  return readdirSync(human ? HUMAN_LOCALES : AI_LOCALES)
}

/**
 * @param {Record<string, string> | string} translations
 * @param {string[]} directories
 */
async function writeJson(translations, ...directories) {
  try {
    const resolved = resolve(...directories)
    const file =
      typeof translations === 'string'
        ? translations
        : JSON.stringify(translations, null, 2)

    await fs.writeFile(resolved, file, 'utf8')
    log.info(HELPERS.locales, 'wrote file', `${resolved.split('/').pop()}`)
  } catch (e) {
    log.error(HELPERS.locales, '[writeJson]', e)
  }
}

/**
 * @param {Record<string, Record<string, string>>} locales
 * @param {boolean} i18nFormat
 * @param {string[]} directories
 */
async function writeAll(locales, i18nFormat, ...directories) {
  const resolved = directories.length
    ? resolve(...directories)
    : resolve(__dirname, 'data')
  await fs.mkdir(resolved, { recursive: true })
  await Promise.all(
    Object.entries(locales).map(async ([locale, translations]) => {
      const finalLocation = i18nFormat
        ? resolve(resolved, locale, 'translation.json')
        : resolve(resolved, `${locale}.json`)
      if (i18nFormat) {
        await fs.mkdir(resolve(resolved, locale), { recursive: true })
      }
      return writeJson(translations, finalLocation)
    }),
  )
}

function getStatus() {
  const english = JSON.parse(
    readFileSync(resolve(__dirname, HUMAN_LOCALES, 'en.json'), 'utf-8'),
  )
  const filtered = Object.fromEntries(
    Object.entries(english).filter(
      ([key, value]) =>
        typeof value !== 'number' && !key.startsWith('locale_selection_'),
    ),
  )

  const locales = readLocaleDirectory(true)

  return Object.fromEntries(
    locales.map((locale) => {
      const human = JSON.parse(
        readFileSync(resolve(__dirname, HUMAN_LOCALES, locale), 'utf-8'),
      )
      const ai = JSON.parse(
        readFileSync(resolve(__dirname, AI_LOCALES, locale), 'utf-8'),
      )
      return [
        locale.replace('.json', ''),
        {
          human: !Object.keys(filtered).filter((key) => !(key in human)).length,
          ai: !Object.keys(filtered).filter((key) => !(key in ai)).length,
          partial: !!Object.keys(human).length,
        },
      ]
    }),
  )
}

module.exports = {
  fetchRemote,
  readAndParseJson,
  readLocaleDirectory,
  writeAll,
  getStatus,
}
