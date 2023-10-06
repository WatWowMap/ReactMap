/* eslint-disable react/destructuring-assignment */
// @ts-check
import * as React from 'react'
import { GeoJSON } from 'react-leaflet'

import { basicEqualFn, useStore } from '@hooks/useStore'
import Utility from '@services/Utility'
import { useWebhookStore } from '@components/layout/dialogs/webhooks/store'
import { handleClick } from '@components/layout/dialogs/webhooks/human/area/AreaChip'
import { Polygon } from 'leaflet'

/**
 *
 * @param {import('@rm/types').RMGeoJSON} featureCollection
 * @returns
 */
export function ScanAreaTile(featureCollection) {
  const search = useStore((s) => s.filters.scanAreas?.filter?.search)
  const [tapToToggle, alwaysShowLabels] = useStore(
    (s) => [
      s.userSettings.scanAreas.tapToToggle,
      s.userSettings.scanAreas.alwaysShowLabels,
    ],
    basicEqualFn,
  )

  const webhookMode = useWebhookStore((s) => s.mode)

  return (
    <GeoJSON
      key={`${search}${tapToToggle}${alwaysShowLabels}`}
      data={featureCollection}
      filter={(f) =>
        webhookMode ||
        search === '' ||
        f.properties.key.toLowerCase().includes(search.toLowerCase())
      }
      eventHandlers={{
        click: ({ propagatedFrom: layer }) => {
          if (!layer.feature) return
          const { name, key, manual = false } = layer.feature.properties
          if (webhookMode && name) {
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
            const { filters, setAreas } = useStore.getState()
            const includes = filters?.scanAreas?.filter?.areas?.includes(key)
            layer.setStyle({ fillOpacity: includes ? 0.2 : 0.8 })
            setAreas(
              key,
              featureCollection.features
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
                  webhookMode === 'areas'
                    ? useWebhookStore
                        .getState()
                        .human?.area?.some(
                          (area) => area.toLowerCase() === name?.toLowerCase(),
                        )
                    : (
                        useStore.getState().filters?.scanAreas?.filter?.areas ||
                        []
                      ).includes(webhookMode ? name : key)
                )
                  ? 0.8
                  : 0.2,
              })
              .bindTooltip(popupContent, {
                permanent: webhookMode ? true : alwaysShowLabels,
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

const MemoScanAreaTile = React.memo(ScanAreaTile, (prev, next) =>
  prev.features.every(
    (feat, i) => feat.properties.key === next.features[i].properties.key,
  ),
)

export default MemoScanAreaTile
