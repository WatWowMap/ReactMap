const path = require('path')

const i18next = require('i18next')
const Backend = require('i18next-fs-backend')

const { locales } = require('@rm/locales')
const { log, HELPERS } = require('@rm/logger')

i18next.use(Backend).init(
  {
    lng: 'en',
    fallbackLng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    supportedLngs: locales,
    preload: locales,
    backend: {
      loadPath: path.resolve(
        __dirname,
        `../../../dist${
          process.env.NODE_CONFIG_ENV ? `-${process.env.NODE_CONFIG_ENV}` : ''
        }/locales/{{lng}}/{{ns}}.json`,
      ),
    },
  },
  (err) => {
    if (err) return log.error(HELPERS.i18n, err)
  },
)
