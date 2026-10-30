// @ts-check
import { useMemo } from 'react'
import { useMemory } from '@store/useMemory'

import { useWebhookStore } from '@store/useWebhookStore'

import { ruleToForm } from '../services/ruleForm'

export function useGenFilters() {
  const profile_no = useWebhookStore((s) => s.human.current_profile_no)
  const ui = useWebhookStore((s) => s.context.ui)

  const newFilters = useMemo(() => {
    const {
      filters: rmFilters,
      masterfile: { invasions },
    } = useMemory.getState()
    if (!ui) return {}
    const { pokemon, egg, gym, invasion, incident, lure, quest, nest, raid } =
      ui
    /**
     * @param {string} category
     * @param {Record<string, any>} [rule]
     */
    const form = (category, rule = {}) =>
      ruleToForm(category, { ...rule, profile_no }, ui[category])
    const EXTRA_IDENTITY = {
      pokemon: ['form'],
      raid: ['form', 'level'],
      nest: ['form'],
      quest: ['form', 'amount'],
      invasion: ['gender'],
    }
    /** @param {string} category */
    const globalForm = (category) => {
      const global = form(category)
      ;[
        ...(ui[category]?.identifiers || []),
        ...(EXTRA_IDENTITY[category] || []),
      ].forEach((key) => delete global[key])
      return global
    }
    const filters = {
      pokemon: pokemon
        ? { global: globalForm('pokemon'), '0-0': form('pokemon') }
        : {},
      raid: raid
        ? {
            global: globalForm('raid'),
            r90: form('raid', { level: 90 }),
          }
        : {},
      egg: egg
        ? {
            global: globalForm('egg'),
            e90: form('egg', { level: 90 }),
          }
        : {},
      gym: gym
        ? {
            global: globalForm('gym'),
            t4: form('gym', { team: 'any' }),
          }
        : {},
      invasion: invasion
        ? {
            global: globalForm('invasion'),
            i0: form('invasion', { grunt_type: 'everything' }),
          }
        : {},
      incident: incident
        ? {
            global: globalForm('incident'),
            'gold-stop': form('incident', { display_type: 7 }),
            kecleon: form('incident', { display_type: 8 }),
            showcase: form('incident', { display_type: 9 }),
          }
        : {},
      lure: { global: lure ? globalForm('lure') : {} },
      nest: { global: nest ? globalForm('nest') : {} },
      quest: { global: quest ? globalForm('quest') : {} },
    }
    const TEAMS = ['harmony', 'mystic', 'valor', 'instinct', 'any']
    const GENDERS = ['any', 'male', 'female']
    const off = { enabled: false }

    Object.keys(rmFilters.pokemon?.filter || {}).forEach((key) => {
      if (key === 'global') return
      const [id, formId] = key.split('-').map(Number)
      if (pokemon) {
        filters.pokemon[key] = form('pokemon', {
          pokemon_id: id,
          form: formId,
          ...off,
        })
      }
      if (raid) {
        filters.raid[key] = form('raid', {
          pokemon_id: id,
          form: formId,
          ...off,
        })
      }
      if (nest) {
        filters.nest[key] = form('nest', {
          pokemon_id: id,
          form: formId,
          ...off,
        })
      }
      if (quest) {
        filters.quest[key] = form('quest', {
          reward: id,
          form: formId,
          reward_type: 7,
          ...off,
        })
      }
    })
    Object.keys(rmFilters.pokestops?.filter || {}).forEach((key) => {
      if (key === 'global') return
      const num = key.slice(1)
      if (key.startsWith('i') && invasion && invasions[num]) {
        filters.invasion[key] = form('invasion', {
          grunt_type: invasions[num].type.toLowerCase(),
          gender: GENDERS[invasions[num].gender] ?? 'any',
          ...off,
        })
      }
      if (key.startsWith('l') && lure) {
        filters.lure[key] = form('lure', { lure_id: +num, ...off })
      }
      if (key.startsWith('q') && quest) {
        filters.quest[key] = form('quest', {
          reward: +num,
          reward_type: 2,
          ...off,
        })
      }
      if (key.startsWith('c') && quest) {
        filters.quest[key] = form('quest', {
          reward: +num,
          reward_type: 4,
          ...off,
        })
      }
      if (key.startsWith('d') && quest) {
        filters.quest[key] = form('quest', {
          reward_type: 3,
          amount: +num,
          ...off,
        })
      }
      if (key.startsWith('m') && quest) {
        filters.quest[key] = form('quest', {
          reward_type: 12,
          reward: +key.split('-')[0].slice(1),
          amount: +key.split('-')[1],
          ...off,
        })
      }
      if (key.startsWith('x') && quest) {
        filters.quest[key] = form('quest', {
          reward: +num,
          reward_type: 9,
          ...off,
        })
      }
    })
    Object.keys(rmFilters.gyms?.filter || {}).forEach((key) => {
      if (key === 'global') return
      if (key.startsWith('r') && raid) {
        filters.raid[key] = form('raid', { level: +key.slice(1), ...off })
      }
      if (key.startsWith('e') && egg) {
        filters.egg[key] = form('egg', { level: +key.slice(1), ...off })
      }
      if (key.startsWith('t') && gym) {
        filters.gym[key] = form('gym', {
          team: TEAMS[+key.slice(1).split('-')[0]] ?? 'any',
          ...off,
        })
      }
    })
    return filters
  }, [ui, profile_no])

  return newFilters
}
