import { gql } from '@apollo/client'

const core = gql`
  fragment CoreRoute on Route {
    id
    start_lat
    start_lon
    end_lat
    end_lon
  }
`

export const getRoute = gql`
  ${core}
  query Route($id: ID) {
    route(id: $id) {
      ...CoreRoute
      name
      image
      description
      distance_meters
      # duration_seconds
      # start_fort_id
      start_image
      end_image
      # end_fort_id
      reversible
      tags
      type
      updated
      version
    }
  }
`

export const getRoutes = gql`
  ${core}
  query Routes(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
  ) {
    routes(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      ...CoreRoute
      image_border_color
      waypoints {
        lat_degrees
        lng_degrees
        elevation_in_meters
      }
    }
  }
`
