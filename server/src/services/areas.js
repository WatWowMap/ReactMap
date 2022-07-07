/* eslint-disable no-console */
const config = require('./config')

const loadAreas = () => {
  try {
    const normalized = { type: 'FeatureCollection', features: [] }
    Object.values(config.scanAreas).forEach((area) => {
      if (area?.features.length) {
        normalized.features.push(...area.features.filter((f) => !f.manual))
      }
    })
    return normalized
  } catch (err) {
    if (
      config.authentication.areaRestrictions.some((rule) => rule.roles.length)
    ) {
      console.warn(
        '[Area Restrictions] Disabled - `areas.json` file is missing or broken.',
      )
    }
  }
}

const parseAreas = (areasObj) => {
  const polygons = {}
  const names = []

  if (!areasObj) {
    return { names, polygons }
  }
  areasObj.features.forEach((feature) => {
    const { name } = feature.properties
    if (feature.geometry.type == 'Polygon' && name) {
      polygons[name] = []
      feature.geometry.coordinates.forEach((coordPair) => {
        polygons[name].push(...coordPair)
      })
      if (
        polygons[name][0].every(
          (coord, i) => coord !== polygons[name][polygons[name].length - 1][i],
        )
      ) {
        polygons[name].push(polygons[name][0])
      }
      names.push(name)
    }
  })
  return { names, polygons }
}

const raw = loadAreas()
const { names, polygons } = parseAreas(raw)

module.exports = {
  raw,
  names,
  polygons,
}
