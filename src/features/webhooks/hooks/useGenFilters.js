// @ts-check
import { useMemo } from 'react'
import { useMemory } from '@hooks/useMemory'

import { useWebhookStore } from './store'

export function useGenFilters() {
  const profile_no = useWebhookStore((s) => s.human.current_profile_no)
  const ui = useWebhookStore((s) => s.context.ui)

  const newFilters = useMemo(() => {
    const {
      filters: rmFilters,
      masterfile: { invasions },
    } = useMemory.getState()
    if (!ui) return {}
    const { pokemon, egg, gym, invasion, lure, quest, nest, raid } = ui
    const filters = {
      pokemon: pokemon
        ? {
            global: { ...pokemon.defaults, profile_no },
            '0-0': { ...pokemon.defaults, profile_no },
          }
        : {},
      raid: raid
        ? {
            global: { ...raid.defaults, profile_no },
            r90: {
              ...raid.defaults,
              level: 90,
              profile_no,
            },
          }
        : {},
      egg: egg
        ? {
            global: { ...egg.defaults, profile_no },
            e90: {
              ...egg.defaults,
              level: 90,
              profile_no,
            },
          }
        : {},
      gym: gym
        ? {
            global: { ...gym.defaults, profile_no },
            t4: { ...gym.defaults, profile_no },
          }
        : {},
      invasion: invasion
        ? {
            global: {
              ...invasion.defaults,
              profile_no,
            },
            i0: {
              ...invasion.defaults,
              grunt_type: 'everything',
              profile_no,
            },
            'gold-stop': {
              ...invasion.defaults,
              grunt_type: 'gold-stop',
              profile_no,
            },
            kecleon: {
              ...invasion.defaults,
              grunt_type: 'kecleon',
              profile_no,
            },
            showcase: {
              ...invasion.defaults,
              grunt_type: 'showcase',
              profile_no,
            },
          }
        : {},
      lure: {
        global: lure ? { ...lure.defaults, profile_no } : {},
      },
      nest: {
        global: nest ? { ...nest.defaults, profile_no } : {},
      },
      quest: {
        global: quest ? { ...quest.defaults, profile_no } : {},
      },
    }
    Object.keys(rmFilters.pokemon?.filter || {}).forEach((key) => {
      if (pokemon)
        filters.pokemon[key] = {
          ...pokemon.defaults,
          pokemon_id: +key.split('-')[0],
          form: +key.split('-')[1],
          profile_no,
          enabled: false,
        }
      if (raid)
        filters.raid[key] = {
          ...raid.defaults,
          pokemon_id: +key.split('-')[0],
          form: +key.split('-')[1],
          profile_no,
          enabled: false,
        }
      if (nest)
        filters.nest[key] = {
          ...nest.defaults,
          pokemon_id: +key.split('-')[0],
          form: +key.split('-')[1],
          profile_no,
          enabled: false,
        }
      if (quest)
        filters.quest[key] = {
          ...quest.defaults,
          reward: +key.split('-')[0],
          form: +key.split('-')[1],
          profile_no,
          reward_type: 7,
          enabled: false,
        }
      if (key === 'global') {
        if (pokemon) {
          delete filters.pokemon[key].pokemon_id
          delete filters.pokemon[key].form
        }
        if (raid) {
          delete filters.raid[key].pokemon_id
          delete filters.raid[key].form
        }
        if (nest) {
          delete filters.nest[key].pokemon_id
          delete filters.nest[key].form
        }
        if (quest) {
          delete filters.quest[key].reward
          delete filters.quest[key].form
        }
      }
    })
    Object.keys(rmFilters.pokestops?.filter || {}).forEach((key) => {
      if (key.startsWith('i') && invasion) {
        filters.invasion[key] = {
          ...invasion.defaults,
          grunt_type: invasions[key.slice(1)].type.toLowerCase(),
          gender: invasions[key.slice(1)].gender,
          profile_no,
          enabled: false,
        }
      }
      if (key.startsWith('l') && lure) {
        filters.lure[key] = {
          ...lure.defaults,
          lure_id: key.slice(1),
          profile_no,
          enabled: false,
        }
      }
      if (key.startsWith('q') && quest) {
        filters.quest[key] = {
          ...quest.defaults,
          reward: +key.slice(1),
          profile_no,
          reward_type: 2,
          enabled: false,
        }
      }
      if (key.startsWith('c') && quest) {
        filters.quest[key] = {
          ...quest.defaults,
          reward: +key.slice(1),
          profile_no,
          reward_type: 4,
          enabled: false,
        }
      }
      if (key.startsWith('d') && quest) {
        filters.quest[key] = {
          ...quest.defaults,
          profile_no,
          reward_type: 3,
          amount: +key.slice(1),
          enabled: false,
        }
      }
      if (key.startsWith('m') && quest) {
        filters.quest[key] = {
          ...quest.defaults,
          profile_no,
          reward_type: 12,
          reward: +key.split('-')[0].slice(1),
          amount: +key.split('-')[1],
          enabled: false,
        }
      }
      if (key.startsWith('x') && quest) {
        filters.quest[key] = {
          ...quest.defaults,
          reward: +key.slice(1),
          profile_no,
          reward_type: 9,
          enabled: false,
        }
      }
      if (key === 'global') {
        if (invasion) {
          delete filters.invasion[key].grunt_type
          delete filters.invasion[key].gender
        }
        if (lure) {
          delete filters.lure[key].lure_id
        }
        if (quest) {
          delete filters.quest[key].reward
          delete filters.quest[key].reward_type
          delete filters.quest[key].amount
        }
      }
    })
    Object.keys(rmFilters.gyms?.filter || {}).forEach((key) => {
      if (key.startsWith('r') && raid) {
        filters.raid[key] = {
          ...raid.defaults,
          level: +key.slice(1),
          profile_no,
          enabled: false,
        }
      }
      if (key.startsWith('e') && egg) {
        filters.egg[key] = {
          ...egg.defaults,
          level: +key.slice(1),
          profile_no,
          enabled: false,
        }
      }
      if (key.startsWith('t') && gym) {
        filters.gym[key] = {
          ...gym.defaults,
          team: +key.slice(1).split('-')[0],
          profile_no,
          enabled: false,
        }
      }
      if (key === 'global') {
        if (raid) delete filters.raid[key].level
        if (egg) delete filters.egg[key].level
        if (gym) delete filters.gym[key].team
      }
    })
    return filters
  }, [ui, profile_no])

  return newFilters
}
