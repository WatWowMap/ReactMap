/* eslint-disable no-console */
const { default: center } = require('@turf/center')
const fs = require('fs')
const { resolve } = require('path')

const config = require('./config')
const fetchJson = require('./api/fetchJson')

const manualGeojson = {
  type: 'FeatureCollection',
  features: config.manualAreas
    .filter((area) =>
      ['lat', 'lon', 'name'].every((k) => k in area && !area.hidden),
    )
    .map((area) => {
      const { lat, lon, ...rest } = area
      return {
        type: 'Feature',
        properties: {
          center: [lat, lon],
          manual: true,
          key: rest.parent ? `${rest.parent}-${rest.name}` : rest.name,
          ...rest,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[[lon, lat]]],
        },
      }
    }),
}

const getGeojson = async (location) => {
  if (location.startsWith('http')) {
    console.log('Loading Kōji URL', location)
    return fetchJson(
      location,
      {
        headers: {
          Authorization: `Bearer ${config.api.kojiOptions.bearerToken}`,
        },
      },
      true,
    ).then((res) => res?.data || { features: [] })
  }
  if (fs.existsSync(resolve(`${__dirname}/../configs/${location}`))) {
    return JSON.parse(
      fs.readFileSync(resolve(__dirname, `../configs/${location}`)),
    )
  }
  return { features: [] }
}

// Load each areas.json
const loadScanPolygons = async (fileName, domain) => {
  const geojson = await getGeojson(fileName)
  return {
    ...geojson,
    features: [
      ...manualGeojson.features.filter(
        (f) => !f.properties.domain || f.properties.domain === domain,
      ),
      ...geojson.features.map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          key: f.properties.parent
            ? `${f.properties.parent}-${f.properties.name}`
            : f.properties.name,
          center: center(f).geometry.coordinates.reverse(),
        },
      })),
    ].sort((a, b) => a.properties.name.localeCompare(b.properties.name)),
  }
}

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

// Check if an areas.json exists
const { raw, names, withoutParents, polygons } = (async () => {
  config.scanAreas = {
    main: await loadScanPolygons(config.map.geoJsonFileName),
    ...Object.fromEntries(
      await Promise.all(
        config.multiDomains.map(async (d) => [
          d.general?.geoJsonFileName ? d.domain : 'main',
          await loadScanPolygons(
            d.general?.geoJsonFileName || config.map.geoJsonFileName,
          ),
        ]),
      ),
    ),
  }

  config.scanAreasMenu = Object.fromEntries(
    Object.entries(config.scanAreas).map(([domain, areas]) => {
      const parents = { '': { children: [], name: '' } }

      const noHidden = {
        ...areas,
        features: areas.features.filter((f) => !f.properties.hidden),
      }
      // Finds unique parents and determines if the parents have their own properties
      noHidden.features.forEach((feature) => {
        if (feature.properties.parent) {
          parents[feature.properties.parent] = {
            name: feature.properties.parent,
            details: areas.features.find(
              (area) => area.properties.name === feature.properties.parent,
            ),
            children: [],
          }
        }
      })

      // Finds the children of each parent
      noHidden.features.forEach((feature) => {
        if (feature.properties.parent) {
          parents[feature.properties.parent].children.push(feature)
        } else if (!parents[feature.properties.name]) {
          parents[''].children.push(feature)
        }
      })

      // Create blanks for better formatting when there's an odd number of children
      Object.values(parents).forEach(({ children }) => {
        if (children.length % 2 === 1) {
          children.push({
            type: 'Feature',
            properties: { name: '', manual: !!config.manualAreas.length },
          })
        }
      })
      return [
        domain,
        Object.values(parents).sort((a, b) => a.name.localeCompare(b.name)),
      ]
    }),
  )
  config.scanAreasObj = Object.fromEntries(
    Object.values(config.scanAreas)
      .flatMap((areas) => areas.features)
      .map((feature) => [feature.properties.name, feature]),
  )
})().then(async () => ({
  raw: loadAreas(),
  ...parseAreas(raw),
}))

module.exports = {
  raw,
  names,
  withoutParents,
  polygons,
}
