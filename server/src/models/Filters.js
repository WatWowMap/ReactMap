/* eslint-disable max-classes-per-file */

class GenericFilter {
  constructor() {
    this.enabled = false
    this.size = 'md'
  }
}

class PokemonFilter extends GenericFilter {
  constructor(enabled, size) {
    super(enabled, size)
    this.iv = [0, 100]
    this.gl = [1, 100]
    this.ul = [1, 100]
    this.atk = [0, 15]
    this.def = [0, 15]
    this.sta = [0, 15]
    this.level = [1, 35]
    this.adv = ''
  }
}

module.exports = { GenericFilter, PokemonFilter }
