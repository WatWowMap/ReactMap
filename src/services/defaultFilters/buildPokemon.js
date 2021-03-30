/* eslint-disable no-continue */
/* eslint-disable no-plusplus */
/* eslint-disable no-restricted-syntax */
import masterfile from '../../data/masterfile.json'

export default function buildPokemon(type) {
  const pokemon = {}
  for (const [i, pkmn] of Object.entries(masterfile.pokemon)) {
    const forms = Object.keys(pkmn.forms);
    for (let j = 0; j < forms.length; j++) {
      const skipForms = ['shadow', 'purified'];
      const formId = forms[j];
      const form = pkmn.forms[formId];
      const formName = form.name || '';
      if (skipForms.includes(formName.toLowerCase())) {
        continue;
      }
      if (pokemon[`${i}-${formId}`]) {
        continue;
      } else if (type === 'pokemon') {
        pokemon[`${i}-${formId}`] = {
          enabled: false,
          size: 'md',
          iv: [80, 100],
          gl: [1, 10],
          ul: [1, 5],
          atk: [0, 15],
          def: [0, 15],
          sta: [0, 15],
          level: [0, 35],
        }
      } else {
        pokemon[`${i}-${formId}`] = {
          enabled: true,
          size: 'md',
        }
      }
    }
  }
  return pokemon
}
