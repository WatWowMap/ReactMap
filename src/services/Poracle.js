export default class Poracle {
  static filterGenerator = (poracleInfo, reactMapFilters, invasions) => {
    if (!poracleInfo) {
      return {}
    }
    const { info: { pokemon, raid, egg, invasion, lure }, human } = poracleInfo
    const filters = {
      pokemon: {
        global: pokemon.defaults,
      },
      raid: {
        global: raid.defaults,
      },
      egg: {
        global: egg.defaults,
      },
      invasion: {
        global: invasion.defaults,
      },
      lure: {
        global: lure.defaults,
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
    Object.keys(reactMapFilters.pokestops.filter).forEach(key => {
      if (key.startsWith('i')) {
        filters.invasion[key] = {
          ...invasion.defaults,
          grunt_type: invasions[key.slice(1)].type.toLowerCase(),
          profile_no: human.current_profile_no,
          enabled: false,
        }
      }
      if (key.startsWith('l')) {
        filters.lure[key] = {
          ...lure.defaults,
          lure_id: key.slice(1),
          profile_no: human.current_profile_no,
          enabled: false,
        }
      }
    })
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
      case 'invasion': return 'pokestops'
      case 'lure': return 'pokestops'
      case 'raid': return 'gyms'
      default: return poracleCategory
    }
  }

  static getFilterCategories(poracleCategory) {
    switch (poracleCategory) {
      case 'egg': return ['eggs']
      case 'invasion': return ['invasions']
      case 'lure': return ['lures']
      case 'raid': return ['raids', 'pokemon']
      default: return [poracleCategory]
    }
  }

  static getId(item, category, invasions) {
    switch (category) {
      case 'egg': return `e${item.level}`
      case 'invasion': return `i${Object.keys(invasions).find(x => invasions[x].type?.toLowerCase() === item.grunt_type)}`
      case 'lure': return `l${item.lure_id}`
      case 'raid': return item.pokemon_id === 9000
        ? `r${item.level}`
        : `${item.pokemon_id}-${item.form}`
      default: return `${item.pokemon_id}-${item.form}`
    }
  }

  static getIdObj(id) {
    switch (id.charAt(0)) {
      case 'e': return { id: id.replace('e', ''), type: 'egg' }
      case 'i': return { id: id.replace('i', ''), type: 'invasion' }
      case 'l': return { id: id.replace('l', ''), type: 'lure' }
      case 'r': return { id: id.replace('r', ''), type: 'raid' }
      default: return { pokemonId: id.split('-')[0], form: id.split('-')[1], type: 'pokemon' }
    }
  }

  static getTitles(idObj, type) {
    switch (type) {
      case 'egg': return [`egg_${idObj.id}_plural`]
      case 'invasion': return [`grunt_a_${idObj.id}`]
      case 'lure': return [`lure_${idObj.id}`]
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
      case 'invasion': return entries.map(invasion => ({ ...defaults, ...invasion, byDistance: undefined }))
      case 'lure': return entries.map(lure => ({ ...defaults, ...lure, lure_id: +lure.lure_id, byDistance: undefined }))
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

  static generateDescription(pkmn, leagues, isMobile) {
    if (isMobile) {
      return pkmn.pvp_ranking_league
        ? `${leagues.find(league => league.cp === pkmn.pvp_ranking_league).name} ${pkmn.pvp_ranking_best}-${pkmn.pvp_ranking_worst}`
        : `${pkmn.min_iv}-${pkmn.max_iv}% | L${pkmn.min_level}-${pkmn.max_level}
        A${pkmn.atk}-${pkmn.max_atk} | D${pkmn.def}-${pkmn.max_def} | S${pkmn.sta}-${pkmn.max_sta}${pkmn.distance ? ` | d${pkmn.distance}` : ''}`
    }
    return pkmn.description?.replace(/\**/g, '')
  }
}
