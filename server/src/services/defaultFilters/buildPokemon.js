/* eslint-disable no-restricted-syntax */
const masterfile = require('../../data/masterfile.json')

module.exports = function buildPokemon(perms, type) {
  const pokemon = {}
  for (const [i, pkmn] of Object.entries(masterfile.pokemon)) {
    const forms = Object.keys(pkmn.forms)
    for (let j = 0; j < forms.length; j += 1) {
      const formId = forms[j]
      if (!pokemon[`${i}-${formId}`]) {
        if (type === 'pokemon') {
          pokemon[`${i}-${formId}`] = {
            enabled: false,
            size: 'md',
            iv: perms.iv ? [80, 100] : undefined,
            gl: perms.pvp ? [1, 10] : undefined,
            ul: perms.pvp ? [1, 5] : undefined,
            atk: perms.stats ? [0, 15] : undefined,
            def: perms.stats ? [0, 15] : undefined,
            sta: perms.stats ? [0, 15] : undefined,
            level: perms.stats ? [0, 35] : undefined,
          }
        } else {
          pokemon[`${i}-${formId}`] = {
            enabled: true,
            size: 'md',
          }
        }
      }
    }
  }
  return pokemon
}
