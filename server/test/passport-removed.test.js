// server/test/passport-removed.test.js
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

test('the Express entry point is gone, and its replacement references neither passport nor Express', () => {
  expect(fs.existsSync(path.join(serverSrc, 'index.js'))).toBe(false)
  const entry = fs.readFileSync(path.join(serverSrc, 'serve.js'), 'utf8')
  expect(entry).not.toContain('passport')
  expect(entry).not.toContain('sessionMiddleware')
  expect(entry).not.toContain('express')
})

test('passport and Express packages are no longer dependencies', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'),
  )
  const deps = Object.keys(pkg.dependencies || {})
  expect(deps.filter((d) => d.startsWith('passport'))).toEqual([])
  expect(deps).not.toContain('express-session')
  expect(deps).not.toContain('express-mysql-session')
  expect(deps).not.toContain('express')
  expect(deps).not.toContain('@apollo/server')
  expect(deps).not.toContain('compression')
  expect(deps).not.toContain('cors')
  expect(deps).not.toContain('body-parser')
  expect(deps).not.toContain('helmet')
})
