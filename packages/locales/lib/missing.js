// @ts-check
const { promises: fs } = require('fs')
const { resolve } = require('path')

const { log, HELPERS } = require('@rm/logger')
const { readAndParseJson, readLocaleDirectory } = require('./utils')

/**
 *
 * @param {string} fileName
 * @returns {Promise<import('./generate').I18nObject>}
 */
async function missing(fileName) {
  const englishRef = await readAndParseJson('en.json', true)
  const humanLocales = await readAndParseJson(fileName, true)
  /** @type {import('./generate').I18nObject} */
  const missingKeys = {}

  Object.keys(englishRef)
    .sort()
    .forEach((key) => {
      if (!humanLocales[key] && !key.startsWith('locale_selection_')) {
        missingKeys[key] = process.argv.includes('--ally')
          ? `t('${key}')`
          : englishRef[key]
      }
    })
  return missingKeys
}

async function missingAll() {
  const localTranslations = readLocaleDirectory(true)
  await Promise.allSettled(
    localTranslations.map(async (fileName) => {
      const missingKeys = await missing(fileName)
      await fs.writeFile(
        resolve(
          __dirname,
          './missing',
          process.argv.includes('--ally')
            ? fileName.replace('.json', '.js')
            : fileName,
        ),
        JSON.stringify(missingKeys, null, 2),
      )
      log.info(HELPERS.locales, fileName, 'file saved.')
    }),
  )
}

module.exports.missing = missing

if (require.main === module) {
  missingAll().then(() => process.exit(0))
}
