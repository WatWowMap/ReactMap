const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')
const {
  buildSchema,
  parse,
  validate,
  specifiedRules,
  NoUnusedFragmentsRule,
} = require('graphql')

// PROFILE is exported as a bare fragment, so unused fragments are expected
const rules = specifiedRules.filter((r) => r !== NoUnusedFragmentsRule)

const typeDirs = path.join(__dirname, '../src/graphql/typeDefs')
const schema = buildSchema(
  fs
    .readdirSync(typeDirs)
    .filter((f) => f.endsWith('.graphql'))
    .map((f) => fs.readFileSync(path.join(typeDirs, f), 'utf8'))
    .join('\n'),
)

test('client webhook documents validate against the schema', async () => {
  // The client module is ESM importing @apollo/client; evaluate its source
  // with a minimal `gql` so the documents can be validated server-side.
  const src = fs
    .readFileSync(
      path.join(__dirname, '../../src/services/queries/webhook.js'),
      'utf8',
    )
    .replace(/^import .*$/m, '')
    .replace(/^export const (\w+) =/gm, 'const $1 = exports_.$1 =')
  const exports_ = {}
  const gql = (strings, ...values) => {
    const body = strings.reduce(
      (acc, str, i) =>
        acc + str + (values[i]?.loc ? values[i].loc.source.body : ''),
      '',
    )
    return parse(body)
  }
  // eslint-disable-next-line no-new-func
  new Function('gql', 'exports_', src)(gql, exports_)
  const mod = exports_
  const docs = Object.entries(mod).filter(([, v]) => v?.kind === 'Document')
  assert.ok(docs.length >= 15)
  assert.ok(mod.INCIDENT)
  docs.forEach(([name, doc]) => {
    const errors = validate(schema, doc, rules)
    assert.deepEqual(
      errors.map((e) => e.message),
      [],
      name,
    )
  })
})
