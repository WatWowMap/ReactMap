const { database: { settings: { leagues } } } = require('../config')

module.exports = function selectProvider(provider, hookConfig, pvp) {
  switch (provider) {
    case 'poracle': {
      const pvpMax = hookConfig[`pvpFilter${leagues[0].name.charAt(0).toUpperCase()}${leagues[0].name.substring(1)}MinCP`] || 4096
      const isOhbem = pvp === 'ohbem'
      return {
        human: true,
        pokemon: {
          sortProp: 'pokemon_id',
          defaults: {
            clean: false,
            distance: 0,
            template: hookConfig.defaultTemplateName.toString(),
            pokemon_id: 0,
            form: 0,
            gender: 0,
            atk: 0,
            max_atk: 15,
            min_cp: 0,
            max_cp: 9000,
            def: 0,
            max_def: 15,
            min_iv: -1,
            max_iv: 100,
            min_level: 0,
            max_level: 40,
            rarity: -1,
            max_rarity: 6,
            sta: 0,
            max_sta: 15,
            max_weight: 9000000,
            min_time: 0,
            min_weight: 0,
            pvp_ranking_league: 0,
            pvp_ranking_best: 1,
            pvp_ranking_worst: hookConfig.pvpFilterMaxRank,
            pvp_ranking_min_cp: isOhbem ? 0 : leagues[0].cp - 50,
            allForms: true,
            pvpEntry: false,
            noIv: false,
            byDistance: false,
            xs: false,
            xl: false,
          },
          ui: {
            primary: {
              sliders: [
                { name: 'iv', label: '', min: -1, max: 100, perm: 'iv', low: 'min_iv', high: 'max_iv' },
                { name: 'level', label: '', min: 0, max: 40, perm: 'stats', low: 'min_level', high: 'max_level' },
              ],
            },
            advanced: {
              sliders: [
                { name: 'cp', label: '', min: 0, max: 9000, perm: 'stats', low: 'min_cp', high: 'max_cp' },
                { name: 'atk_iv', label: '', min: 0, max: 15, perm: 'stats', low: 'atk', high: 'max_atk' },
                { name: 'def_iv', label: '', min: 0, max: 15, perm: 'stats', low: 'def', high: 'max_def' },
                { name: 'sta_iv', label: '', min: 0, max: 15, perm: 'stats', low: 'sta', high: 'max_sta' },
              ],
              texts: [{ name: 'min_time', type: 'number', max: 60, adornment: 's', xs: 4, sm: 4 }],
              booleans: [
                { name: 'xs', xs: 4, sm: 4, override: true },
                { name: 'xl', xs: 4, sm: 4, override: true },
              ],
            },
            pvp: {
              selects: [{ name: 'pvp_ranking_league', options: [{ name: 'none', cp: 0 }, ...leagues], xs: 6, sm: isOhbem ? 6 : 3 }],
              texts: isOhbem
                ? []
                : [{ name: 'pvp_ranking_min_cp', max: pvpMax, type: 'number', adornment: 'cp', xs: 6, sm: 3 }],
              sliders: [{ name: 'pvp', label: 'rank', min: 1, max: hookConfig.pvpFilterMaxRank, perm: 'pvp', low: 'pvp_ranking_best', high: 'pvp_ranking_worst' }],
            },
            general: {
              selects: [
                { name: 'profile_no', options: [], xs: 4, sm: 4 },
                { name: 'template', options: [], xs: 4, sm: 4 },
                { name: 'gender', options: [0, 1, 2], xs: 4, sm: 4 },
              ],
              booleans: [
                { name: 'clean', xs: 6, sm: 3 },
                { name: 'allForms', xs: 6, sm: 3 },
                { name: 'pvpEntry', xs: 6, sm: 3 },
                { name: 'noIv', xs: 6, sm: 3 },
              ],
              distanceOrArea: {
                booleans: [{ name: 'byDistance', max: hookConfig.maxDistance, xs: 8, sm: 8, override: true }],
                texts: [{ name: 'distance', type: 'number', adornment: 'm', xs: 4, sm: 4 }],
              },
            },
          },
        },
        raid: {
          defaults: {
            clean: false,
            distance: 0,
            template: hookConfig.defaultTemplateName.toString(),
            pokemon_id: 9000,
            evolution: 9000,
            form: 0,
            move: 9000,
            exclusive: false,
            level: 9000,
            team: 4,
            gym_id: null,
            byDistance: false,
          },
          ui: {
            general: {
              selects: [
                { name: 'profile_no', options: [], xs: 6, sm: 3 },
                { name: 'template', options: [], xs: 6, sm: 3 },
                { name: 'team', options: [0, 1, 2, 3, 4], xs: 6, sm: 3 },
                { name: 'move', options: [], xs: 6, sm: 3 },
                // { name: 'level', options: [0, 1, 2, 3, 4, 5, 6], xs: 6, sm: 3 },
              ],
              booleans: [
                { name: 'clean', xs: 6, sm: 3 },
                { name: 'exclusive', xs: 6, sm: 3 },
                { name: 'allForms', disabled: 'r', xs: 6, sm: 3 },
                { name: 'allMoves', disabled: 'r', xs: 6, sm: 3 },
              ],
              distanceOrArea: {
                booleans: [{ name: 'byDistance', max: hookConfig.maxDistance, xs: 8, sm: 8, override: true }],
                texts: [{ name: 'distance', type: 'number', adornment: 'm', xs: 4, sm: 4 }],
              },
            },
          },
        },
        egg: {
          defaults: {
            clean: false,
            distance: 0,
            template: hookConfig.defaultTemplateName.toString(),
            exclusive: false,
            level: 9000,
            team: 4,
            gym_id: null,
            byDistance: false,
          },
          ui: {
            general: {
              selects: [
                { name: 'profile_no', options: [], xs: 6, sm: 4 },
                { name: 'template', options: [], xs: 6, sm: 4 },
                { name: 'team', options: [1, 2, 3, 4], xs: 6, sm: 4 },
              ],
              booleans: [
                { name: 'clean', xs: 6, sm: 6 },
                { name: 'exclusive', xs: 6, sm: 6 },
              ],
              distanceOrArea: {
                booleans: [{ name: 'byDistance', max: hookConfig.maxDistance, xs: 8, sm: 8, override: true }],
                texts: [{ name: 'distance', type: 'number', adornment: 'm', xs: 4, sm: 4 }],
              },
            },
          },
        },
        invasion: {
          defaults: {
            clean: false,
            distance: 0,
            template: hookConfig.defaultTemplateName.toString(),
            grunt_type: null,
            gender: 0,
            byDistance: false,
          },
          ui: {
            general: {
              selects: [
                { name: 'profile_no', options: [], xs: 6, sm: 6 },
                { name: 'template', options: [], xs: 6, sm: 6 },
                { name: 'gender', options: [0, 1, 2], xs: 6, sm: 6 },
              ],
              booleans: [
                { name: 'clean', xs: 6, sm: 6 },
              ],
              distanceOrArea: {
                booleans: [{ name: 'byDistance', max: hookConfig.maxDistance, xs: 8, sm: 8, override: true }],
                texts: [{ name: 'distance', type: 'number', adornment: 'm', xs: 4, sm: 4 }],
              },
            },
          },
        },
        lure: {
          defaults: {
            clean: false,
            distance: 0,
            template: hookConfig.defaultTemplateName.toString(),
            lure_id: 0,
            byDistance: false,
          },
          ui: {
            general: {
              selects: [
                { name: 'profile_no', options: [], xs: 4, sm: 4 },
                { name: 'template', options: [], xs: 4, sm: 4 },
              ],
              booleans: [
                { name: 'clean', xs: 4, sm: 4 },
              ],
              distanceOrArea: {
                booleans: [{ name: 'byDistance', max: hookConfig.maxDistance, xs: 8, sm: 8, override: true }],
                texts: [{ name: 'distance', type: 'number', adornment: 'm', xs: 4, sm: 4 }],
              },
            },
          },
        },
      }
    }
    default: return {}
  }
}
