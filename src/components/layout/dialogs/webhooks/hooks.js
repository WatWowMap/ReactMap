// @ts-check
import { useEffect } from 'react'
import { useQuery } from '@apollo/client'
import { useStatic, useStore } from '@hooks/useStore'
import {
  VALID_HOOKS,
  WEBHOOK_AREAS,
  WEBHOOK_CONTEXT,
  allProfiles,
} from '@services/queries/webhook'
import Query from '@services/Query'
import { useTranslation } from 'react-i18next'

import { getContext, useWebhookStore } from './store'

/**
 *
 * @returns {{ group: string, children: string[] }[]}
 */
export function useGetAreas() {
  const { data } = useQuery(WEBHOOK_AREAS, {
    fetchPolicy: 'cache-first',
  })

  return data?.webhookAreas || []
}

/** @returns {import('./store').WebhookStore['category'][]} */
export function useGetHookContext() {
  const mode = useWebhookStore((s) => s.mode)

  const { data: context } = useQuery(WEBHOOK_CONTEXT, {
    fetchPolicy: 'no-cache',
    nextFetchPolicy: 'standby',
    skip: !mode,
  })
  const { data: categories } = useQuery(VALID_HOOKS, {
    fetchPolicy: 'no-cache',
    nextFetchPolicy: 'standby',
    skip: !mode,
  })

  useEffect(() => {
    if (context?.webhookContext) {
      useWebhookStore.setState({
        context: context.webhookContext,
      })
    }
  }, [context])

  return categories?.webhookValid || []
}

/**
 *
 * @template {import('./store').WebhookStore['category']} T
 * @param {T} category
 * @returns {{ data: import('types').APIMethod[T], loading: boolean }}
 */
export function useGetWebhookData(category) {
  const { t } = useTranslation()
  const { data, loading } = useQuery(allProfiles, {
    fetchPolicy: 'no-cache',
    variables: {
      category,
      status: 'GET',
    },
  })

  useEffect(() => {
    if (!loading && data?.webhook) {
      if (data.webhook.status === 'error') {
        const { context } = useWebhookStore.getState()
        useWebhookStore.setState({
          alert: {
            open: true,
            severity: data.webhook.status,
            message: t(data.webhook.message, { name: context.name || '' }),
          },
        })
      } else if (category === 'human') {
        console.log('human', data?.webhook)
        useWebhookStore.setState({ human: data?.webhook?.human || {} })
      }
    }
  }, [loading])

  return {
    data: data?.webhook?.[category] || (category === 'human' ? {} : []),
    loading,
  }
}

