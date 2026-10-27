const assert = require('node:assert/strict')
const { mock, test } = require('node:test')

const knex = require('knex')
const { QueryBuilder } = require('objection')
const config = require('@rm/config')

const { getSafe } = config
mock.method(config, 'getSafe', (key) =>
  key === 'database.settings.sessionTableName' ? 'session' : getSafe(key),
)

const { Session } = require('../src/models/Session')

const db = knex({ client: 'mysql2' })

/** The SQL a clear method would run, without a database */
function captureDelete(method, strategy) {
  let sql = ''
  const query = mock.method(Session, 'query', () => {
    const builder = QueryBuilder.forClass(Session).knex(db)
    builder.delete = () => {
      QueryBuilder.prototype.delete.call(builder)
      sql = builder.toKnexQuery().toString()
      return Promise.resolve(0)
    }
    return builder
  })
  return Session[method](strategy).then(() => {
    query.mock.restore()
    return sql
  })
}

test('trial boundaries clear linked sessions whose trial came from that strategy, donor or not', async () => {
  const sql = await captureDelete('clearNonDonor', 'telegram')
  assert.match(
    sql,
    /^delete from `session` where \(json_extract\(data, '\$\.passport\.user\.perms\.donor'\) = false and \(json_extract\(data, '\$\.passport\.user\.rmStrategy'\) = 'telegram' or json_contains\(json_extract\(data, '\$\.passport\.user\.linkedStrategies'\), '\\"telegram\\"'\)\)\) or json_contains\(json_extract\(data, '\$\.passport\.user\.trialStrategies'\), '\\"telegram\\"'\)$/,
  )
})
