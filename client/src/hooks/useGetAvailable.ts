// @ts-check
import { useEffect, useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { capitalize } from '@mui/material/utils'

import * as queries from '@services/queries/available'
import { useMemory } from '@store/useMemory'

/**
 * @param {keyof import('@rm/types').Available} category
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
    if (data?.[`available${capitalized}`]) {
      useMemory.setState((prev) => ({
        available: {
          ...prev.available,
          [category]: data[`available${capitalized}`].some(
            (key, i) => key !== prev.available[category][i],
          )
            ? data[`available${capitalized}`]
            : prev.available[category],
          // if it's the same, don't cause re-renders
        },
      }))
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
