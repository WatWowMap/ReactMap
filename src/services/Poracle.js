/* eslint-disable no-nested-ternary */
export default class Poracle {
  static filterGenerator = (poracleInfo, reactMapFilters, invasions) => {
    try {
      const {
        info: { pokemon, raid, egg, invasion, lure, nest, quest, gym },
        human,
      } = poracleInfo
      const filters = {
        pokemon: {
          global: { ...pokemon.defaults, profile_no: human.current_profile_no },
          '0-0': { ...pokemon.defaults, profile_no: human.current_profile_no },
        },
        raid: {
          global: { ...raid.defaults, profile_no: human.current_profile_no },
          r90: {
            ...raid.defaults,
            level: 90,
            profile_no: human.current_profile_no,
          },
        },
        egg: {
          global: { ...egg.defaults, profile_no: human.current_profile_no },
          e90: {
            ...egg.defaults,
            level: 90,
            profile_no: human.current_profile_no,
          },
        },
        gym: {
          global: { ...gym.defaults, profile_no: human.current_profile_no },
          t4: { ...gym.defaults, profile_no: human.current_profile_no },
        },
        invasion: {
          global: {
            ...invasion.defaults,
            profile_no: human.current_profile_no,
          },
          i0: {
            ...invasion.defaults,
            grunt_type: 'everything',
            profile_no: human.current_profile_no,
          },
          'gold-stop': {
            ...invasion.defaults,
            grunt_type: 'gold-stop',
            profile_no: human.current_profile_no,
          },
          kecleon: {
            ...invasion.defaults,
            grunt_type: 'kecleon',
            profile_no: human.current_profile_no,
          },
          showcase: {
            ...invasion.defaults,
            grunt_type: 'showcase',
            profile_no: human.current_profile_no,
          },
        },
        lure: {
          global: { ...lure.defaults, profile_no: human.current_profile_no },
        },
        nest: {
          global: { ...nest.defaults, profile_no: human.current_profile_no },
        },
        quest: {
          global: { ...quest.defaults, profile_no: human.current_profile_no },
        },
      }
      Object.keys(reactMapFilters.pokemon?.filter || {}).forEach((key) => {
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
        if (key === 'global') {
          delete filters.pokemon[key].pokemon_id
          delete filters.pokemon[key].form
          delete filters.raid[key].pokemon_id
          delete filters.raid[key].form
          delete filters.nest[key].pokemon_id
          delete filters.nest[key].form
          delete filters.quest[key].reward
          delete filters.quest[key].form
        }
      })
      Object.keys(reactMapFilters.pokestops?.filter || {}).forEach((key) => {
        if (key.startsWith('i')) {
          filters.invasion[key] = {
            ...invasion.defaults,
            grunt_type: invasions[key.slice(1)].type.toLowerCase(),
            gender: invasions[key.slice(1)].gender,
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
        if (key === 'global') {
          delete filters.invasion[key].grunt_type
          delete filters.invasion[key].gender
          delete filters.lure[key].lure_id
          delete filters.quest[key].reward
          delete filters.quest[key].reward_type
          delete filters.quest[key].amount
        }
      })
      Object.keys(reactMapFilters.gyms?.filter || {}).forEach((key) => {
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
        if (key.startsWith('t')) {
          filters.gym[key] = {
            ...gym.defaults,
            team: +key.slice(1).split('-')[0],
            profile_no: human.current_profile_no,
            enabled: false,
          }
        }
        if (key === 'global') {
          delete filters.raid[key].level
          delete filters.egg[key].level
          delete filters.gym[key].team
        }
      })
      return filters
    } catch (e) {
      return { error: e.message }
    }
  }

  static getMapCategory(poracleCategory) {
    switch (poracleCategory) {
      case 'gym':
      case 'egg':
      case 'raid':
        return 'gyms'
      case 'invasion':
      case 'lure':
      case 'quest':
        return 'pokestops'
      case 'nest':
        return 'nests'
      default:
        return poracleCategory
    }
  }

  static getFilterCategories(poracleCategory) {
    switch (poracleCategory) {
      case 'egg':
        return ['eggs']
      case 'invasion':
        return ['invasions']
      case 'gym':
        return ['teams']
      case 'lure':
        return ['lures']
      case 'nest':
        return ['pokemon']
      case 'raid':
        return ['raids', 'pokemon']
      case 'quest':
        return [
          'items',
          'quest_reward_12',
          'pokemon',
          'quest_reward_4',
          'quest_reward_3',
        ]
      default:
        return [poracleCategory]
    }
  }

  static getId(item, category, invasions) {
    switch (category) {
      case 'egg':
        return `e${item.level}`
      case 'invasion':
        return item.grunt_type === 'gold-stop'
          ? 'gold-stop'
          : item.grunt_type === 'kecleon'
          ? 'kecleon'
          : item.grunt_type === 'showcase'
          ? 'showcase'
          : `i${Object.keys(invasions).find(
              (x) =>
                invasions[x].type?.toLowerCase() ===
                  item.grunt_type.toLowerCase() &&
                invasions[x].gender === (item.gender || 1),
            )}`
      case 'lure':
        return `l${item.lure_id}`
      case 'gym':
        return `t${item.team}-0`
      case 'raid':
        return item.pokemon_id === 9000
          ? `r${item.level}`
          : `${item.pokemon_id}-${item.form}`
      case 'quest':
        return (() => {
          switch (item.reward_type) {
            case 2:
              return `q${item.reward}`
            case 3:
              return `d${item.amount}`
            case 4:
              return `c${item.reward}`
            case 9:
              return `x${item.reward}`
            case 12:
              return `m${item.reward}-${item.amount}`
            default:
              return `${item.reward}-${item.form}`
          }
        })()
      default:
        return `${item.pokemon_id}-${item.form}`
    }
  }

  static getIdObj(id) {
    if (!id) return {}
    if (id === 'gold-stop') return { id: 'gold-stop', type: 'invasion' }
    if (id === 'kecleon') return { id: 'kecleon', type: 'invasion' }
    if (id === 'showcase') return { id: 'showcase', type: 'invasion' }
    switch (id.charAt(0)) {
      case 'e':
        return { id: id.replace('e', ''), type: 'egg' }
      case 'i':
        return { id: id.replace('i', ''), type: 'invasion' }
      case 'l':
        return { id: id.replace('l', ''), type: 'lure' }
      case 'r':
        return { id: id.replace('r', ''), type: 'raid' }
      case 'q':
        return { id: id.replace('q', ''), type: 'item' }
      case 'm':
        return { id: id.split('-')[0].replace('m', ''), type: 'pokemon' }
      case 'c':
        return { id: id.replace('c', ''), type: 'pokemon' }
      case 'x':
        return { id: id.replace('x', ''), type: 'pokemon' }
      case 'd':
        return { id: 3, type: 'quest_reward' }
      case 't':
        return { id: id.split('-')[0].replace('t', ''), type: 'gym' }
      default:
        return { id: id.split('-')[0], form: id.split('-')[1], type: 'pokemon' }
    }
  }

  static getTitles(idObj) {
    switch (idObj.type) {
      case 'egg':
        return idObj.id === '90' ? ['poke_global'] : [`egg_${idObj.id}_plural`]
      case 'invasion':
        if (idObj.id === 'gold-stop') return ['gold_stop']
        if (idObj.id === 'kecleon') return ['poke_352']
        if (idObj.id === 'showcase') return ['showcase']
        return idObj.id === '0' ? ['poke_global'] : [`grunt_a_${idObj.id}`]
      case 'lure':
        return [`lure_${idObj.id}`]
      case 'raid':
        return idObj.id === '90' ? ['poke_global'] : [`raid_${idObj.id}_plural`]
      case 'pokemon':
        return idObj.id === '0'
          ? ['poke_global']
          : [`poke_${idObj.id}`, +idObj.form ? `form_${idObj.form}` : '']
      case 'gym':
        return idObj.id === '4' ? ['poke_global'] : [`team_${idObj.id}`]
      default:
        return [`${idObj.type}_${idObj.id}`]
    }
  }

  static reactMapFriendly(values) {
    const reactMapFriendly = {}
    Object.keys(values).forEach((key) => {
      if (key === 'min_time') {
        reactMapFriendly[key] = values[key]
      } else if (key.startsWith('min')) {
        const trim = key.replace('min_', '')
        reactMapFriendly[trim] = [values[`min_${trim}`], values[`max_${trim}`]]
      } else if (key.startsWith('max')) {
        // do nothing, handled above
      } else if (key.startsWith('pvp')) {
        reactMapFriendly.pvp = [
          values.pvp_ranking_best,
          values.pvp_ranking_worst,
        ]
      } else if (key === 'atk' || key === 'def' || key === 'sta') {
        reactMapFriendly[`${key}_iv`] = [values[key], values[`max_${key}`]]
      } else if (key.startsWith('rarity')) {
        reactMapFriendly.rarity = [values[key], values[`max_${key}`]]
      } else if (key.startsWith('size')) {
        reactMapFriendly.size = [values[key], values[`max_${key}`]]
      } else {
        reactMapFriendly[key] = values[key]
      }
    })
    return reactMapFriendly
  }

  static processor(type, entries, defaults) {
    const pvpFields = [
      'pvp_ranking_league',
      'pvp_ranking_best',
      'pvp_ranking_worst',
      'pvp_ranking_min_cp',
      'pvp_ranking_cap',
    ]
    const ignoredFields = [
      'noIv',
      'byDistance',
      'xs',
      'xl',
      'allForms',
      'pvpEntry',
    ]
    const dupes = {}
    switch (type) {
      case 'egg':
        return entries.map((egg) => ({
          ...defaults,
          ...egg,
          byDistance: undefined,
        }))
      case 'invasion':
        return entries.map((invasion) => ({
          ...defaults,
          ...invasion,
          byDistance: undefined,
        }))
      case 'lure':
        return entries.map((lure) => ({
          ...defaults,
          ...lure,
          lure_id: +lure.lure_id,
          byDistance: undefined,
        }))
      case 'gym':
        return entries.map((gym) => ({
          ...defaults,
          ...gym,
          byDistance: undefined,
        }))
      case 'raid':
        return entries
          .map((boss) => {
            if (boss.allForms) {
              boss.form = defaults.form
              if (dupes[boss.pokemon_id]) {
                return null
              }
              dupes[boss.pokemon_id] = true
            }
            if (boss.byDistance === false) {
              boss.distance = 0
            }
            return { ...defaults, ...boss }
          })
          .filter((boss) => boss)
      case 'quest':
        return entries
          .map((quest) => {
            if (quest.allForms) {
              quest.form = defaults.form
              if (dupes[quest.reward]) {
                return null
              }
              dupes[quest.reward] = true
            }
            return {
              ...defaults,
              ...quest,
              byDistance: undefined,
              allForms: undefined,
            }
          })
          .filter((quest) => quest)
      default:
        return entries
          .map((pkmn) => {
            const fields = [
              'pokemon_id',
              'form',
              'clean',
              'distance',
              'min_time',
              'template',
              'profile_no',
              'gender',
              'rarity',
              'max_rarity',
              'size',
              'max_size',
            ]
            const newPokemon = {}
            if (pkmn.allForms) {
              pkmn.form = 0
              if (dupes[pkmn.pokemon_id]) {
                return null
              }
              dupes[pkmn.pokemon_id] = true
            }
            if (pkmn.pvpEntry) {
              fields.push(...pvpFields)
            } else {
              fields.push(
                ...Object.keys(pkmn).filter(
                  (key) =>
                    !pvpFields.includes(key) && !ignoredFields.includes(key),
                ),
              )
            }
            new Set(fields).forEach(
              (field) =>
                (newPokemon[field] =
                  pkmn[field] === undefined ? defaults[field] : pkmn[field]),
            )
            return newPokemon
          })
          .filter((pokemon) => pokemon)
    }
  }

  static generateDescription(item, category, leagues, t) {
    switch (category) {
      case 'invasion': {
        let name = t(item.grunt_id ? `grunt_${item.grunt_id}` : 'poke_global')
        if (!item.gender) name = name.replace(/\(.+?\)/g, `(${t('all')})`)
        return `${name}${item.clean ? ` | ${t('clean')} ` : ''}${
          item.distance ? ` | d${item.distance}` : ''
        }`
      }
      case 'lure':
        return `${t(`lure_${item.lure_id}`)}${
          item.clean ? ` | ${t('clean')} ` : ''
        }${item.distance ? ` | d${item.distance}` : ''}`
      case 'quest':
        return `${t(
          `quest_reward_${item.reward_type}`,
        )} | ${(function getReward() {
          switch (item.reward_type) {
            case 2:
              return `${t(`item_${item.reward}`)}${
                item.amount ? ` | x${item.amount}` : ''
              }`
            case 3:
              return `x${item.amount}`
            case 4:
              return `${t(`poke_${item.reward}`)}${
                item.amount ? ` | x${item.amount}` : ''
              }`
            case 7:
              return `${t(`poke_${item.reward}`)} ${t('form')}: ${t(
                `form_${item.form}`,
              )}`
            case 12:
              return `${t(`poke_${item.reward}`)}${
                item.amount ? ` | x${item.amount}` : ''
              }`
            default:
              return ''
          }
        })()}${item.clean ? ` | ${t('clean')} ` : ''}${
          item.distance ? ` | d${item.distance}` : ''
        }`
      // case 'gym': return `${t(`team_${item.team}`)} ${item.gym_id ? item.name : ''}`
      // case 'raid':
      // case 'egg': return `Level ${item.level} ${item.exclusive ? 'Exclusive Only' : ''} ${item.clean ? 'clean' : ''} Template: ${item.template} ${item.team === 4 ? '' : item.team} ${item.gym_id ? 'Gym:' : ''}${item.distance ? ` | d${item.distance}` : ''}`
      case 'nest':
        return `${t(`poke_${item.pokemon_id}`)} | Min Spawn: ${
          item.min_spawn_avg
        }${item.clean ? ` | ${t('clean')} ` : ''}${
          item.distance ? ` | d${item.distance}` : ''
        }`
      case 'pokemon':
        return `${
          item.pokemon_id
            ? ` ${t(`poke_${item.pokemon_id}`)} | `
            : ` ${t('poke_global')} | `
        }${item.form ? ` ${t(`form_${item.form}`)} | ` : ''}${
          item.pvp_ranking_league
            ? `${t('pvp')} ${t(
                leagues.find((league) => league.cp === item.pvp_ranking_league)
                  .name,
              )} ${item.pvp_ranking_best}-${item.pvp_ranking_worst} ${
                item.pvp_ranking_min_cp
                  ? `${item.pvp_ranking_min_cp}${t('cp')}`
                  : ''
              } ${
                item.pvp_ranking_cap ? `${t('cap')}${item.pvp_ranking_cap}` : ''
              }${item.clean ? ` | ${t('clean')} ` : ''}${
                item.distance ? ` | d${item.distance}` : ''
              }`
            : `${item.min_iv}-${item.max_iv}% | L${item.min_level}-${
                item.max_level
              }
      A${item.atk}-${item.max_atk} | D${item.def}-${item.max_def} | S${
                item.sta
              }-${item.max_sta}${item.clean ? ` | ${t('clean')} ` : ''}${
                item.distance ? ` | d${item.distance}` : ''
              }`
        }${
          item.size > 1 || item.max_size < 5
            ? ` | ${t('size', 'Size')}:${
                item.size === item.max_size
                  ? `size:${t(`size_${item.size}`)}`
                  : `size:${t(`size_${item.size}`)}-${t(
                      `size_${item.max_size}`,
                    )}`
              }`
            : ''
        }`
      default:
        return item.description
    }
  }
}
