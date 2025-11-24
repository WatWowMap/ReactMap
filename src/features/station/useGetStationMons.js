// @ts-check
import { useEffect, useMemo, useRef } from 'react'
import { useQuery } from '@apollo/client'

import { GET_STATION_POKEMON } from '@services/queries/station'

/**
 * @param {string} id
 * @param {number} [lastUpdated]
 * @returns {import('@rm/types').StationPokemon[]}
 */
export function useGetStationMons(id, lastUpdated) {
  const { data, refetch } = useQuery(GET_STATION_POKEMON, {
    variables: { id },
  })
  const previousUpdated = useRef(lastUpdated)

  useEffect(() => {
    if (!Number.isFinite(lastUpdated)) {
      previousUpdated.current = lastUpdated
      return
    }
    if (
      previousUpdated.current !== undefined &&
      previousUpdated.current !== lastUpdated
    ) {
      refetch({ id })
    }
    previousUpdated.current = lastUpdated
  }, [id, lastUpdated, refetch])

  return useMemo(() => data?.stationPokemon || [], [data])
}
