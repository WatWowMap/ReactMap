// @ts-check
const LEVEL_CALC =
  'IFNULL(IF(cp_multiplier < 0.734, ROUND(58.35178527 * cp_multiplier * cp_multiplier - 2.838007664 * cp_multiplier + 0.8539209906), ROUND(171.0112688 * cp_multiplier - 95.20425243)), NULL)'

const IV_CALC =
  'IFNULL((individual_attack + individual_defense + individual_stamina) / 0.45, NULL)'

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
  IV_CALC,
  LEVEL_CALC,
  BASE_KEYS,
}
