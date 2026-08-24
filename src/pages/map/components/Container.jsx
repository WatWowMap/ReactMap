// @ts-check

import { ScanOnDemand } from '@features/scanner'
import { WebhookAreaSelection, WebhookMarker } from '@features/webhooks'
import { useMapStore } from '@store/useMapStore'
import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { timeCheck } from '@utils/timeCheck'
import { MapContainer } from 'react-leaflet'
// biome-ignore lint/suspicious/noShadowRestrictedNames: component name predates this rule, shadowing is local to this file
import { DataView } from './Data'
import { Effects } from './Effects'
import {
  ControlledLocate,
  ControlledTileLayer,
  ControlledZoomLayer,
} from './Layers'
import { Nav } from './Nav'

/** @param {{ target: import('leaflet').Map, type: string }} args */
function setLocationZoom({ target: map }) {
  const { lat, lng } = map.getCenter()
  const zoom = map.getZoom()
  useStorage.setState({ location: [lat, lng], zoom })
  useMemory.setState({
    timeOfDay: timeCheck(lat, lng),
  })
  if (map.hasEventListeners('fetchdata')) map.fire('fetchdata')
}

const MAX_BOUNDS = /** @type {[[number, number], [number, number]]} */ ([
  [-90, -210],
  [90, 210],
])

export function Container() {
  const { location, zoom } = useStorage.getState()

  return (
    <MapContainer
      tap={false}
      center={location}
      ref={(ref) => {
        if (ref) {
          const { attributionPrefix } = useMemory.getState().config.general
          ref.attributionControl.setPrefix(attributionPrefix || '')
          ref.on('moveend', setLocationZoom)
          ref.on('zoomend', setLocationZoom)
        }
        useMapStore.setState({ map: ref })
      }}
      zoom={zoom}
      zoomControl={false}
      maxBounds={MAX_BOUNDS}
      preferCanvas
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
    </MapContainer>
  )
}
