import { MapContainer } from 'react-leaflet'
import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { useMapStore } from '@store/useMapStore'
import { ScanOnDemand } from '@features/scanner'
import { WebhookMarker, WebhookAreaSelection } from '@features/webhooks'
import { ActiveWeather } from '@features/weather'
import { timeCheck } from '@utils/timeCheck'

import { Effects } from './Effects'
import { DataView } from './Data'
import { Nav } from './Nav'
import {
  ControlledLocate,
  ControlledTileLayer,
  ControlledZoomLayer,
} from './Layers'

function setLocationZoom({
  target: map,
}: {
  target: import('leaflet').Map
  type: string
}) {
  const { lat, lng } = map.getCenter()
  const zoom = map.getZoom()

  useStorage.setState({ location: [lat, lng], zoom })
  useMemory.setState({
    timeOfDay: timeCheck(lat, lng),
  })
  if (map.hasEventListeners('fetchdata')) map.fire('fetchdata')
}

const MAX_BOUNDS: [[number, number], [number, number]] = [
  [-90, -210],
  [90, 210],
]

export function Container() {
  const { location, zoom } = useStorage.getState()

  return (
    <MapContainer
      ref={(ref) => {
        if (ref) {
          const { attributionPrefix } = useMemory.getState().config.general

          ref.attributionControl.setPrefix(attributionPrefix || '')
          ref.on('moveend', setLocationZoom)
          ref.on('zoomend', setLocationZoom)
        }
        useMapStore.setState({ map: ref })
      }}
      preferCanvas
      center={location}
      maxBounds={MAX_BOUNDS}
      tap={false}
      zoom={zoom}
      zoomControl={false}
    >
      <Effects />
      <ControlledTileLayer />
      <ControlledZoomLayer />
      <ControlledLocate />
      <DataView />
      <ScanOnDemand mode="scanNext" />
      <ScanOnDemand mode="scanZone" />
      <WebhookMarker />
      <WebhookAreaSelection />
      <Nav />
      <ActiveWeather />
    </MapContainer>
  )
}
