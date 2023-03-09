/* eslint-disable no-console */
const { default: center } = require('@turf/center')
const fs = require('fs')
const { resolve } = require('path')
const fetch = require('node-fetch')

const config = require('./config')

const DEFAULT_RETURN = { type: 'FeatureCollectin', features: [] }

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
  try {
    if (location.startsWith('http')) {
      console.log('Loading Kōji URL', location)
      return fetch(
        location,
        {
          headers: {
            Authorization: `Bearer ${config.api.kojiOptions.bearerToken}`,
          },
        },
        true,
      )
        .then((res) => res.json())
        .then((res) => {
          if (res?.data) {
            fs.writeFileSync(
              resolve(
                __dirname,
                `../configs/koji_backups/${location.replace(/\//g, '__')}.json`,
              ),
              JSON.stringify(res.data),
            )
            return res.data
          }
          return DEFAULT_RETURN
        })
        .catch((err) => {
          console.error(
            '[AREAS] Failed to fetch koji geojson, attempting to read from backup \n[AREAS]',
            err.message,
          )
          if (
            fs.existsSync(
              resolve(
                __dirname,
                `../configs/koji_backups/${location.replace(/\//g, '__')}.json`,
              ),
            )
          ) {
            console.log('[AREAS] Reading from koji_backups for', location)
            return JSON.parse(
              fs.readFileSync(
                resolve(
                  __dirname,
                  `../configs/koji_backups/${location.replace(
                    /\//g,
                    '__',
                  )}.json`,
                ),
              ),
            )
          }
          console.warn('[AREAS] No backup found for', location)
          return DEFAULT_RETURN
        })
    }
    if (fs.existsSync(resolve(__dirname, `../configs/${location}`))) {
      return JSON.parse(
        fs.readFileSync(resolve(__dirname, `../configs/${location}`)),
      )
    }
  } catch (e) {
    console.warn('[AREAS] Issue with getting the geojson', e)
  }
  return DEFAULT_RETURN
}

// Load each areas.json
const loadScanPolygons = async (fileName, domain) => {
  try {
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
  } catch {
    console.warn(
      `[AREAS] Failed to load ${fileName} for ${domain}. Using empty areas.json`,
    )
    return DEFAULT_RETURN
  }
}

const loadAreas = (scanAreas) => {
  try {
    const normalized = { type: 'FeatureCollection', features: [] }
    Object.values(scanAreas).forEach((area) => {
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
    return DEFAULT_RETURN
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
    if (name && !manual && feature.geometry.type.includes('Polygon')) {
      const { coordinates } = feature.geometry
      if (feature.geometry.type === 'Polygon') {
        coordinates.forEach((polygon, i) => {
          if (
            polygon[0][0] !== polygon[polygon.length - 1][0] ||
            polygon[0][1] !== polygon[polygon.length - 1][1]
          ) {
            console.warn('[AREAS] Polygon not closed', name, `Index (${i})`)
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
              console.warn(
                '[AREAS] MultiPolygon contains unclosed Polygon',
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
module.exports = async () => {
  const scanAreas = {
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

  const scanAreasMenu = Object.fromEntries(
    Object.entries(scanAreas).map(([domain, areas]) => {
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
  const scanAreasObj = Object.fromEntries(
    Object.values(scanAreas)
      .flatMap((areas) => areas.features)
      .map((feature) => [feature.properties.name, feature]),
  )

  const raw = loadAreas(scanAreas)
  return {
    scanAreas,
    scanAreasMenu,
    scanAreasObj,
    raw,
    ...parseAreas(raw),
  }
}
