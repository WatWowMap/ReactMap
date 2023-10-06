// @ts-check
class BaseFilter {
  /**
   *
   * @param {boolean} [enabled]
   * @param {'sm' | 'md' | 'lg' | 'xl'} [size]
   */
  constructor(enabled, size) {
    this.enabled = enabled || false
    this.size = size || 'md'
    this.adv = ''
  }
}

module.exports = BaseFilter
