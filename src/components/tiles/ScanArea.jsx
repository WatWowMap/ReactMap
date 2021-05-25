import React, { memo } from 'react'
import { GeoJSON } from 'react-leaflet'
import Utility from '@services/Utility'

const NestTile = ({ item }) => {
  const onEachFeature = (feature, layer) => {
    if (feature.properties && feature.properties.name) {
      layer.bindPopup(Utility.getProperName(feature.properties.name))
    }
  }
  return <GeoJSON data={item} onEachFeature={onEachFeature} />
}

const areEqual = (prev, next) => (
  prev.item.properties.name === next.item.properties.name
)

export default memo(NestTile, areEqual)
