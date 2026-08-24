// server/test/passportRemoved.test.js
const { test, expect } = require('bun:test')
const fs = require('fs')
const path = require('path')

const serverSrc = path.join(__dirname, '..', 'src')

test('the passport and session middleware files are gone', () => {
  expect(fs.existsSync(path.join(serverSrc, 'middleware/passport.js'))).toBe(
    false,
  )
  expect(fs.existsSync(path.join(serverSrc, 'middleware/session.js'))).toBe(
    false,
  )
})

test('the strategies directory is gone', () => {
  expect(fs.existsSync(path.join(serverSrc, 'strategies'))).toBe(false)
})

test('the entry point no longer references passport', () => {
  const entry = fs.readFileSync(path.join(serverSrc, 'index.js'), 'utf8')
  expect(entry).not.toContain('passport')
  expect(entry).not.toContain('sessionMiddleware')
})

test('passport packages are no longer dependencies', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'),
  )
  const deps = Object.keys(pkg.dependencies || {})
  expect(deps.filter((d) => d.startsWith('passport'))).toEqual([])
  expect(deps).not.toContain('express-session')
  expect(deps).not.toContain('express-mysql-session')
})
