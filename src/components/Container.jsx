import * as React from 'react'
import { MapContainer } from 'react-leaflet'
import useMediaQuery from '@mui/material/useMediaQuery'

import useGenerate from '@hooks/useGenerate'
import useRefresh from '@hooks/useRefresh'
import { useStatic, useStore } from '@hooks/useStore'
import Utility from '@services/Utility'

import Map from './Map'
import ScanOnDemand from './layout/dialogs/scanner/ScanOnDemand'
import DraggableMarker from './layout/dialogs/webhooks/human/Draggable'
import WebhookAreaSelection from './layout/dialogs/webhooks/human/area/AreaSelection'
import Nav from './layout/Nav'
import ActiveWeather from './layout/general/ActiveWeather'
import {
  ControlledLocate,
  ControlledTileLayer,
  ControlledZoomLayer,
} from './Layers'

/** @param {{ target: import('leaflet').Map, type: string }} */
function setLocationZoom({ target: map }) {
  const { lat, lng } = map.getCenter()
  const zoom = map.getZoom()
  useStore.setState({ location: [lat, lng], zoom })
  useStatic.setState({
    timeOfDay: Utility.timeCheck(lat, lng),
  })
  if (map.hasEventListeners('fetchdata')) map.fire('fetchdata')
}

const MAX_BOUNDS = [
  [-90, -210],
  [90, 210],
]

export default function Container({ serverSettings, params, location, zoom }) {
  useRefresh()
  useGenerate()
  const isMobile = useMediaQuery((t) => t.breakpoints.only('xs'))
  const isTablet = useMediaQuery((t) => t.breakpoints.only('sm'))

  React.useEffect(() => {
    useStatic.setState({ isMobile, isTablet })
  }, [isMobile, isTablet])

  return (
    <MapContainer
      tap={false}
      center={location}
      ref={(ref) =>
        useStatic.setState((prev) => {
          if (ref) {
            ref.attributionControl.setPrefix(
              prev.config.map.attributionPrefix || '',
            )
            ref.on('moveend', setLocationZoom)
            ref.on('zoomend', setLocationZoom)
          }
          return { map: ref }
        })
      }
      zoom={
        zoom < serverSettings.config.map.minZoom ||
        zoom > serverSettings.config.map.maxZoom
          ? serverSettings.config.map.minZoom
          : zoom
      }
      zoomControl={false}
      maxBounds={MAX_BOUNDS}
      preferCanvas
    >
      <ControlledTileLayer />
      <ControlledZoomLayer />
      <ControlledLocate />
      {serverSettings.user && serverSettings.user.perms.map && (
        <Map params={params} />
      )}
      <ScanOnDemand mode="scanNext" />
      <ScanOnDemand mode="scanZone" />
      <DraggableMarker />
      <WebhookAreaSelection />
      <Nav />
      <ActiveWeather />
    </MapContainer>
  )
}
