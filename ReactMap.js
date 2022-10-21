/* eslint-disable import/extensions */
const { generate } = require('./server/scripts/generateMasterfile')
const { locales } = require('./server/scripts/createLocales')
const { connection } = require('./server/knexfile.cjs')

connection.migrate.latest().then(() =>
  generate(true).then(() =>
    locales()
      .then(() => require('./esbuild.config.js'))
      .then(() => require('./server/src/index')),
  ),
)
