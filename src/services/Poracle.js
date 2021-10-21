export default class Poracle {
  static filterGenerator = (poracleInfo, reactMapFilters) => {
    if (!poracleInfo) {
      return {}
    }
    const { info: { pokemon, raid, egg }, human } = poracleInfo
    const filters = {
      pokemon: {
        global: pokemon.defaults,
      },
      raid: {
        global: pokemon.defaults,
      },
      egg: {
        global: pokemon.defaults,
      },
    }
    Object.keys(reactMapFilters.pokemon.filter).forEach(key => {
      filters.pokemon[key] = {
        ...pokemon.defaults,
        pokemon_id: +key.split('-')[0],
        form: +key.split('-')[1],
        profile_no: human.current_profile_no,
        enabled: false,
      }
      filters.raid[key] = {
        ...raid.defaults,
        pokemon_id: +key.split('-')[0],
        form: +key.split('-')[1],
        profile_no: human.current_profile_no,
        enabled: false,
      }
    })
    // Object.keys(reactMapFilters.pokestops.filter).forEach(key => {
    //   if (key.startsWith('i')) {
    //     filters.invasion[key] = {
    //       ...invasion.defaults,
    //       grunt_type: +key.slice[1],
    //       enabled: false,
    //     }
    //   }
    // })
    Object.keys(reactMapFilters.gyms.filter).forEach(key => {
      if (key.startsWith('r')) {
        filters.raid[key] = {
          ...raid.defaults,
          level: +key.slice(1),
          profile_no: human.current_profile_no,
          enabled: false,
        }
      }
      if (key.startsWith('e')) {
        filters.egg[key] = {
          ...egg.defaults,
          level: +key.slice(1),
          profile_no: human.current_profile_no,
          enabled: false,
        }
      }
    })
    return filters
  }

  static getMapCategory(poracleCategory) {
    switch (poracleCategory) {
      case 'egg': return 'gyms'
      case 'raid': return 'gyms'
      default: return poracleCategory
    }
  }

  static getFilterCategories(poracleCategory) {
    switch (poracleCategory) {
      case 'egg': return ['eggs']
      case 'raid': return ['raids', 'pokemon']
      default: return [poracleCategory]
    }
  }

  static getId(id) {
    switch (id.charAt(0)) {
      case 'e': return { id: id.replace('e', ''), type: 'egg' }
      case 'r': return { id: id.replace('r', ''), type: 'raid' }
      default: return { pokemonId: id.split('-')[0], form: id.split('-')[1], type: 'pokemon' }
    }
  }

  static getTitles(idObj, type) {
    switch (type) {
      case 'egg': return [`egg_${idObj.id}_plural`]
      case 'raid': return [`raid_${idObj.id}_plural`]
      default: return [`poke_${idObj.pokemonId}`, +idObj.form ? `form_${idObj.form}` : '']
    }
  }

  static reactMapFriendly(values) {
    const reactMapFriendly = {}
    Object.keys(values).forEach(key => {
      if (key === 'min_time') {
        reactMapFriendly[key] = values[key]
      } else if (key.startsWith('min')) {
        const trim = key.replace('min_', '')
        reactMapFriendly[trim] = [values[`min_${trim}`], values[`max_${trim}`]]
      } else if (key.startsWith('max')) {
        // do nothing, handled above
      } else if (key.startsWith('pvp')) {
        reactMapFriendly.pvp = [values.pvp_ranking_best, values.pvp_ranking_worst]
      } else if (key === 'atk' || key === 'def' || key === 'sta') {
        reactMapFriendly[`${key}_iv`] = [values[key], values[`max_${key}`]]
      } else if (key.startsWith('rarity')) {
        reactMapFriendly.rarity = [values[key], values[`max_${key}`]]
      } else {
        reactMapFriendly[key] = values[key]
      }
    })
    return reactMapFriendly
  }

  static processor(type, entries, defaults) {
    const pvpFields = ['pvp_ranking_league', 'pvp_ranking_best', 'pvp_ranking_worst', 'pvp_ranking_min_cp']
    const ignoredFields = ['noIv', 'byDistance', 'xs', 'xl', 'allForms', 'pvpEntry']
    switch (type) {
      case 'egg': return entries.map(egg => ({ ...defaults, ...egg, byDistance: undefined }))
      case 'raid': return entries.map(boss => {
        if (boss.allForms) {
          boss.form = defaults.form
        }
        if (boss.byDistance === false) {
          boss.distance = 0
        }
        return { ...defaults, ...boss }
      })
      default: return entries.map(pkmn => {
        const fields = ['pokemon_id', 'form', 'clean', 'distance', 'min_time', 'template', 'profile_no', 'gender', 'rarity', 'max_rarity']
        const newPokemon = {}
        if (pkmn.allForms) {
          pkmn.form = 0
        }
        if (pkmn.pvpEntry) {
          fields.push(...pvpFields)
        } else {
          fields.push(...Object.keys(pkmn).filter(key => !pvpFields.includes(key) && !ignoredFields.includes(key)))
        }
        fields.forEach(field => newPokemon[field] = pkmn[field] || defaults[field])
        return newPokemon
      })
    }
  }
}
