// @ts-check
import { useMemo } from 'react'
import { useQuery } from '@apollo/client'

import { GET_STATION_POKEMON } from '@services/queries/station'

/**
 * @param {string} id
 * @returns {import('@rm/types').StationPokemon[]}
 */
export function useGetStationMons(id) {
  const { data } = useQuery(GET_STATION_POKEMON, {
    variables: { id },
  })

  return useMemo(() => data?.stationPokemon || [], [data])
}
