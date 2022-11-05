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
  const withoutParents = {}

  if (!areasObj) {
    return { names, polygons }
  }
  areasObj.features.forEach((feature) => {
    const { name, key, manual } = feature.properties
    if (feature.geometry.type == 'Polygon' && name && !manual) {
      polygons[key] = []
      feature.geometry.coordinates.forEach((coordPair) => {
        polygons[key].push(...coordPair)
      })
      if (
        polygons[key][0].every(
          (coord, i) => coord !== polygons[key][polygons[key].length - 1][i],
        )
      ) {
        polygons[key].push(polygons[key][0])
      }
      names.push(key)
      if (withoutParents[name]) {
        withoutParents[name].push(key)
      } else {
        withoutParents[name] = [key]
      }
    }
  })
  return { names, withoutParents, polygons }
}

const raw = loadAreas()
const { names, withoutParents, polygons } = parseAreas(raw)

module.exports = {
  raw,
  names,
  withoutParents,
  polygons,
}
