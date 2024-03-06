import { gql } from '@apollo/client'

export const getAllDevices = gql`
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
