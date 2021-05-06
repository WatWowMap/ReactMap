/* eslint-disable max-classes-per-file */

class GenericFilter {
  constructor(enabled, size) {
    this.enabled = enabled || false
    this.size = size || 'md'
  }
}

class PokemonFilter extends GenericFilter {
  constructor(enabled, size, iv, gl, ul, level, atk, def, sta) {
    super(enabled, size)
    this.iv = iv || [0, 100]
    this.gl = gl || [1, 100]
    this.ul = ul || [1, 100]
    this.atk = atk || [0, 15]
    this.def = def || [0, 15]
    this.sta = sta || [0, 15]
    this.level = level || [1, 35]
    this.adv = ''
  }
}

module.exports = { GenericFilter, PokemonFilter }
