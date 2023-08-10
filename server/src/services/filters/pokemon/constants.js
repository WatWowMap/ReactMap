const { raw } = require('objection')
const config = require('../../config')
const PokemonFilter = require('./Frontend')

const LEVEL_CALC =
  'IFNULL(IF(cp_multiplier < 0.734, ROUND(58.35178527 * cp_multiplier * cp_multiplier - 2.838007664 * cp_multiplier + 0.8539209906), ROUND(171.0112688 * cp_multiplier - 95.20425243)), NULL)'

const IV_CALC =
  'IFNULL((individual_attack + individual_defense + individual_stamina) / 0.45, NULL)'

/**
 * @type {['great', 'ultra', 'little']}
 */
const LEAGUES = config.api.pvp.leagues.map((league) => league.name)

/**
 * @type {number[]}
 */
const LEVELS = config.api.pvp.levels.slice().sort((a, b) => a - b)

const BASE_KEYS = /** @type {const} */ ([
  'iv',
  'cp',
  'level',
  'atk_iv',
  'def_iv',
  'sta_iv',
  'gender',
  'xxs',
  'xxl',
])

const KEYS = /** @type {const} */ ([...BASE_KEYS, ...LEAGUES])

const MAD_KEY_MAP = /** @type {const} */ ({
  iv: raw(IV_CALC),
  level: raw(LEVEL_CALC),
  atk_iv: 'individual_attack',
  def_iv: 'individual_defense',
  sta_iv: 'individual_stamina',
  gender: 'pokemon.gender',
  cp: 'cp',
})

const STANDARD = new PokemonFilter()

module.exports = {
  LEVELS,
  KEYS,
  IV_CALC,
  LEAGUES,
  LEVEL_CALC,
  MAD_KEY_MAP,
  STANDARD,
  BASE_KEYS,
}
