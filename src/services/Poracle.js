export default class Poracle {
  static filterGenerator = (poracleInfo, reactMapFilters, invasions) => {
    if (!poracleInfo?.valid) {
      return {}
    }
    const { info: { pokemon, raid, egg, invasion, lure, nest, quest }, human } = poracleInfo
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
      nest: {
        global: nest.defaults,
      },
      quest: {
        global: quest.defaults,
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
      filters.nest[key] = {
        ...nest.defaults,
        pokemon_id: +key.split('-')[0],
        form: +key.split('-')[1],
        profile_no: human.current_profile_no,
        enabled: false,
      }
      filters.quest[key] = {
        ...quest.defaults,
        reward: +key.split('-')[0],
        form: +key.split('-')[1],
        profile_no: human.current_profile_no,
        reward_type: 7,
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
      if (key.startsWith('q')) {
        filters.quest[key] = {
          ...quest.defaults,
          reward: +key.slice(1),
          profile_no: human.current_profile_no,
          reward_type: 2,
          enabled: false,
        }
      }
      if (key.startsWith('c')) {
        filters.quest[key] = {
          ...quest.defaults,
          reward: +key.slice(1),
          profile_no: human.current_profile_no,
          reward_type: 4,
          enabled: false,
        }
      }
      if (key.startsWith('d')) {
        filters.quest[key] = {
          ...quest.defaults,
          profile_no: human.current_profile_no,
          reward_type: 3,
          amount: +key.slice(1),
          enabled: false,
        }
      }
      if (key.startsWith('m')) {
        filters.quest[key] = {
          ...quest.defaults,
          profile_no: human.current_profile_no,
          reward_type: 12,
          reward: +key.split('-')[0].slice(1),
          amount: +key.split('-')[1],
          enabled: false,
        }
      }
      if (key.startsWith('x')) {
        filters.quest[key] = {
          ...quest.defaults,
          reward: +key.slice(1),
          profile_no: human.current_profile_no,
          reward_type: 9,
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
      case 'egg':
      case 'raid': return 'gyms'
      case 'invasion':
      case 'lure':
      case 'quest': return 'pokestops'
      case 'nest': return 'nests'
      default: return poracleCategory
    }
  }

  static getFilterCategories(poracleCategory) {
    switch (poracleCategory) {
      case 'egg': return ['eggs']
      case 'invasion': return ['invasions']
      case 'lure': return ['lures']
      case 'nest': return ['pokemon']
      case 'raid': return ['raids', 'pokemon']
      case 'quest': return ['items', 'quest_reward_12', 'pokemon', 'quest_reward_4', 'quest_reward_9', 'quest_reward_3']
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
      case 'quest': return (function quests() {
        switch (item.reward_type) {
          case 2: return `q${item.reward}`
          case 3: return `d${item.amount}`
          case 4: return `c${item.reward}`
          case 9: return `x${item.reward}`
          case 12: return `m${item.reward}-${item.amount}`
          default: return `${item.reward}-${item.form}`
        }
      }())
      default: return `${item.pokemon_id}-${item.form}`
    }
  }

  static getIdObj(id) {
    switch (id.charAt(0)) {
      case 'e': return { id: id.replace('e', ''), type: 'egg' }
      case 'i': return { id: id.replace('i', ''), type: 'invasion' }
      case 'l': return { id: id.replace('l', ''), type: 'lure' }
      case 'r': return { id: id.replace('r', ''), type: 'raid' }
      case 'q': return { id: id.replace('q', ''), type: 'item' }
      case 'm': return { pokemonId: id.split('-')[0].replace('m', ''), type: 'pokemon' }
      case 'c': return { pokemonId: id.replace('c', ''), type: 'pokemon' }
      case 'x': return { pokemonId: id.replace('x', ''), type: 'pokemon' }
      case 'd': return { id: 3, type: 'quest_reward' }
      default: return { pokemonId: id.split('-')[0], form: id.split('-')[1], type: 'pokemon' }
    }
  }

  static getTitles(idObj) {
    switch (idObj.type) {
      case 'egg': return [`egg_${idObj.id}_plural`]
      case 'invasion': return [`grunt_a_${idObj.id}`]
      case 'lure': return [`lure_${idObj.id}`]
      case 'raid': return [`raid_${idObj.id}_plural`]
      case 'pokemon': return [`poke_${idObj.pokemonId}`, +idObj.form ? `form_${idObj.form}` : '']
      default: return [`${idObj.type}_${idObj.id}`]
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
      case 'quest': return entries.map(quest => ({ ...defaults, ...quest, byDistance: undefined }))
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

  static generateDescription(item, category, leagues, t) {
    switch (category) {
      case 'invasion': return `${t(`grunt_${item.grunt_id}`)} ${item.distance ? ` | d${item.distance}` : ''}`
      case 'lure': return `${t(`lure_${item.lure_id}`)} ${item.distance ? ` | d${item.distance}` : ''}`
      case 'quest': return `${t(`quest_reward_${item.reward_type}`)} | ${item.reward} ${item.amount}`
      case 'raid':
      case 'egg': return `Level ${item.level} ${item.exclusive ? 'Exclusive Only' : ''} ${item.clean ? 'clean' : ''} Template: ${item.template} ${item.team === 4 ? '' : item.team} ${item.gym_id ? 'Gym:' : ''}${item.distance ? ` | d${item.distance}` : ''}`
      case 'nest': return `${t(`poke_${item.pokemon_id}`)} | Min Spawn: ${item.min_spawn_avg}`
      case 'pokemon':
      default: return item.pvp_ranking_league
        ? `${leagues.find(league => league.cp === item.pvp_ranking_league).name} ${item.pvp_ranking_best}-${item.pvp_ranking_worst}`
        : `${item.min_iv}-${item.max_iv}% | L${item.min_level}-${item.max_level}
        A${item.atk}-${item.max_atk} | D${item.def}-${item.max_def} | S${item.sta}-${item.max_sta}${item.distance ? ` | d${item.distance}` : ''}`
    }
  }
}
