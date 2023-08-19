// @ts-check
const config = require('@rm/config')
const BaseFilter = require('../Base')

module.exports = class PokemonFilter extends BaseFilter {
  /**
   * @param {boolean} [enabled]
   * @param {'sm' | 'md' | 'lg' | 'xl'} [size]
   * @param {number[]} [iv]
   * @param {number[]} [level]
   * @param {number[]} [atk]
   * @param {number[]} [def]
   * @param {number[]} [sta]
   * @param {number[]} [pvp]
   * @param {number} [gender]
   * @param {number[]} [cp]
   * @param {boolean} [xxs]
   * @param {boolean} [xxl]
   */
  constructor(
    enabled,
    size,
    iv,
    level,
    atk,
    def,
    sta,
    pvp,
    gender,
    cp,
    xxs,
    xxl,
  ) {
    super(enabled, size)
    this.iv = iv || [0, 100]
    this.atk_iv = atk || [0, 15]
    this.def_iv = def || [0, 15]
    this.sta_iv = sta || [0, 15]
    this.level = level || [1, 35]
    this.cp = cp || [10, 5000]
    this.gender = gender || 0
    this.xxs = xxs || false
    this.xxl = xxl || false
    config
      .getSafe('api.pvp.leagues')
      .forEach(
        (league) =>
          (this[league.name] = pvp || [
            league.minRank || 1,
            league.maxRank || 100,
          ]),
      )
  }
}
