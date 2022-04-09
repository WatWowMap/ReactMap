/* eslint-disable import/extensions */
import { generate } from './server/scripts/generateMasterfile.js'
import { locales } from './server/scripts/createLocales.js'
import { connection } from './server/knexfile.cjs'

connection.migrate.latest().then(() => (
  generate(true)
    .then(() => locales()
      .then(() => import('./esbuild.config.mjs'))
      .then(() => import('./server/src/index.js')))
))
