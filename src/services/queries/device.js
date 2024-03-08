import { gql } from '@apollo/client'

export const GET_ALL_DEVICES = gql`
  query Devices($filters: JSON) {
    devices(filters: $filters) {
      id
      instance_name
      updated
      lat
      lon
      route
      type
      isMad
      radius
    }
  }
`
