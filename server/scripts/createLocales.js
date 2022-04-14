/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')

const fetchJson = require('../src/services/api/fetchJson')

const appLocalesFolder = path.resolve(__dirname, '../../public/base-locales')
const finalLocalesFolder = path.resolve(__dirname, '../../public/locales')
const missingFolder = path.resolve(__dirname, '../../public/missing-locales')

const locales = async () => {
  const localTranslations = await fs.promises.readdir(appLocalesFolder)
  const englishRef = fs.readFileSync(path.resolve(appLocalesFolder, 'en.json'), { encoding: 'utf8', flag: 'r' })

  fs.mkdir(finalLocalesFolder, (error) => error ? console.log('[LOCALES] Locales folder already exists, skipping') : console.log('[LOCALES] locales folder created'))

  const availableRemote = await fetchJson('https://raw.githubusercontent.com/WatWowMap/pogo-translations/master/index.json')

  await Promise.all(localTranslations.map(async locale => {
    const reactMapTranslations = fs.readFileSync(path.resolve(appLocalesFolder, locale), { encoding: 'utf8', flag: 'r' })
    const baseName = locale.replace('.json', '')
    const trimmedRemoteFiles = {}

    fs.mkdir(`${finalLocalesFolder}/${baseName}`, (error) => error ? {} : console.log(`[LOCALES] ${locale} folder created`))

    try {
      const hasRemote = availableRemote.includes(locale)
      const remoteFiles = await fetchJson(`https://raw.githubusercontent.com/WatWowMap/pogo-translations/master/static/locales/${hasRemote ? baseName : 'en'}.json`)

      if (!hasRemote) {
        console.warn('[LOCALES] No remote translation found for', locale, 'using English')
      }

      Object.keys(remoteFiles).forEach(key => {
        if (!key.startsWith('desc_') && !key.startsWith('pokemon_category_')) {
          if (key.startsWith('quest_') || key.startsWith('challenge_')) {
            trimmedRemoteFiles[key] = remoteFiles[key]
              .replace(/%\{/g, '{{')
              .replace(/\}/g, '}}')
          } else {
            trimmedRemoteFiles[key] = remoteFiles[key]
          }
        }
      })
    } catch (e) {
      console.warn(e, '\n', locale)
    }

    const finalTranslations = {
      ...JSON.parse(englishRef),
      ...trimmedRemoteFiles,
      ...JSON.parse(reactMapTranslations),
    }
    fs.writeFile(
      path.resolve(finalLocalesFolder, baseName, 'translation.json'),
      JSON.stringify(finalTranslations, null, 2),
      'utf8',
      () => { },
    )
    console.log(`[LOCALES] ${locale}`, 'file saved.')
  }))
}

const missing = async () => {
  const localTranslations = await fs.promises.readdir(appLocalesFolder)
  const englishRef = JSON.parse(fs.readFileSync(path.resolve(appLocalesFolder, 'en.json'), { encoding: 'utf8', flag: 'r' }))

  fs.mkdir(missingFolder, (error) => error ? {} : console.log('[LOCALES] Locales folder created'))

  localTranslations.forEach(locale => {
    const reactMapTranslations = JSON.parse(fs.readFileSync(path.resolve(appLocalesFolder, locale), { encoding: 'utf8', flag: 'r' }))
    const missingKeys = {}

    Object.keys(englishRef).forEach(key => {
      if (!reactMapTranslations[key]) {
        missingKeys[key] = englishRef[key]
      }
    })
    fs.writeFile(
      path.resolve(missingFolder, locale),
      JSON.stringify(missingKeys, null, 2),
      'utf8',
      () => { },
    )
    console.log(`[LOCALES] ${locale}`, 'file saved.')
  })
}

module.exports.locales = locales
module.exports.missing = missing

if (require.main === module) {
  locales().then(() => console.log('[LOCALES] Translations generated'))

  if (process.argv[2] === '--missing') {
    missing().then(() => console.log('[LOCALES] Missing translations generated'))
  }
}
