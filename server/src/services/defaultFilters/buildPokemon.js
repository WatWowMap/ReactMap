/* eslint-disable no-restricted-syntax */
const masterfile = require('../../data/masterfile.json')

module.exports = function buildPokemon(perms, type) {
  const pokemon = {}
  for (const [i, pkmn] of Object.entries(masterfile.pokemon)) {
    const forms = Object.keys(pkmn.forms)
    for (let j = 0; j < forms.length; j += 1) {
      const formId = forms[j]
      if (type === 'pokemon') {
        pokemon[`${i}-${formId}`] = {
          enabled: false,
          size: 'md',
          iv: perms.iv ? [80, 100] : [0, 100],
          gl: [1, 100],
          ul: [1, 100],
          atk: [0, 15],
          def: [0, 15],
          sta: [0, 15],
          level: [0, 35],
        }
      } else if (perms) {
        pokemon[`${i}-${formId}`] = {
          enabled: true,
          size: 'md',
        }
      }
    }
  }
  return pokemon
}
