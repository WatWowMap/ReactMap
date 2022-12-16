/* eslint-disable max-classes-per-file */
const {
  api: {
    pvp: { leagues },
  },
} = require('../services/config')

class GenericFilter {
  constructor(enabled, size) {
    this.enabled = enabled || false
    this.size = size || 'md'
    this.adv = ''
  }
}

class PokemonFilter extends GenericFilter {
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
    this.xss = xxs || false
    this.xxl = xxl || false
    leagues.forEach(
      (league) =>
        (this[league.name] = pvp || [
          league.minRank || 1,
          league.maxRank || 100,
        ]),
    )
  }
}

module.exports = { GenericFilter, PokemonFilter }
