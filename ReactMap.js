/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/extensions */
const { build } = require('vite')
const { generate } = require('./server/scripts/generateMasterfile')
const { locales } = require('./server/scripts/createLocales')
const { connection } = require('./server/knexfile.cjs')
const viteConfig = require('./vite.config')

connection.migrate.latest().then(() =>
  generate(true).then(() =>
    locales()
      .then(() => build(viteConfig))
      .then(() => console.log('[BUILD] React Map Compiled'))
      .then(() => require('./server/src/index')),
  ),
)
