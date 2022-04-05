const {
  database: { schemas: exampleSchemas },
} = require('../configs/local.example.json')
const {
  database,
  devOptions: { queryDebug },
  api,
} = require('../services/config')

const DbCheck = require('../services/DbCheck')

const Db = new DbCheck(exampleSchemas, database, queryDebug, api)

module.exports = Db
