// @ts-check
const fs = require('fs')
const path = require('path')

const i18next = require('i18next')
const Backend = require('i18next-fs-backend')

const { locales } = require('@rm/locales')
const { log, TAGS } = require('@rm/logger')
const { create, writeAll } = require('@rm/locales')

/** @param {string} localePath */
const starti18n = async (localePath) => {
  if (!fs.existsSync(localePath)) {
    const localeData = await create()
    await writeAll(localeData, true, localePath)
  }
  // @ts-ignore
  i18next.use(Backend).init(
    {
      lng: 'en',
      fallbackLng: 'en',
      ns: ['translation'],
      defaultNS: 'translation',
      supportedLngs: locales,
      preload: locales,
      backend: { loadPath: path.resolve(localePath, '{{lng}}/{{ns}}.json') },
    },
    (err) => {
      if (err) return log.error(TAGS.i18n, err)
    },
  )
}

module.exports = { starti18n }
