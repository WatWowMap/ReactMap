// @ts-check

const AND_KEYS = /** @type {const} */ ([
  'iv',
  'atk_iv',
  'def_iv',
  'sta_iv',
  'cp',
  'level',
])

const BASE_KEYS = /** @type {const} */ ([...AND_KEYS, 'gender', 'xxs', 'xxl'])

module.exports = {
  AND_KEYS,
  BASE_KEYS,
}
