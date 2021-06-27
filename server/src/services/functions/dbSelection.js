const { database: { schemas } } = require('../config')

module.exports = function dbSelection(category) {
  if (category === 'quest' || category === 'invasion' || category === 'lure') category = 'pokestop'
  if (category === 'raid') category = 'gym'
  const db = Object.values(schemas).find(({ useFor }) => useFor.includes(category))
  return db.type
}
