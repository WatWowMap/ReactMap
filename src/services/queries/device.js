import { gql } from '@apollo/client'

const getAllDevices = gql`
  query Devices($version: String, $filters: JSON) {
    devices(version: $version, filters: $filters) {
      id
      instance_name
      last_seen
      last_lat
      last_lon
      route
      type
      isMad
      radius
    }
  }
`

export default getAllDevices
