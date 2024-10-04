// @ts-check
const fs = require('fs')
const path = require('path')

const { default: center } = require('@turf/center')
const { default: fetch } = require('node-fetch')
const RTree = require('rtree')
const config = require('@rm/config')
const { log, TAGS } = require('@rm/logger')

const { setCache, getCache } = require('./cache')

/** @type {import("@rm/types").RMGeoJSON} */
const DEFAULT_RETURN = { type: 'FeatureCollection', features: [] }

const configDir = path.join(__dirname, '../../../config/user')

/** @returns {import("@rm/types").RMGeoJSON} */
const getManualGeojson = () => ({
  type: 'FeatureCollection',
  features: config
    .getSafe('manualAreas')
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
})

/**
 * @param {string} fileName
 * @returns {import("@rm/types").RMGeoJSON}
 */
const loadFromFile = (fileName) => {
  try {
    if (fileName.startsWith('http')) {
      return getCache(fileName, DEFAULT_RETURN)
    }
    const filePath = path.join(configDir, fileName)

    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    }

    return DEFAULT_RETURN
  } catch (e) {
    log.warn(TAGS.areas, `Failed to load ${fileName} from file system`, e)

    return DEFAULT_RETURN
  }
}

/**
 * @param {string} location
 * @returns {Promise<import("@rm/types").RMGeoJSON>}
 */
const getGeojson = async (location) => {
  try {
    if (location.startsWith('http')) {
      log.info(TAGS.areas, 'Loading Kōji URL', location)

      return fetch(location, {
        headers: {
          Authorization: `Bearer ${config.getSafe(
            'api.kojiOptions.bearerToken',
          )}`,
        },
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(
              `Failed to fetch Kōji geojson: ${res.status} - ${res.statusText}`,
            )
          }

          return res.json()
        })
        .then(async (res) => {
          if (res?.data) {
            log.info(TAGS.areas, 'Caching', location, 'from Kōji')
            await setCache(location, res.data)

            return res.data
          }

          return DEFAULT_RETURN
        })
        .catch((err) => {
          log.error(
            TAGS.areas,
            'Failed to fetch Kōji geojson, attempting to read from backup',
            err,
          )
          const cached = getCache(location)

          if (cached) {
            log.info(TAGS.areas, 'Reading from koji_backups for', location)

            return cached
          }
          log.warn(TAGS.areas, 'No backup found for', location)

          return DEFAULT_RETURN
        })
    }

    return loadFromFile(location)
  } catch (e) {
    log.warn(TAGS.areas, 'Issue with getting the geojson', e)
  }

  return DEFAULT_RETURN
}

/**
 * Load each areas.json
 * @param {string} fileName
 * @param {string} [domain]
 * @returns {Promise<import("@rm/types").RMGeoJSON>}
 */
const loadScanPolygons = async (fileName, domain) => {
  try {
    const geojson = await getGeojson(fileName)

    return {
      ...geojson,
      features: [
        ...getManualGeojson().features.filter(
          (f) => !f.properties.domain || f.properties.domain === domain,
        ),
        ...geojson.features.map((f) => ({
          ...f,
          properties: {
            ...f.properties,
            key: f.properties.parent
              ? `${f.properties.parent}-${f.properties.name}`
              : f.properties.name,
            center: /** @type {[number,number]} */ (
              center(f).geometry.coordinates.slice().reverse()
            ),
          },
        })),
      ].sort((a, b) =>
        a.properties.name
          ? a.properties.name.localeCompare(b.properties.name)
          : 0,
      ),
    }
  } catch (e) {
    log.warn(
      TAGS.areas,
      `Failed to load ${fileName} for ${
        domain || 'map'
      }. Using empty areas.json`,
      e,
    )

    return DEFAULT_RETURN
  }
}

