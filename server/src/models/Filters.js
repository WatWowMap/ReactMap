/* eslint-disable max-classes-per-file */
const { database: { settings: { leagues } } } = require('../services/config.js')

class GenericFilter {
  constructor(enabled, size) {
    this.enabled = enabled || false
    this.size = size || 'md'
  }
}

class PokemonFilter extends GenericFilter {
  constructor(iv, level, atk, def, sta, enabled, size) {
    super(enabled, size)
    this.iv = iv || [0, 100]
    this.atk_iv = atk || [0, 15]
    this.def_iv = def || [0, 15]
    this.sta_iv = sta || [0, 15]
    this.level = level || [1, 35]
    this.adv = ''
  }

  pvp(values) {
    leagues.forEach(league => this[league] = values || [1, 100])
  }
}

module.exports = { GenericFilter, PokemonFilter }
