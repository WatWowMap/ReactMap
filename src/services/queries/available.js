import { gql } from '@apollo/client'

export const getMapData = gql`
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

export const getAvailablePokemon = gql`
  query AvailablePokemon {
    availablePokemon
  }
`

export const getAvailablePokestops = gql`
  query AvailablePokestops {
    availablePokestops
  }
`

export const getAvailableGyms = gql`
  query AvailableGyms {
    availableGyms
  }
`

export const getAvailableNests = gql`
  query AvailableNests {
    availableNests
  }
`
