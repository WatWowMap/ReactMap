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

/** @param {import('./generate').I18nObject} json */
function filter(json) {
  return Object.fromEntries(
    Object.entries(json).filter(
      ([key, value]) =>
        typeof value !== 'number' && !key.startsWith('locale_selection_'),
    ),
  )
}

function getStatus() {
  const humanEnglish = JSON.parse(
    readFileSync(resolve(__dirname, HUMAN_LOCALES, 'en.json'), 'utf-8'),
  )
  const filtered = filter(humanEnglish)
  const total = Object.keys(filtered).length

  return Object.fromEntries(
    readLocaleDirectory(true).map((locale) => {
      const humanJson = filter(
        JSON.parse(
          readFileSync(resolve(__dirname, HUMAN_LOCALES, locale), 'utf-8'),
        ),
      )
      const humanHas = Object.keys(filtered).filter(
        (key) => key in humanJson,
      ).length
      const aiJson = filter(
        JSON.parse(
          readFileSync(resolve(__dirname, AI_LOCALES, locale), 'utf-8'),
        ),
      )
      const mergedSize = Object.keys({ ...aiJson, ...humanJson }).length
      const human = (humanHas / total) * 100
      const localeTotal = (mergedSize / total) * 100
      return [
        locale.replace('.json', ''),
        {
          human: +human.toFixed(2),
          ai: +(localeTotal - human).toFixed(2),
          total: +localeTotal.toFixed(2),
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
