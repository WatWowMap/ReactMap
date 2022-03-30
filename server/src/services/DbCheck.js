const models = require('../models/index')

module.exports = class DbCheck {
  constructor() {
    this.pvpV2 = false;

    (async () => {
      await this.pvp()
    })()
  }

  async pvp() {
    try {
      await models.Pokemon.query().whereNotNull('pvp').limit(1)
      this.pvpV2 = true
    } catch (e) {
      this.pvpV2 = false
    }
  }
}
