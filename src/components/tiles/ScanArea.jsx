import React from 'react'
import { GeoJSON } from 'react-leaflet'
import Utility from '@services/Utility'

export default function ScanAreaTile({
  item,
  webhookMode,
  selectedAreas,
  setSelectedAreas,
}) {
  const handleClick = (name) => {
    if (selectedAreas.includes(name)) {
      setSelectedAreas(selectedAreas.filter((h) => h !== name))
    } else {
      setSelectedAreas([...selectedAreas, name])
    }
  }
  const onEachFeature = (feature, layer) => {
    if (feature.properties && feature.properties.name) {
      const name = feature.properties.name.toLowerCase()
      const popupContent = Utility.getProperName(name)
      layer.setStyle({
        color: feature.properties.stroke || '#3388ff',
        weight: feature.properties['stroke-width'] || 3,
        opacity: feature.properties['stroke-opacity'] || 1,
        fillColor: feature.properties.fill || '#3388ff',
        fillOpacity:
          selectedAreas &&
          selectedAreas.includes(name) &&
          webhookMode === 'areas'
            ? 0.8
            : 0.2,
      })
      if (webhookMode) {
        layer.on('click', () => handleClick(name))
        layer
          .bindTooltip(popupContent, {
            permanent: true,
            direction: 'top',
          })
          .openTooltip()
      } else {
        layer.bindPopup(popupContent)
      }
    }
  }

  return (
    <GeoJSON key={selectedAreas} data={item} onEachFeature={onEachFeature} />
  )
}
