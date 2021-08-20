/* eslint-disable no-restricted-syntax */
const fs = require('fs')
const path = require('path')
const { discord: { areaRestrictions } } = require('./config')

const loadAreas = () => {
  let areas = {}
  const areasFilePath = path.resolve(__dirname, '../configs/areas.json')
  try {
    const data = fs.readFileSync(areasFilePath, 'utf8')
    areas = JSON.parse(data)
  } catch (err) {
    const showWarning = areaRestrictions.some(rule => rule.roles.length > 0)
    if (showWarning) {
      console.warn('[Area Restrictions] Disabled - `areas.json` file is missing or broken.')
    }
  }
  return areas
}

const parseAreas = (areasObj) => {
  let names = {}
  const polygons = {}

  if (Object.keys(areasObj).length === 0) {
    return { names, polygons }
  }

  areasObj.features.forEach(feature => {
    if (feature.geometry.type == 'Polygon' && feature.properties.name) {
      polygons[feature.properties.name] = []
      for (const polygonCoordinates of feature.geometry.coordinates) {
        polygons[feature.properties.name].push(...polygonCoordinates)
      }
    }
  })
  names = Object.keys(polygons)
  return { names, polygons }
}

const raw = loadAreas()
const { names, polygons } = parseAreas(raw)

module.exports = {
  raw,
  names,
  polygons,
}
