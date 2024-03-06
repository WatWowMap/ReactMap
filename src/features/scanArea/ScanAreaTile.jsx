// @ts-check
/* eslint-disable react/destructuring-assignment */
import * as React from 'react'
import { GeoJSON } from 'react-leaflet'
import { Polygon } from 'leaflet'

import { useWebhookStore } from '@store/useWebhookStore'
import { useStorage } from '@store/useStorage'
import Utility from '@services/Utility'

/**
 *
 * @param {{
 *  geojson: import('@rm/types').RMGeoJSON,
 *  webhook?: boolean,
 *  handleClick?: (name: string) => () => Promise<string[]>
 * }} featureCollection
 * @returns
 */
function ScanArea({ geojson, webhook, handleClick }) {
  const search = useStorage((s) => s.filters.scanAreas?.filter?.search)
  const tapToToggle = useStorage((s) => s.userSettings.scanAreas.tapToToggle)
  const alwaysShowLabels = useStorage(
    (s) => s.userSettings.scanAreas.alwaysShowLabels,
  )

  return (
    <GeoJSON
      key={`${search}${tapToToggle}${alwaysShowLabels}`}
      data={geojson}
      filter={(f) =>
        webhook ||
        search === '' ||
        f.properties.key.toLowerCase().includes(search.toLowerCase())
      }
      eventHandlers={{
        click: ({ propagatedFrom: layer }) => {
          if (!layer.feature) return
          const { name, key, manual = false } = layer.feature.properties
          if (webhook && name) {
            handleClick(name)().then((newAreas) => {
              layer.setStyle({
                fillOpacity: newAreas.some(
                  (area) => area.toLowerCase() === name.toLowerCase(),
                )
                  ? 0.8
                  : 0.2,
              })
            })
          } else if (!manual && tapToToggle) {
            const { filters, setAreas } = useStorage.getState()
            const includes = filters?.scanAreas?.filter?.areas?.includes(key)
            layer.setStyle({ fillOpacity: includes ? 0.2 : 0.8 })
            setAreas(
              key,
              geojson.features
                .filter((f) => !f.properties.manual)
                .map((f) => f.properties.key),
            )
          }
        },
      }}
      onEachFeature={(feature, layer) => {
        if (feature.properties?.name) {
          const { name, key } = feature.properties
          const popupContent = Utility.getProperName(name)
          if (layer instanceof Polygon) {
            layer
              .setStyle({
                color:
                  feature.properties.color ||
                  feature.properties.stroke ||
                  '#3388ff',
                weight: feature.properties['stroke-width'] || 3,
                opacity: feature.properties['stroke-opacity'] || 1,
                fillColor:
                  feature.properties.fillColor ||
                  feature.properties.fill ||
                  '#3388ff',
                fillOpacity: (
                  webhook
                    ? useWebhookStore
                        .getState()
                        .human?.area?.some(
                          (area) => area.toLowerCase() === name?.toLowerCase(),
                        )
                    : (
                        useStorage.getState().filters?.scanAreas?.filter
                          ?.areas || []
                      ).includes(webhook ? name : key)
                )
                  ? 0.8
                  : 0.2,
              })
              .bindTooltip(popupContent, {
                permanent: webhook ? true : alwaysShowLabels,
                direction: 'top',
                className: 'area-tooltip',
              })
            if (alwaysShowLabels) {
              layer.openTooltip()
            }
          }
        }
      }}
    />
  )
}

export const ScanAreaTile = React.memo(
  ScanArea,
  (prev, next) =>
    prev.webhook === next.webhook &&
    prev.handleClick === next.handleClick &&
    prev.geojson.features.length === next.geojson.features.length &&
    prev.geojson.features.every(
      (feat, i) =>
        feat.properties.key === next.geojson.features[i].properties.key,
    ),
)
