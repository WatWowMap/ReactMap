// @ts-check

import { useQuery } from '@apollo/client'
import { capitalize } from '@mui/material/utils'
import * as queries from '@services/queries/available'
import { useMemory } from '@store/useMemory'
import { useEffect, useMemo } from 'react'

/**
 * @param {keyof import('packages/types/lib').Available} category
 * @returns {{available: string[], loading: boolean, error: import('@apollo/client').ApolloError}}
 */
export function useGetAvailable(category) {
  const capitalized = capitalize(category)
  const active = useMemory((s) => s.active)
  const online = useMemory((s) => s.online)

  /** @type {import('@apollo/client').QueryResult<{ [key: string]: string[] }>} */
  const { data, previousData, loading, error } = useQuery(
    queries[`GET_AVAILABLE_${category.toUpperCase()}`],
    {
      fetchPolicy: active && online ? 'network-only' : 'cache-and-network',
    },
  )

  useEffect(() => {
    const next = data?.[`available${capitalized}`]
    if (next) {
      useMemory.setState((prev) => {
        const previous = prev.available[category] || []
        return {
          available: {
            ...prev.available,
            // if it's the same, don't cause re-renders
            [category]:
              next.length !== previous.length ||
              next.some((key, i) => key !== previous[i])
                ? next
                : previous,
          },
        }
      })
    }
  }, [data])

  return useMemo(() => {
    const available =
      (data || previousData)?.[`available${capitalized}`] ||
      useMemory.getState().available[category] ||
      []
    return { available, loading, error }
  }, [data, previousData, loading, error])
}
