const fs = require('fs')
const path = require('path')

const appLocalesFolder = path.resolve(__dirname, '../public/base-locales')
const finalLocalesFolder = path.resolve(__dirname, '../public/locales')
const pogoLocalesFolder = path.resolve(__dirname, '../node_modules/pogo-translations/static/locales')

fs.readdir(appLocalesFolder, (err, files) => {
  let pogoLocalesFiles = []

  if (fs.existsSync(pogoLocalesFolder)) {
    pogoLocalesFiles = fs.readdirSync(pogoLocalesFolder)
  }

  fs.mkdir(finalLocalesFolder, (error) => error ? console.log('Locales folder already exists, skipping') : console.log('locales folder created'))

  files.forEach(file => {
    const locale = path.basename(file, '.json')
    fs.mkdir(`${finalLocalesFolder}/${locale}`, (error) => error ? console.log(`${locale} already exists, skipping`) : console.log(`${locale} folder created`))

    const localeFile = 'translation.json'
    let translations = {}

    console.log('Creating locale', locale)

    if (pogoLocalesFiles.includes(`${locale}.json`)) {
      console.log('Found pogo-translations for locale', locale)

      const pogoTranslations = fs.readFileSync(
        path.resolve(pogoLocalesFolder, `${locale}.json`),
        { encoding: 'utf8', flag: 'r' },
      )
      translations = JSON.parse(pogoTranslations.toString())
      Object.keys(translations).forEach(key => {
        translations[key] = translations[key].replace('%', '{')
        translations[key] = translations[key].replace('}', '}}')
      })
    }

    if (locale !== 'en') {
      // include en as fallback first
      const appTransFallback = fs.readFileSync(
        path.resolve(appLocalesFolder, 'en.json'),
        { encoding: 'utf8', flag: 'r' },
      )
      translations = Object.assign(translations, JSON.parse(appTransFallback.toString()))
    }

    const appTranslations = fs.readFileSync(path.resolve(appLocalesFolder, file), { encoding: 'utf8', flag: 'r' })
    translations = Object.assign(translations, JSON.parse(appTranslations.toString()))

    fs.writeFile(
      path.resolve(finalLocalesFolder, locale, localeFile),
      JSON.stringify(translations, null, 2),
      'utf8',
      () => { },
    )
    console.log(localeFile, 'file saved.')
  })
})
