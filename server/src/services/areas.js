/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
const config = require('./config')

const loadAreas = () => {
  let areas = {}
  try {
    // eslint-disable-next-line global-require
    const data = config.scanAreas || Error('Areas file not found')
    areas = data
  } catch (err) {
    const showWarning = config.authentication.areaRestrictions.some(rule => rule.roles.length)
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
