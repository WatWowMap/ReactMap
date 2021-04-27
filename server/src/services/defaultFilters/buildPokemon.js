/* eslint-disable no-restricted-syntax */
const masterfile = require('../../data/masterfile.json')

module.exports = function buildPokemon(perms, type) {
  const pokemon = {}
  for (const [i, pkmn] of Object.entries(masterfile.pokemon)) {
    for (const j of Object.keys(pkmn.forms)) {
      if (type === 'pokemon') {
        pokemon[`${i}-${j}`] = {
          enabled: false,
          size: 'md',
          iv: [0, 100],
          gl: [1, 100],
          ul: [1, 100],
          atk: [0, 15],
          def: [0, 15],
          sta: [0, 15],
          level: [1, 35],
          adv: '',
        }
      } else if (perms) {
        pokemon[`${i}-${j}`] = {
          enabled: true,
          size: 'md',
        }
      }
    }
  }
  if (type === 'pokemon') {
    ['ivOr', 'ivAnd'].forEach(global => {
      pokemon[global] = {
        enabled: false,
        size: 'md',
        iv: [0, 100],
        gl: [1, 100],
        ul: [1, 100],
        atk: [0, 15],
        def: [0, 15],
        sta: [0, 15],
        level: [1, 35],
        adv: '',
      }
    })
  }
  return pokemon
}
