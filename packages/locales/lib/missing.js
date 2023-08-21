// @ts-check
const { promises: fs } = require('fs')
const { resolve } = require('path')

const { log, HELPERS } = require('@rm/logger')
const { readAndParseJson, readLocaleDirectory } = require('./utils')

async function missing() {
  const localTranslations = readLocaleDirectory(true)
  const englishRef = await readAndParseJson('en.json', true)

  await Promise.allSettled(
    localTranslations.map(async (fileName) => {
      const humanLocales = await readAndParseJson(fileName, true)
      const aiLocales = await readAndParseJson(fileName, false)
      const combined = {
        ...aiLocales,
        ...humanLocales,
      }
      const missingKeys = {}

      Object.keys(englishRef).forEach((key) => {
        if (!combined[key]) {
          missingKeys[key] = process.argv.includes('--ally')
            ? `t('${key}')`
            : englishRef[key]
        }
      })
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
  missing().then(() => process.exit(0))
}
