/* eslint-disable no-console */
/**
* Credits: https://gist.github.com/moriakaice
* Editor: PJ0tterr
* Created on: 15-01-2022
* Modified on: 23-01-2022
*/

const fs = require('fs')
const path = require('path')

// Set Path where for area.json
const configFolderArea = path.resolve(__dirname, '../../server/src/configs/areas.json')
const geofencesFile = path.resolve(__dirname, '../../server/src/configs/geofence.json')

if (fs.existsSync(geofencesFile)) {
  const outGeoJSON = {
    type: 'FeatureCollection',
    features: [],
  }

  fs.readFile(geofencesFile, 'utf8', (err, data) => {
    if (err) {
      console.error(err)
      return
    }
    const inGeoJSON = JSON.parse(data)
    if (inGeoJSON.length === 0) {
      console.error('Failed to parse poracle geofence file')
      return
    }
    for (let i = 0; i < inGeoJSON.length; i += 1) {
      const inGeofence = inGeoJSON[i]
      const outGeofence = {
        type: 'Feature',
        properties: {
          name: inGeofence.name || '',
          color: inGeofence.color || '#000000',
          id: inGeofence.id || 0,

        },
        geometry: {
          type: 'Polygon',
          coordinates: [[]],
        },
      }
      for (let j = 0; j < inGeofence.path.length; j += 1) {
        const coord = inGeofence.path[j]
        inGeofence.path[j] = [coord[1], coord[0]]
      }
      const lastCoords = inGeofence.path.slice(-1)
      if (inGeofence.path[0][0] !== lastCoords[0][0] || inGeofence.path[0][1] !== lastCoords[0][1]) {
        inGeofence.path.push(inGeofence.path[0])
      }
      outGeofence.geometry.coordinates[0] = inGeofence.path
      outGeoJSON.features.push(outGeofence)
    }
    const outFilePath = path.resolve(path.dirname(configFolderArea), 'areas.json')

    fs.writeFile(outFilePath, JSON.stringify(outGeoJSON, null, 2), 'utf8', () => {
      console.log(`${outFilePath} file saved.`)
    })
  })
}
