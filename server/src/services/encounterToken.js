// @ts-check
/* global BigInt */
const crypto = require('crypto')

const config = require('@rm/config')

const { getOrCreateCache } = require('./cache')

const KEY_FILE = 'encounterIdKey.json'
const ENCOUNTER_ID_RE = /^\d{1,20}$/
const TOKEN_RE = /^[\w-]{22}$/

/** @type {Buffer | null} */
let key = null

/**
 * Loads the AES-128 key from the cache dir, generating a new one if it is missing.
 * Purging the file only invalidates tokens issued before the next restart.
 * @returns {Buffer}
 */
const getKey = () => {
  if (!key) {
    const cached = getOrCreateCache(KEY_FILE, () => ({
      key: crypto.randomBytes(16).toString('base64'),
    }))
    key = Buffer.from(cached.key, 'base64')
  }
  return key
}

/**
 * Encrypts an encounter ID into an opaque token when `api.hideEncounterIds` is on.
 * The ID fills the first half of a single AES block and the zeroed second half
 * authenticates the token when it is decoded.
 * @param {string | number} id
 * @returns {string | number | null}
 */
const encodeEncounterId = (id) => {
  if (!config.getSafe('api.hideEncounterIds')) return id
  if (!ENCOUNTER_ID_RE.test(`${id}`)) return null
  const value = BigInt(id)
  if (value > 0xffffffffffffffffn) return null
  const block = Buffer.alloc(16)
  block.writeBigUInt64BE(value)
  const cipher = crypto
    .createCipheriv('aes-128-ecb', getKey(), null)
    .setAutoPadding(false)
  return Buffer.concat([cipher.update(block), cipher.final()]).toString(
    'base64url',
  )
}

/**
 * Reverses `encodeEncounterId`, returning null for anything it did not issue
 * @param {string | number} token
 * @param {{ allowRaw?: boolean }} [options] `allowRaw` also accepts a raw encounter ID, e.g. from Poracle links
 * @returns {string | number | null}
 */
const decodeEncounterId = (token, { allowRaw = false } = {}) => {
  if (!config.getSafe('api.hideEncounterIds')) return token
  if (allowRaw && ENCOUNTER_ID_RE.test(`${token}`)) return `${token}`
  if (typeof token !== 'string' || !TOKEN_RE.test(token)) return null
  const block = Buffer.from(token, 'base64url')
  // reject non-canonical encodings so every ID has exactly one valid token
  if (block.toString('base64url') !== token) return null
  const decipher = crypto
    .createDecipheriv('aes-128-ecb', getKey(), null)
    .setAutoPadding(false)
  const plain = Buffer.concat([decipher.update(block), decipher.final()])
  return plain.readBigUInt64BE(8) === 0n
    ? plain.readBigUInt64BE(0).toString()
    : null
}

module.exports = { encodeEncounterId, decodeEncounterId }
