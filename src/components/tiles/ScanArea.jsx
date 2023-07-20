import React from 'react'
import { GeoJSON } from 'react-leaflet'

import { useStore } from '@hooks/useStore'
import Utility from '@services/Utility'

export function ScanAreaTile({
  item,
  webhookMode,
  selectedAreas,
  setSelectedAreas,
  userSettings,
}) {
  const search = useStore((s) => s.filters.scanAreas?.filter?.search)
  const initialRenderAreas =
    useStore.getState().filters?.scanAreas?.filter?.areas || []

  return (
    <GeoJSON
      key={search}
      data={item}
      filter={(f) =>
        webhookMode ||
        search === '' ||
        f.properties.key.toLowerCase().includes(search.toLowerCase())
      }
      pane="geojson"
      eventHandlers={{
        click: ({ propagatedFrom: layer }) => {
          if (!layer.feature) return
          const { name, key, manual = false } = layer.feature.properties
          if (webhookMode && name) {
            setSelectedAreas((prev) => {
              const includes = prev.includes(name)
              layer.setStyle({ fillOpacity: includes ? 0.2 : 0.8 })
              return includes ? prev.filter((h) => h !== name) : [...prev, name]
            })
          } else if (!manual && userSettings?.tapToToggle) {
            const { filters, setAreas } = useStore.getState()
            const includes = filters?.scanAreas?.filter?.areas?.includes(key)
            layer.setStyle({ fillOpacity: includes ? 0.2 : 0.8 })
            setAreas(
              key,
              item.features
                .filter((f) => !f.properties.manual)
                .map((f) => f.properties.key),
            )
          }
        },
      }}
      onEachFeature={(feature, layer) => {
        if (feature.properties && feature.properties.name) {
          const { name, key } = feature.properties
          const popupContent = Utility.getProperName(name)
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
                  ? selectedAreas.includes(name?.toLowerCase())
                  : initialRenderAreas.includes(webhookMode ? name : key)
              )
                ? 0.8
                : 0.2,
            })
            .bindTooltip(popupContent, {
              permanent: userSettings ? userSettings.alwaysShowLabels : true,
              direction: 'top',
              className: 'area-tooltip',
            })
          if (!userSettings || userSettings.alwaysShowLabels) {
            layer.openTooltip()
          }
        }
      }}
    />
  )
}

export default React.memo(ScanAreaTile, () => true)
