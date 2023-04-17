/**
 * Credits: https://gist.github.com/moriakaice
 * Editor: PJ0tterr
 * Created on: 15-01-2022
 * Modified on: 23-01-2022
 */

const fs = require('fs')
const { resolve, dirname } = require('path')
const { log } = require('../src/services/logger')

// Set Path where for area.json
const configFolderArea = resolve(
  __dirname,
  '../../server/src/configs/areas.json',
)
const geofencesFile = resolve(
  __dirname,
  '../../server/src/configs/geofence.json',
)

if (fs.existsSync(geofencesFile)) {
  const outGeoJSON = {
    type: 'FeatureCollection',
    features: [],
  }

  fs.readFile(geofencesFile, 'utf8', (err, data) => {
    if (err) {
      log.error(err)
      return
    }
    const inGeoJSON = JSON.parse(data)
    if (inGeoJSON.length === 0) {
      log.error('Failed to parse poracle geofence file')
      return
    }
    for (let i = 0; i < inGeoJSON.length; i += 1) {
      const { path, ...rest } = inGeoJSON[i]
      const outGeofence = {
        type: 'Feature',
        properties: rest,
        geometry: {
          type: 'Polygon',
          coordinates: [[]],
        },
      }
      for (let j = 0; j < path.length; j += 1) {
        const coord = path[j]
        path[j] = [coord[1], coord[0]]
      }
      const lastCoords = path.slice(-1)
      if (path[0][0] !== lastCoords[0][0] || path[0][1] !== lastCoords[0][1]) {
        path.push(path[0])
      }
      outGeofence.geometry.coordinates[0] = path
      outGeoJSON.features.push(outGeofence)
    }
    const outFilePath = resolve(dirname(configFolderArea), 'areas.json')

    fs.writeFile(
      outFilePath,
      JSON.stringify(outGeoJSON, null, 2),
      'utf8',
      () => {
        log.info(`${outFilePath} file saved.`)
      },
    )
  })
}
