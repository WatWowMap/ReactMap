// @ts-check
const fs = require('fs')
const { resolve } = require('path')

const { log, HELPERS } = require('@rm/logger')

const LOCALES_ORIGIN = resolve(__dirname, './translations')

/** @param {string} destination */
async function missing(destination) {
  const localTranslations = fs.readdirSync(LOCALES_ORIGIN)
  const englishRef = JSON.parse(
    fs.readFileSync(resolve(LOCALES_ORIGIN, 'en.json'), 'utf-8'),
  )

  fs.mkdirSync(destination, { recursive: true })

  localTranslations
    .filter((x) => x.endsWith('json'))
    .forEach((locale) => {
      const reactMapTranslations = JSON.parse(
        fs.readFileSync(resolve(LOCALES_ORIGIN, locale), 'utf-8'),
      )
      const missingKeys = {}

      Object.keys(englishRef).forEach((key) => {
        if (!reactMapTranslations[key]) {
          missingKeys[key] = process.argv.includes('--ally')
            ? `t('${key}')`
            : englishRef[key]
        }
      })
      fs.writeFile(
        resolve(
          destination,
          process.argv.includes('--ally')
            ? locale.replace('.json', '.js')
            : locale,
        ),
        JSON.stringify(missingKeys, null, 2),
        'utf8',
        () => {},
      )
      log.info(HELPERS.locales, locale, 'file saved.')
    })
}

module.exports.missing = missing

if (require.main === module) {
  missing(resolve(__dirname, '../missing-locales'))
}
