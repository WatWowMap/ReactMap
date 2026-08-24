// server/test/telegramVerify.test.js
const { test, expect } = require('bun:test')
const crypto = require('crypto')
const { verifyTelegramLogin } = require('../src/auth/telegram')

const BOT_TOKEN = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11'

function sign(payload, botToken = BOT_TOKEN) {
  const checkString = Object.keys(payload)
    .filter((k) => k !== 'hash')
    .sort()
    .map((k) => `${k}=${payload[k]}`)
    .join('\n')
  const secret = crypto.createHash('sha256').update(botToken).digest()
  const hash = crypto
    .createHmac('sha256', secret)
    .update(checkString)
    .digest('hex')
  return { ...payload, hash }
}

const now = () => Math.floor(Date.now() / 1000)

test('accepts a correctly signed, fresh payload', () => {
  const payload = sign({
    id: '42',
    first_name: 'A',
    username: 'a',
    auth_date: String(now()),
  })
  const result = verifyTelegramLogin(payload, BOT_TOKEN)
  expect(result.ok).toBe(true)
  expect(result.user.id).toBe('42')
})

test('rejects a tampered payload', () => {
  const payload = sign({ id: '42', first_name: 'A', auth_date: String(now()) })
  const result = verifyTelegramLogin({ ...payload, id: '43' }, BOT_TOKEN)
  expect(result.ok).toBe(false)
  expect(result.reason).toBe('bad-signature')
})

test('rejects a payload signed with a different bot token', () => {
  const payload = sign({ id: '42', auth_date: String(now()) }, '999:OTHER')
  expect(verifyTelegramLogin(payload, BOT_TOKEN).ok).toBe(false)
})

test('rejects a stale payload even when the signature is valid', () => {
  const stale = String(now() - 3600)
  const payload = sign({ id: '42', first_name: 'A', auth_date: stale })
  const result = verifyTelegramLogin(payload, BOT_TOKEN)
  expect(result.ok).toBe(false)
  expect(result.reason).toBe('expired')
})

test('rejects a payload with no hash', () => {
  const result = verifyTelegramLogin(
    { id: '42', auth_date: String(now()) },
    BOT_TOKEN,
  )
  expect(result.ok).toBe(false)
  expect(result.reason).toBe('bad-signature')
})

test('rejects a payload with no auth_date', () => {
  const payload = sign({ id: '42', first_name: 'A' })
  expect(verifyTelegramLogin(payload, BOT_TOKEN).ok).toBe(false)
})
