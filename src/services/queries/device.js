import { gql } from '@apollo/client'

const getAllDevices = gql`
  {
    devices{
      uuid
      instance_name
      last_seen
      last_lat
      last_lon
      route
      type
    }
  }
`

export default getAllDevices
