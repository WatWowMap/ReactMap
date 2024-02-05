// @ts-check
class BaseFilter {
  /**
   *
   * @param {boolean} [enabled]
   * @param {'sm' | 'md' | 'lg' | 'xl'} [size]
   * @param {boolean} [all]
   */
  constructor(enabled, size, all) {
    this.enabled = enabled || false
    this.size = size || 'md'
    this.all = all || false
    this.adv = ''
  }
}

module.exports = BaseFilter
