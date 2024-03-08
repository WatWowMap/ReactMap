import { gql } from '@apollo/client'

export const GET_MAP_DATA = gql`
  query MapData {
    available {
      masterfile
      filters
      questConditions
      icons
      audio
    }
  }
`

export const GET_AVAILABLE_POKEMON = gql`
  query AvailablePokemon {
    availablePokemon
  }
`

export const GET_AVAILABLE_POKESTOPS = gql`
  query AvailablePokestops {
    availablePokestops
  }
`

export const GET_AVAILABLE_GYMS = gql`
  query AvailableGyms {
    availableGyms
  }
`

export const GET_AVAILABLE_NESTS = gql`
  query AvailableNests {
    availableNests
  }
`
