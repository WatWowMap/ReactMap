import { gql } from '@apollo/client'

const getAllDevices = gql`
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

export default getAllDevices
