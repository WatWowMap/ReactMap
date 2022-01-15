/**
* Credits: https://gist.github.com/moriakaice
* Editor: PJ0tterr
* Date: 15-01-2022
*/

const fs = require('fs');
const path = require('path');

// Set Path where for area.json
const configFolder = path.resolve(__dirname, '../../src/configs')
const geofencesFolder = path.resolve(__dirname, '../../public/geofence/geofence.json')

if (!fs.existsSync(geofencesFolder)) {
  // eslint-disable-next-line no-console
  console.error('Error: Geofence directory does not exist:', geofencesFolder);
  return;
}

const outGeoJSON = {
  type: 'FeatureCollection',
  features: [],
};

fs.readFile(geofencesFolder, 'utf8', (err, data) => {
  if (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return;
  }
  const inGeoJSON = JSON.parse(data);
  if (inGeoJSON.length === 0) {
    // eslint-disable-next-line no-console
    console.error('Failed to parse poracle geofence file');
    return;
  }
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < inGeoJSON.length; i++) {
    const inGeofence = inGeoJSON[i];
    // eslint-disable-next-line no-console
    console.log('Converting', inGeofence.name);
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
    };
    // eslint-disable-next-line no-plusplus
    for (let j = 0; j < inGeofence.path.length; j++) {
      const coord = inGeofence.path[j];
      inGeofence.path[j] = [coord[1], coord[0]];
    }
    outGeofence.geometry.coordinates[0] = inGeofence.path;
    outGeoJSON.features.push(outGeofence);
  }
  const outFilePath = path.resolve(path.dirname(configFolder), 'areas.json');
  fs.writeFile(outFilePath, JSON.stringify(outGeoJSON, null, 2), 'utf8', () => {
    // eslint-disable-next-line no-console
    console.log(`${outFilePath} file saved.`);
  });
});
