// server/test/reactMapDb.test.js
const { test, expect } = require('bun:test')
const { resolveReactMapSchema } = require('../src/db/react-map-db')

test('picks the schema that declares a reactmap useFor category', () => {
  const schemas = [
    { host: 'scanner', useFor: ['pokemon', 'gym'] },
    { host: 'rm', useFor: ['user', 'session'] },
  ]
  expect(resolveReactMapSchema(schemas)).toEqual(schemas[1])
})

test('ignores schemas with an empty useFor', () => {
  const schemas = [
    { host: 'a', useFor: [] },
    { host: 'b', useFor: ['user'] },
  ]
  expect(resolveReactMapSchema(schemas)).toEqual(schemas[1])
})

test('returns null when no schema serves reactmap categories', () => {
  expect(resolveReactMapSchema([{ host: 'a', useFor: ['pokemon'] }])).toBeNull()
})

test('returns null for an empty schema list', () => {
  expect(resolveReactMapSchema([])).toBeNull()
})

test('only user selects, matching DbManager', () => {
  // DbManager.js:118 sets reactMapDb on `User` and nothing else. A schema
  // carrying session or backup without user is one DbManager would reject.
  expect(
    resolveReactMapSchema([{ host: 'a', useFor: ['session', 'backup'] }]),
  ).toBeNull()
  expect(
    resolveReactMapSchema([{ host: 'a', useFor: ['nest', 'portal'] }]),
  ).toBeNull()
})
