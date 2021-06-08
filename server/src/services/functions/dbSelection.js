const { database: { schemas } } = require('../config')

module.exports = function dbSelection(category) {
  const db = Object.values(schemas).find(({ useFor }) => useFor.includes(category))
  return db.type
}
