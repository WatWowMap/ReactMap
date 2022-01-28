/**
* Credits: https://gist.github.com/moriakaice
* Editor: PJ0tterr
* Creaded on: 15-01-2022
* Modified on: 23-01-2022
*/

/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
/* eslint-disable-next-line no-plusplus */

const fs = require('fs')
const path = require('path')

// Set Path where for area.json
const configFolderArea = path.resolve(__dirname, '../../server/src/configs/areas.json')
const geofencesFolder = path.resolve(__dirname, '../../server/src/configs/geofence/geofence.json')

if (!fs.existsSync(geofencesFolder)) {
  console.error('Error: Geofence directory does not exist:', geofencesFolder);
  return;
}

const outGeoJSON = {
  type: 'FeatureCollection',
  features: [],
}

fs.readFile(geofencesFolder, 'utf8', (err, data) => {
  if (err) {
    console.error(err)
    return
  }
  const inGeoJSON = JSON.parse(data)
  if (inGeoJSON.length === 0) {
    console.error('Failed to parse poracle geofence file')
    return;
  }
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < inGeoJSON.length; i++) {
    const inGeofence = inGeoJSON[i];
    console.log('Converting', inGeofence.name)
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
    outGeofence.geometry.coordinates[0] = inGeofence.path;
    outGeoJSON.features.push(outGeofence);
  }
  const outFilePath = path.resolve(path.dirname(configFolderArea), 'areas.json')
  fs.writeFile(outFilePath, JSON.stringify(outGeoJSON, null, 2), 'utf8', () => {
    console.log(`${outFilePath} file saved.`)
  })
})
