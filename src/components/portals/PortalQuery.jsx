import React, { useEffect } from 'react'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import { useQuery } from '@apollo/client'
import { useMap } from 'react-leaflet'

import Query from '../../services/Query'
import PortalTile from './PortalTile'

export default function Portal({ bounds, onMove }) {
  const { data, previousData, refetch } = useQuery(Query.getAllPortals(), {
    variables: bounds,
  })

  const map = useMap()

  const refetchPortals = () => {
    onMove()
    const mapBounds = map.getBounds()
    refetch({
      minLat: mapBounds._southWest.lat,
      maxLat: mapBounds._northEast.lat,
      minLon: mapBounds._southWest.lng,
      maxLon: mapBounds._northEast.lng,
    })
  }

  useEffect(() => {
    map.on('moveend', refetchPortals)
    return () => {
      map.off('moveend', refetchPortals)
    }
  }, [map])

  const renderedData = data || previousData
  return (
    <MarkerClusterGroup
      disableClusteringAtZoom={15}
    >
      {renderedData && renderedData.portals.map(portal => (
        <PortalTile
          key={`${portal.id}-${portal.lat}-${portal.lon}`}
          portal={portal}
        />
      ))}
    </MarkerClusterGroup>
  )
}
