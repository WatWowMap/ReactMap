/* eslint-disable max-classes-per-file */

class GenericFilter {
  constructor(enabled, size) {
    this.enabled = enabled || false
    this.size = size || 'md'
  }
}

class PokemonFilter extends GenericFilter {
  constructor(iv, great, ultra, little, level, atk, def, sta, enabled, size) {
    super(enabled, size)
    this.iv = iv || [0, 100]
    this.great = great || [1, 100]
    this.ultra = ultra || [1, 100]
    this.little = little || [1, 100]
    this.atk_iv = atk || [0, 15]
    this.def_iv = def || [0, 15]
    this.sta_iv = sta || [0, 15]
    this.level = level || [1, 35]
    this.adv = ''
  }
}

module.exports = { GenericFilter, PokemonFilter }
