import { useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { GET_STATION_POKEMON } from '@services/queries/station'
import { StationPokemon } from '@rm/types'

export function useGetStationMons(id: string) {
  const { data } = useQuery<{ stationPokemon?: StationPokemon[] }>(
    GET_STATION_POKEMON,
    {
      variables: { id },
    },
  )

  return useMemo(() => data?.stationPokemon || [], [data])
}
