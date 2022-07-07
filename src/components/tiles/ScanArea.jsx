import React from 'react'
import { GeoJSON } from 'react-leaflet'

import { useStore } from '@hooks/useStore'
import Utility from '@services/Utility'

export function ScanAreaTile({
  item,
  webhookMode,
  selectedAreas,
  setSelectedAreas,
  onlyAreas,
  userSettings,
}) {
  const setAreas = useStore((s) => s.setAreas)
  const names = item.features
    .filter((f) => !f.properties.manual)
    .map((f) => f.properties.name)

  const handleClick = (name) => {
    if (selectedAreas.includes(name)) {
      setSelectedAreas(selectedAreas.filter((h) => h !== name))
    } else {
      setSelectedAreas([...selectedAreas, name])
    }
  }
  const onEachFeature = (feature, layer) => {
    if (feature.properties && feature.properties.name) {
      const { name } = feature.properties
      const popupContent = Utility.getProperName(name)
      layer
        .setStyle({
          color:
            feature.properties.color || feature.properties.stroke || '#3388ff',
          weight: feature.properties['stroke-width'] || 3,
          opacity: feature.properties['stroke-opacity'] || 1,
          fillColor:
            feature.properties.fillColor ||
            feature.properties.fill ||
            '#3388ff',
          fillOpacity:
            (selectedAreas?.includes(name.toLowerCase()) &&
              webhookMode === 'areas') ||
            onlyAreas?.includes(name)
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
      if (webhookMode) {
        layer.on('click', () => handleClick(name.toLowerCase()))
      } else if (!feature.properties.manual && userSettings?.tapToToggle) {
        layer.on('click', () => setAreas(name, names))
      }
    }
  }

  return (
    <GeoJSON
      key={`${selectedAreas}-${onlyAreas ? onlyAreas.join('') : ''}`}
      data={item}
      onEachFeature={onEachFeature}
    />
  )
}

const areEqual = (prev, next) =>
  (prev.onlyAreas && next.onlyAreas
    ? prev.onlyAreas.length === next.onlyAreas.length &&
      prev.onlyAreas.every((_, i) => prev.onlyAreas[i] === next.onlyAreas[i])
    : true) &&
  (prev.selectedAreas && next.selectedAreas
    ? prev.selectedAreas.length === next.selectedAreas.length &&
      prev.selectedAreas.every(
        (_, i) => prev.selectedAreas[i] === next.selectedAreas[i],
      )
    : true)

export default React.memo(ScanAreaTile, areEqual)
