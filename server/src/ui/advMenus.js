// @ts-check
const { state } = require('../services/state')

const CATEGORIES = /** @type {const} */ ({
  gyms: ['teams', 'eggs', 'raids', 'pokemon'],
  pokestops: [
    'lures',
    'items',
    'quest_reward_12',
    'invasions',
    'quest_pokemon',
    'rocket_pokemon',
    'showcase',
    'quest_reward_4',
    'quest_reward_9',
    'quest_reward_3',
    'quest_reward_1',
    'general',
  ],
  stations: ['pokemon'],
  pokemon: ['pokemon'],
  nests: ['pokemon'],
})

/**
 *
 * @param {import('@rm/types').Permissions} perms
 * @returns
 */
function advMenus(perms) {
  const rarityTiers = new Set(
    Object.values(state.event.masterfile.pokemon).map((val) => val.rarity),
  )
  const historicalTiers = new Set(
    Object.values(state.event.masterfile.pokemon).map((val) => val.historic),
  )
  const generations = [
    ...new Set(
      Object.values(state.event.masterfile.pokemon).map(
        (val) => `generation_${val.genId}`,
      ),
    ),
  ].filter((val) => val !== undefined)
  const types = Object.keys(state.event.masterfile.types)
    .map((key) => `poke_type_${key}`)
    .filter((val) => val !== 'poke_type_0')

  const forms = Object.entries(
    Object.values(state.event.masterfile.pokemon).reduce((acc, val) => {
      Object.values(val.forms || {}).forEach((form) => {
        if (acc[form.name]) {
          acc[form.name] += 1
        } else {
          acc[form.name] = 1
        }
      })
      return acc
    }, /** @type {Record<string, number>} */ ({})),
  ).filter(([key, count]) => count > 10 && key !== 'Normal' && key !== 'Unset')

  const pokemonFilters = {
    generations: Object.fromEntries(generations.map((gen) => [gen, false])),
    types: Object.fromEntries(types.map((type) => [type, false])),
    rarity: Object.fromEntries(
      Array.from(rarityTiers).map((tier) => [tier, false]),
    ),
    historicRarity: Object.fromEntries(
      Array.from(historicalTiers).map((tier) => [tier, false]),
    ),
    forms: {
      normalForms: false,
      altForms: false,
      ...Object.fromEntries(forms.map((form) => [form[0], false])),
    },
    others: {
      reverse: false,
      selected: false,
      unselected: false,
      onlyAvailable: true,
    },
  }

  const returnObj = {
    gyms: {
      categories: CATEGORIES.gyms,
      filters: {
        ...pokemonFilters,
        categories: Object.fromEntries(
          CATEGORIES.gyms.map((item) => [item, false]),
        ),
      },
    },
    pokestops: {
      categories: CATEGORIES.pokestops,
      filters: {
        ...pokemonFilters,
        categories: Object.fromEntries(
          CATEGORIES.pokestops.map((item) => [item, false]),
        ),
      },
    },
    stations: {
      categories: perms?.dynamax ? CATEGORIES.stations : [],
      filters: perms.dynamax
        ? {
            ...pokemonFilters,
            categories: Object.fromEntries(
              CATEGORIES.stations.map((item) => [item, false]),
            ),
          }
        : {},
    },
    pokemon: {
      categories: CATEGORIES.pokemon,
      filters: {
        ...pokemonFilters,
        categories: Object.fromEntries(
          CATEGORIES.pokemon.map((item) => [item, false]),
        ),
      },
    },
    nests: {
      categories: CATEGORIES.nests,
      filters: {
        ...pokemonFilters,
        categories: Object.fromEntries(
          CATEGORIES.nests.map((item) => [item, false]),
        ),
      },
    },
  }

  return returnObj
}

module.exports = { advMenus }