/** @param {import("@rm/types").RMGeoJSON} featureCollection */
const parseAreas = (featureCollection) => {
  /** @type {Record<string, import("@rm/types").RMGeoJSON['features'][number]['geometry']>} */
  const polygons = {}
  /** @type {Set<string>} */
  const names = new Set()
  /** @type {Record<string, string[]>} */
  const withoutParents = {}

  if (!featureCollection) {
    return { names, polygons, withoutParents }
  }
  featureCollection.features.forEach((feature) => {
    const { name, key, manual } = feature.properties

    if (name && !manual && feature.geometry.type.includes('Polygon')) {
      const { coordinates } = feature.geometry

      if (feature.geometry.type === 'Polygon') {
        coordinates.forEach((polygon, i) => {
          if (
            polygon[0][0] !== polygon[polygon.length - 1][0] ||
            polygon[0][1] !== polygon[polygon.length - 1][1]
          ) {
            log.warn(TAGS.areas, 'Polygon not closed', name, `Index (${i})`)
            polygon.push(polygon[0])
          }
        })
      } else {
        coordinates.forEach((poly, i) => {
          poly.forEach((polygon, j) => {
            if (
              polygon[0][0] !== polygon[polygon.length - 1][0] ||
              polygon[0][1] !== polygon[polygon.length - 1][1]
            ) {
              log.warn(
                TAGS.areas,
                'MultiPolygon contains unclosed Polygon',
                name,
                `Polygon (${i})`,
                `Index (${j})`,
              )
              polygon.push(polygon[0])
            }
          })
        })
      }
      feature.geometry.coordinates = coordinates
      polygons[key] = feature.geometry
      names.add(key)
      if (withoutParents[name]) {
        withoutParents[name].push(key)
      } else {
        withoutParents[name] = [key]
      }
    }
  })

  return { names, withoutParents, polygons }
}

/**
 * @param {import("@rm/types").RMGeoJSON} scanAreas
 * @returns
 */
const buildAreas = (scanAreas) => {
  /** @type {Record<string, { children: Pick<import('@rm/types').RMFeature, 'properties'>[], name: string, details: Pick<import('@rm/types').RMFeature, 'properties'> | null }>} */
  const parents = {
    '': {
      children: [],
      name: '',
      details: null,
    },
  }
  const scanAreasObj = Object.fromEntries(
    scanAreas.features.map((feature) => [feature.properties.key, feature]),
  )

  scanAreas.features.forEach((feature) => {
    if (feature.properties.hidden) return
    if (feature.properties.parent) {
      const found = scanAreasObj[feature.properties.parent]

      parents[feature.properties.parent] = {
        name: feature.properties.parent,
        details: found && {
          properties: found.properties,
        },
        children: [],
      }
    }
    if (feature.properties.parent) {
      parents[feature.properties.parent].children.push({
        properties: feature.properties,
      })
    } else if (!parents[feature.properties.name]) {
      parents[''].children.push({ properties: feature.properties })
    }
  })
  const scanAreasMenu = Object.values(parents).sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  const myRTree = RTree()

  myRTree.geoJSON({
    type: 'FeatureCollection',
    features: Object.values(scanAreasObj).filter(
      (f) =>
        !f.properties.manual &&
        f.properties.key &&
        f.geometry.type.includes('Polygon'),
    ),
  })

  /** @type {import("@rm/types").RMGeoJSON} */
  const raw = {
    type: 'FeatureCollection',
    features: scanAreas.features
      .filter((f) => !f.properties.manual)
      .map((f) => f),
  }

  log.info(TAGS.areas, 'Loaded areas')

  return {
    scanAreas,
    scanAreasMenu,
    scanAreasObj,
    raw,
    myRTree,
    ...parseAreas(raw),
  }
}

const loadLatestAreas = async () => {
  const fileName = config.getSafe('map.general.geoJsonFileName')
  const scanAreas = await loadScanPolygons(fileName)

  return buildAreas(scanAreas)
}

const loadCachedAreas = () => {
  const fileName = config.getSafe('map.general.geoJsonFileName')
  const scanAreas = loadFromFile(fileName)

  return buildAreas(scanAreas)
}

module.exports = {
  loadLatestAreas,
  loadCachedAreas,
}