export function useGenFilters() {
  const {
    masterfile: { invasions },
    filters: rmFilters,
  } = useStatic.getState()
  const category = useWebhookStore((s) => s.category)
  const profile_no = useWebhookStore((s) => s.human.current_profile_no) || 0

  if (category === 'human') {
    return {}
  }
  if (category === 'pokemon') {
    const pokemon = getContext(category)
    const poracleFilters = {
      global: { ...pokemon.defaults, profile_no },
      ...Object.fromEntries(
        Object.keys(rmFilters[category]?.filter || {}).map((key) => [
          key,
          {
            ...pokemon.defaults,
            pokemon_id: +key.split('-')[0],
            form: +key.split('-')[1],
            profile_no,
            enabled: false,
          },
        ]),
      ),
    }
    delete poracleFilters.global.pokemon_id
    delete poracleFilters.global.form
    return poracleFilters
  }

  // try {
  //   const filters = {
  //     pokemon: {
  //       global: { ...pokemon.defaults, profile_no },
  //       '0-0': { ...pokemon.defaults, profile_no },
  //     },
  //     raid: {
  //       global: { ...raid.defaults, profile_no },
  //       r90: {
  //         ...raid.defaults,
  //         level: 90,
  //         profile_no,
  //       },
  //     },
  //     egg: {
  //       global: { ...egg.defaults, profile_no },
  //       e90: {
  //         ...egg.defaults,
  //         level: 90,
  //         profile_no,
  //       },
  //     },
  //     gym: {
  //       global: { ...gym.defaults, profile_no },
  //       t4: { ...gym.defaults, profile_no },
  //     },
  //     invasion: {
  //       global: {
  //         ...invasion.defaults,
  //         profile_no,
  //       },
  //       i0: {
  //         ...invasion.defaults,
  //         grunt_type: 'everything',
  //         profile_no,
  //       },
  //       'gold-stop': {
  //         ...invasion.defaults,
  //         grunt_type: 'gold-stop',
  //         profile_no,
  //       },
  //       kecleon: {
  //         ...invasion.defaults,
  //         grunt_type: 'kecleon',
  //         profile_no,
  //       },
  //       showcase: {
  //         ...invasion.defaults,
  //         grunt_type: 'showcase',
  //         profile_no,
  //       },
  //     },
  //     lure: {
  //       global: { ...lure.defaults, profile_no },
  //     },
  //     nest: {
  //       global: { ...nest.defaults, profile_no },
  //     },
  //     quest: {
  //       global: { ...quest.defaults, profile_no },
  //     },
  //   }
  //   Object.keys(reactMapFilters.pokemon?.filter || {}).forEach((key) => {
  //     filters.pokemon[key] = {
  //       ...pokemon.defaults,
  //       pokemon_id: +key.split('-')[0],
  //       form: +key.split('-')[1],
  //       profile_no,
  //       enabled: false,
  //     }
  //     filters.raid[key] = {
  //       ...raid.defaults,
  //       pokemon_id: +key.split('-')[0],
  //       form: +key.split('-')[1],
  //       profile_no,
  //       enabled: false,
  //     }
  //     filters.nest[key] = {
  //       ...nest.defaults,
  //       pokemon_id: +key.split('-')[0],
  //       form: +key.split('-')[1],
  //       profile_no,
  //       enabled: false,
  //     }
  //     filters.quest[key] = {
  //       ...quest.defaults,
  //       reward: +key.split('-')[0],
  //       form: +key.split('-')[1],
  //       profile_no,
  //       reward_type: 7,
  //       enabled: false,
  //     }
  //     if (key === 'global') {
  //       delete filters.pokemon[key].pokemon_id
  //       delete filters.pokemon[key].form
  //       delete filters.raid[key].pokemon_id
  //       delete filters.raid[key].form
  //       delete filters.nest[key].pokemon_id
  //       delete filters.nest[key].form
  //       delete filters.quest[key].reward
  //       delete filters.quest[key].form
  //     }
  //   })
  //   Object.keys(reactMapFilters.pokestops?.filter || {}).forEach((key) => {
  //     if (key.startsWith('i')) {
  //       filters.invasion[key] = {
  //         ...invasion.defaults,
  //         grunt_type: invasions[key.slice(1)].type.toLowerCase(),
  //         gender: invasions[key.slice(1)].gender,
  //         profile_no,
  //         enabled: false,
  //       }
  //     }
  //     if (key.startsWith('l')) {
  //       filters.lure[key] = {
  //         ...lure.defaults,
  //         lure_id: key.slice(1),
  //         profile_no,
  //         enabled: false,
  //       }
  //     }
  //     if (key.startsWith('q')) {
  //       filters.quest[key] = {
  //         ...quest.defaults,
  //         reward: +key.slice(1),
  //         profile_no,
  //         reward_type: 2,
  //         enabled: false,
  //       }
  //     }
  //     if (key.startsWith('c')) {
  //       filters.quest[key] = {
  //         ...quest.defaults,
  //         reward: +key.slice(1),
  //         profile_no,
  //         reward_type: 4,
  //         enabled: false,
  //       }
  //     }
  //     if (key.startsWith('d')) {
  //       filters.quest[key] = {
  //         ...quest.defaults,
  //         profile_no,
  //         reward_type: 3,
  //         amount: +key.slice(1),
  //         enabled: false,
  //       }
  //     }
  //     if (key.startsWith('m')) {
  //       filters.quest[key] = {
  //         ...quest.defaults,
  //         profile_no,
  //         reward_type: 12,
  //         reward: +key.split('-')[0].slice(1),
  //         amount: +key.split('-')[1],
  //         enabled: false,
  //       }
  //     }
  //     if (key.startsWith('x')) {
  //       filters.quest[key] = {
  //         ...quest.defaults,
  //         reward: +key.slice(1),
  //         profile_no,
  //         reward_type: 9,
  //         enabled: false,
  //       }
  //     }
  //     if (key === 'global') {
  //       delete filters.invasion[key].grunt_type
  //       delete filters.invasion[key].gender
  //       delete filters.lure[key].lure_id
  //       delete filters.quest[key].reward
  //       delete filters.quest[key].reward_type
  //       delete filters.quest[key].amount
  //     }
  //   })
  //   Object.keys(reactMapFilters.gyms?.filter || {}).forEach((key) => {
  //     if (key.startsWith('r')) {
  //       filters.raid[key] = {
  //         ...raid.defaults,
  //         level: +key.slice(1),
  //         profile_no,
  //         enabled: false,
  //       }
  //     }
  //     if (key.startsWith('e')) {
  //       filters.egg[key] = {
  //         ...egg.defaults,
  //         level: +key.slice(1),
  //         profile_no,
  //         enabled: false,
  //       }
  //     }
  //     if (key.startsWith('t')) {
  //       filters.gym[key] = {
  //         ...gym.defaults,
  //         team: +key.slice(1).split('-')[0],
  //         profile_no,
  //         enabled: false,
  //       }
  //     }
  //     if (key === 'global') {
  //       delete filters.raid[key].level
  //       delete filters.egg[key].level
  //       delete filters.gym[key].team
  //     }
  //   })
  //   return filters
  // } catch (e) {
  //   return { error: e.message }
  // }
}
